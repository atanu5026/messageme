const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

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
    });

    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate('participants', 'name email phoneNumber profilePicture isOnline lastSeen publicKey');

    res.status(201).json({ success: true, data: populatedConversation });
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
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!conversation.participants.includes(req.user._id)) {
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
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isMuted = conversation.mutedBy.some(id => id.toString() === req.user._id.toString());
    if (isMuted) {
      conversation.mutedBy = conversation.mutedBy.filter(id => id.toString() !== req.user._id.toString());
    } else {
      conversation.mutedBy.push(req.user._id);
    }

    await conversation.save();
    res.status(200).json({ success: true, isMuted: !isMuted, data: conversation });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  createOrGetConversation,
  getMessages,
  searchUsers,
  sendImageMessage,
  sendAudioMessage,
  createGroup,
  updateDisappearingMessages,
  togglePinConversation,
  toggleMuteConversation,
};
