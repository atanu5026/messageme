const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { sendPushNotification } = require('../services/push.service');

// @desc    Get all conversations for the logged in user
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email phoneNumber profilePicture isOnline lastSeen publicKey')
      .populate('lastMessage')
      .populate({
        path: 'pinnedMessage',
        populate: { path: 'senderId', select: 'name' }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create a direct conversation with a specific user
// @route   POST /api/chat/conversations
// @access  Private
const createOrGetConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, receiverId] },
    }).populate('participants', 'name email phoneNumber profilePicture isOnline lastSeen publicKey');

    if (conversation) {
      return res.status(200).json({ success: true, data: conversation });
    }

    // Create new conversation
    const newConversation = await Conversation.create({
      type: 'direct',
      participants: [req.user._id, receiverId],
      status: 'pending',
      initiatedBy: req.user._id,
    });

    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate('participants', 'name email phoneNumber profilePicture isOnline lastSeen publicKey');

    const receiver = populatedConversation.participants.find(p => p._id.toString() === receiverId);
    if (receiver) {
      try {
        // 1. Create Notification Record
        const notification = await Notification.create({
          recipient: receiverId,
          sender: req.user._id,
          type: 'CONNECTION_REQUEST',
          title: 'New Connection Request',
          body: `${req.user.name} sent you a connection request.`,
          conversation: newConversation._id,
        });

        const io = req.app.get('io');
        if (io) {
          // Emit direct unread count update
          const unreadCount = await Notification.countDocuments({ recipient: receiverId, isRead: false });
          io.to(receiverId.toString()).emit('notification:unread-count', unreadCount);
          // Also emit the notification object
          io.to(receiverId.toString()).emit('notification:new', await notification.populate('sender', 'name profilePicture'));
          // Existing event
          io.to(receiverId.toString()).emit('connection_request_received', populatedConversation);
        }

        // 2. Send Push Notification
        await sendPushNotification(receiverId, {
          type: 'CONNECTION_REQUEST',
          title: 'New Connection Request',
          body: `${req.user.name} sent you a connection request.`
        });

        // 3. Fallback Email Notification
        if (!receiver.isOnline && receiver.email) {
          await sendEmail({
            email: receiver.email,
            subject: 'New Connection Request',
            message: `${req.user.name} wants to connect with you on MessageMe. Log in to approve their request!`,
            html: `<p><strong>${req.user.name}</strong> wants to connect with you on MessageMe.</p><p>Log in to approve their request and start chatting!</p>`
          });
        }
      } catch (err) {
        console.error('Notification failed:', err);
      }
    }

    res.status(201).json({ success: true, data: populatedConversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a conversation request
// @route   PUT /api/chat/conversations/:id/approve
// @access  Private
const approveConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Only the receiver can approve
    if (conversation.initiatedBy && conversation.initiatedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot approve a request you initiated' });
    }

    conversation.status = 'approved';
    await conversation.save();

    const populated = await Conversation.findById(conversation._id).populate('participants', 'name email phoneNumber profilePicture isOnline lastSeen publicKey');
    
    if (conversation.initiatedBy) {
      const initiatorId = conversation.initiatedBy.toString();
      
      // Create Notification Record
      const notification = await Notification.create({
        recipient: initiatorId,
        sender: req.user._id,
        type: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted',
        body: `${req.user.name} accepted your connection request.`,
        conversation: conversation._id,
      });

      const io = req.app.get('io');
      if (io) {
        // Emit direct unread count update
        const unreadCount = await Notification.countDocuments({ recipient: initiatorId, isRead: false });
        io.to(initiatorId).emit('notification:unread-count', unreadCount);
        // Also emit the notification object
        io.to(initiatorId).emit('notification:new', await notification.populate('sender', 'name profilePicture'));
        // Existing events
        io.to(initiatorId).emit('connection_request_approved', populated);
        io.to(initiatorId).emit('status_feed_changed');
        io.to(req.user._id.toString()).emit('status_feed_changed');
      }

      // Send Push Notification
      await sendPushNotification(initiatorId, {
        type: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted',
        body: `${req.user.name} accepted your connection request.`
      });
    }

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a conversation request
// @route   PUT /api/chat/conversations/:id/reject
// @access  Private
const rejectConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (conversation.initiatedBy && conversation.initiatedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot reject a request you initiated' });
    }

    conversation.status = 'rejected';
    await conversation.save();

    const io = req.app.get('io');
    if (io && conversation.initiatedBy) {
      io.to(conversation.initiatedBy.toString()).emit('connection_request_rejected', conversation._id);
      io.to(conversation.initiatedBy.toString()).emit('status_feed_changed');
      io.to(req.user._id.toString()).emit('status_feed_changed');
    }

    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chat/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId).populate('participants', 'name email profilePicture publicKey');
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these messages' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name profilePicture publicKey')
      .populate({
        path: 'replyTo',
        select: 'content type senderId isDeleted',
        populate: { path: 'senderId', select: 'name' }
      })
      .sort({ createdAt: 1 }); // Oldest to newest for chat UI

    // Automatically mark unread messages as read when fetched
    const unreadMessages = messages.filter(
      (m) => m.senderId && m.senderId._id.toString() !== req.user._id.toString() && m.status !== 'read'
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessages.map(m => m._id) } },
        { $set: { status: 'read' } }
      );
      // Update the local array so the response has the latest status
      messages.forEach(m => {
        if (m.senderId && m.senderId._id.toString() !== req.user._id.toString()) {
          m.status = 'read';
        }
      });
    }

    res.status(200).json({
      success: true,
      data: messages,
      conversation: conversation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users to start a chat
// @route   GET /api/chat/users/search?q=name
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    let filter = { _id: { $ne: req.user._id } }; // Don't search for self

    if (query !== 'all') {
      filter.$or = [
        { phoneNumber: query },
        { connectCode: query },
        { name: { $regex: query, $options: 'i' } } // case-insensitive regex match for name
      ];
    }

    const users = await User.find(filter)
      .select('name email phoneNumber connectCode profilePicture about isOnline lastSeen')
      .limit(50); // Limit to 50 for safety

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send an image message
// @route   POST /api/chat/messages/image
// @access  Private
const sendImageMessage = async (req, res, next) => {
  try {
    const { conversationId, receiverId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    if (!conversationId || !receiverId) {
      return res.status(400).json({ success: false, message: 'conversationId and receiverId are required' });
    }

    // Create the message
    const newMessage = await Message.create({
      conversationId,
      senderId: req.user._id,
      content: req.file.path, // Cloudinary URL
      type: 'image',
      status: 'sent',
      replyTo: replyTo || null,
    });

    // Update conversation's lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name profilePicture')
      .populate({
        path: 'replyTo',
        select: 'content type senderId isDeleted',
        populate: { path: 'senderId', select: 'name' }
      });

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('receive_message', populatedMessage);
      io.to(req.user._id.toString()).emit('receive_message', populatedMessage); // Emit back to sender
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send an audio message
// @route   POST /api/chat/messages/audio
// @access  Private
const sendAudioMessage = async (req, res, next) => {
  try {
    const { conversationId, receiverId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file' });
    }

    if (!conversationId || !receiverId) {
      return res.status(400).json({ success: false, message: 'conversationId and receiverId are required' });
    }

    const newMessage = await Message.create({
      conversationId,
      senderId: req.user._id,
      content: req.file.path, // Cloudinary URL for audio
      type: 'audio',
      status: 'sent',
      replyTo: replyTo || null,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name profilePicture')
      .populate({
        path: 'replyTo',
        select: 'content type senderId isDeleted',
        populate: { path: 'senderId', select: 'name' }
      });

    const io = req.app.get('io');
    if (io) {
      let receivers = [];
      try {
        if (req.body.receiverIds) {
          receivers = JSON.parse(req.body.receiverIds);
        }
      } catch (e) {}
      if (receivers.length === 0) receivers = [receiverId];
      
      receivers.forEach(id => {
        io.to(id).emit('receive_message', populatedMessage);
      });
      io.to(req.user._id.toString()).emit('receive_message', populatedMessage);
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new group conversation
// @route   POST /api/chat/groups
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const { name, userIds } = req.body;

    if (!name || !userIds || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Group name and users are required' });
    }

    const participants = [...new Set([...userIds, req.user._id.toString()])];

    if (participants.length < 2) {
      return res.status(400).json({ success: false, message: 'A group must have at least 2 members' });
    }

    const newGroup = await Conversation.create({
      participants,
      isGroup: true,
      groupName: name,
      groupAdmin: req.user._id,
    });

    const populatedGroup = await Conversation.findById(newGroup._id).populate(
      'participants',
      'name profilePicture email phoneNumber isOnline lastSeen publicKey'
    );

    res.status(201).json({ success: true, data: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Update disappearing messages TTL
// @route   PUT /api/chat/conversations/:id/disappearing
// @access  Private
const updateDisappearingMessages = async (req, res, next) => {
  try {
    const { ttl } = req.body;
    const conversationId = req.params.id;
    
    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, participants: req.user._id },
      { disappearingMessagesTTL: ttl },
      { new: true }
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin conversation for user
// @route   PUT /api/chat/conversations/:id/pin
// @access  Private
const togglePinConversation = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isPinned = conversation.pinnedBy.some(id => id.toString() === req.user._id.toString());
    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(id => id.toString() !== req.user._id.toString());
    } else {
      conversation.pinnedBy.push(req.user._id);
    }

    await conversation.save();
    res.status(200).json({ success: true, isPinned: !isPinned, data: conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle mute conversation for user
// @route   PUT /api/chat/conversations/:id/mute
// @access  Private
const toggleMuteConversation = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const { level } = req.body; // e.g., '1_hour', '8_hours', '1_week', 'always'
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userId = req.user._id.toString();
    const isCurrentlyMuted = conversation.mutedBy.some(id => id.toString() === userId);

    if (isCurrentlyMuted && !level) {
      // Unmute: remove from mutedBy and muteSettings
      conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== userId);
      conversation.muteSettings = conversation.muteSettings.filter(s => s.user.toString() !== userId);
    } else {
      // Mute: add to mutedBy and update muteSettings
      if (!isCurrentlyMuted) {
        conversation.mutedBy.push(req.user._id);
      }
      
      const muteLevel = level || 'always';
      let mutedUntil = null;
      const now = new Date();
      
      if (muteLevel === '1_hour') {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (muteLevel === '8_hours') {
        mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      } else if (muteLevel === '1_week') {
        mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Update or add muteSettings
      const existingSettingIndex = conversation.muteSettings.findIndex(s => s.user.toString() === userId);
      if (existingSettingIndex >= 0) {
        conversation.muteSettings[existingSettingIndex].level = muteLevel;
        conversation.muteSettings[existingSettingIndex].mutedUntil = mutedUntil;
      } else {
        conversation.muteSettings.push({
          user: req.user._id,
          level: muteLevel,
          mutedUntil: mutedUntil
        });
      }
    }

    await conversation.save();
    
    const isMutedNow = conversation.mutedBy.some(id => id.toString() === userId);
    res.status(200).json({ success: true, isMuted: isMutedNow, data: conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite conversation for user
// @route   PUT /api/chat/conversations/:id/favorite
// @access  Private
const toggleFavoriteConversation = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isFavorited = conversation.favoritedBy?.some(id => id.toString() === req.user._id.toString());
    if (isFavorited) {
      conversation.favoritedBy = conversation.favoritedBy.filter(id => id.toString() !== req.user._id.toString());
    } else {
      if (!conversation.favoritedBy) conversation.favoritedBy = [];
      conversation.favoritedBy.push(req.user._id);
    }

    await conversation.save();

    // Notify via sockets
    const io = req.app.get('io');
    if (io) {
      // we only need to emit to the user who toggled it so their other sessions sync
      io.to(req.user._id.toString()).emit('conversation_favorited', conversation._id, !isFavorited);
    }

    res.status(200).json({ success: true, isFavorited: !isFavorited, data: conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/chat/conversations/:id
// @access  Private
const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Delete the conversation itself
    await Conversation.findByIdAndDelete(conversation._id);

    // Notify via sockets if needed
    const io = req.app.get('io');
    if (io) {
      const otherParticipants = conversation.participants.filter(p => p.toString() !== req.user._id.toString());
      otherParticipants.forEach(pId => {
        io.to(pId.toString()).emit('conversation_deleted', conversation._id);
        io.to(pId.toString()).emit('status_feed_changed');
      });
      io.to(req.user._id.toString()).emit('status_feed_changed');
    }

    res.status(200).json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  createOrGetConversation,
  approveConversation,
  rejectConversation,
  getMessages,
  searchUsers,
  sendImageMessage,
  sendAudioMessage,
  createGroup,
  updateDisappearingMessages,
  togglePinConversation,
  toggleMuteConversation,
  toggleFavoriteConversation,
  deleteConversation,
};
