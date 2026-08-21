const Status = require('../models/Status');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Create a new status
// @route   POST /api/status
// @access  Private
const createStatus = async (req, res, next) => {
  try {
    const { type, content, metadata } = req.body;

    let finalContent = content;
    let finalType = type || 'text';
    let parsedMetadata = {};

    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (e) {
        parsedMetadata = {};
      }
    }

    if (req.file) {
      finalContent = req.file.path; // Cloudinary URL
      finalType = 'image';
    }

    if (!finalContent) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const status = await Status.create({
      userId: req.user._id,
      type: finalType,
      content: finalContent,
      metadata: parsedMetadata,
    });

    const populatedStatus = await Status.findById(status._id).populate('userId', 'name profilePicture');

    // Notify all connected users in real time via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Find all connected users who share an approved conversation with the creator
      const conversations = await Conversation.find({ 
        participants: req.user._id,
        $or: [{ status: 'approved' }, { status: { $exists: false } }]
      }).select('participants');
      const recipientIds = [
        ...new Set(
          conversations
            .flatMap((c) => c.participants.map((p) => p.toString()))
        ),
      ];

      // If user has no conversations yet, at least emit back to them
      if (!recipientIds.includes(req.user._id.toString())) {
        recipientIds.push(req.user._id.toString());
      }

      recipientIds.forEach((userId) => {
        io.to(userId).emit('status_updated', populatedStatus);
      });
      
      // Also broadcast to global room if needed
      io.emit('status_feed_changed');
    }

    res.status(201).json({
      success: true,
      data: populatedStatus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active statuses grouped by user (shows connected contacts & users)
// @route   GET /api/status
// @access  Private
const getStatuses = async (req, res, next) => {
  try {
    const currentUserId = req.user._id.toString();

    // Find all users connected to current user through direct or group conversations
    const userConversations = await Conversation.find({ 
      participants: req.user._id,
      $or: [{ status: 'approved' }, { status: { $exists: false } }]
    }).select('participants');
    const connectedUserIds = new Set(
      userConversations.flatMap((c) => c.participants.map((p) => p.toString()))
    );
    connectedUserIds.add(currentUserId);

    // Fetch active unexpired statuses
    const activeStatuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate('userId', 'name profilePicture privacySettings')
      .sort({ createdAt: -1 });

    // Filter statuses based on connection and privacy settings
    const visibleStatuses = activeStatuses.filter((status) => {
      if (!status.userId) return false;
      const statusOwnerId = status.userId._id.toString();

      // Owner can always see their own statuses
      if (statusOwnerId === currentUserId) return true;

      // Strict requirement: must share an approved conversation to see the status
      if (!connectedUserIds.has(statusOwnerId)) return false;

      const privacy = status.userId.privacySettings?.status || 'everyone';
      if (privacy === 'nobody') return false;

      return true;
    });

    // Group statuses by user
    const grouped = {};
    visibleStatuses.forEach((status) => {
      const userId = status.userId._id.toString();
      if (!grouped[userId]) {
        grouped[userId] = {
          user: {
            _id: status.userId._id,
            name: status.userId.name,
            profilePicture: status.userId.profilePicture,
          },
          statuses: [],
        };
      }
      grouped[userId].statuses.push(status);
    });

    res.status(200).json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete own status
// @route   DELETE /api/status/:id
// @access  Private
const deleteStatus = async (req, res, next) => {
  try {
    const status = await Status.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('status_feed_changed');
    }

    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStatus,
  getStatuses,
  deleteStatus,
};
