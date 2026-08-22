const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { sendPushNotification } = require('../services/push.service');

module.exports = (io, socket) => {
  // Join a specific conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  // Leave a specific conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  // Handle sending messages
  socket.on('send_message', async ({ conversationId, receiverIds, receiverId, content, type = 'text', metadata = {}, replyTo = null }) => {
    try {
      // Fetch conversation to check for disappearingMessagesTTL
      const conversation = await Conversation.findById(conversationId);
      
      let expiresAt = null;
      if (conversation && conversation.disappearingMessagesTTL > 0) {
        const ttlInMs = conversation.disappearingMessagesTTL * 1000;
        expiresAt = new Date(Date.now() + ttlInMs);
      }

      // Save message to database
      const newMessage = await Message.create({
        conversationId,
        senderId: socket.userId,
        content,
        type,
        status: 'sent',
        metadata,
        replyTo: replyTo || null,
        expiresAt
      });

      // Update conversation's lastMessage
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
      });

      // Populate sender info and replyTo for the frontend
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'name profilePicture publicKey')
        .populate({
          path: 'replyTo',
          select: 'content type senderId isDeleted',
          populate: { path: 'senderId', select: 'name' }
        });

      const otherReceivers = [
        ...new Set(
          (receiverIds || (receiverId ? [receiverId] : []))
            .map(id => id?.toString())
            .filter(id => id && id !== socket.userId.toString())
        )
      ];
      
      // We need sender's name for the email
      const sender = await User.findById(socket.userId);
      
      for (const id of otherReceivers) {
        io.to(id).emit('receive_message', populatedMessage);
        
        try {
          const userObj = await User.findById(id);
          
          // Create Notification in DB
          const notification = await Notification.create({
            recipient: id,
            sender: socket.userId,
            type: 'MESSAGE',
            title: sender?.name || 'New Message',
            body: 'You have a new message', // Don't save plaintext if we can avoid it. It's E2EE.
            conversation: conversationId,
            messageId: newMessage._id,
          });

          // Emit real-time notification event if user is online
          io.to(id).emit('notification:new', await notification.populate('sender', 'name profilePicture'));
          
          // Emit unread count update
          const unreadCount = await Notification.countDocuments({ recipient: id, isRead: false });
          io.to(id).emit('notification:unread-count', unreadCount);

          // Send WebPush (Service handles checking offline/online if needed, but usually we push anyway, 
          // or we can check if userObj.isOnline. The user might have closed the PWA).
          // If we push while they are online, the service worker might not show it, but it's safe to call.
          await sendPushNotification(id, {
            type: 'MESSAGE',
            title: sender?.name || 'New Message',
            body: 'Sent you a message',
            url: `/chat/${conversationId}`
          }, conversationId);

          // Legacy Email Notification (only if offline)
          if (userObj && !userObj.isOnline && userObj.email) {
            await sendEmail({
              email: userObj.email,
              subject: `New message from ${sender?.name || 'someone'}`,
              message: `You have a new message waiting for you on MessageMe.`,
              html: `<p>You have a new message from <strong>${sender?.name || 'someone'}</strong> on MessageMe.</p><p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Log in to view your messages</a></p>`
            });
          }
        } catch (e) {
          console.error('Error handling notification:', e);
        }
      }

      // Emit back to sender exactly once
      io.to(socket.userId.toString()).emit('receive_message', populatedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Edit message
  socket.on('edit_message', async ({ messageId, newContent, receiverIds, receiverId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      if (message.senderId.toString() !== socket.userId.toString()) return;

      message.content = newContent;
      message.isEdited = true;
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name profilePicture publicKey')
        .populate({
          path: 'replyTo',
          select: 'content type senderId isDeleted',
          populate: { path: 'senderId', select: 'name' }
        });

      const otherReceivers = [
        ...new Set(
          (receiverIds || (receiverId ? [receiverId] : []))
            .map(id => id?.toString())
            .filter(id => id && id !== socket.userId.toString())
        )
      ];

      otherReceivers.forEach(id => {
        io.to(id).emit('message_edited', populatedMessage);
      });
      io.to(socket.userId.toString()).emit('message_edited', populatedMessage);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  // Delete message for everyone
  socket.on('delete_message', async ({ messageId, receiverIds, receiverId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      if (message.senderId.toString() !== socket.userId.toString()) return;

      message.isDeleted = true;
      message.content = 'This message was deleted';
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'name profilePicture publicKey')
        .populate({
          path: 'replyTo',
          select: 'content type senderId isDeleted',
          populate: { path: 'senderId', select: 'name' }
        });

      const otherReceivers = [
        ...new Set(
          (receiverIds || (receiverId ? [receiverId] : []))
            .map(id => id?.toString())
            .filter(id => id && id !== socket.userId.toString())
        )
      ];

      otherReceivers.forEach(id => {
        io.to(id).emit('message_deleted', populatedMessage);
      });
      io.to(socket.userId.toString()).emit('message_deleted', populatedMessage);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // Pin message in conversation
  socket.on('pin_message', async ({ messageId, conversationId, isPinned, receiverIds, receiverId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { isPinned });
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { pinnedMessage: isPinned ? messageId : null },
        { new: true }
      ).populate({
        path: 'pinnedMessage',
        populate: { path: 'senderId', select: 'name' }
      });

      const otherReceivers = [
        ...new Set(
          (receiverIds || (receiverId ? [receiverId] : []))
            .map(id => id?.toString())
            .filter(id => id && id !== socket.userId.toString())
        )
      ];

      const payload = {
        conversationId,
        pinnedMessage: conversation.pinnedMessage,
        messageId,
        isPinned
      };

      otherReceivers.forEach(id => {
        io.to(id).emit('message_pinned', payload);
      });
      io.to(socket.userId.toString()).emit('message_pinned', payload);
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ conversationId, receiverIds, receiverId }) => {
    const otherReceivers = [
      ...new Set(
        (receiverIds || (receiverId ? [receiverId] : []))
          .map(id => id?.toString())
          .filter(id => id && id !== socket.userId.toString())
      )
    ];
    otherReceivers.forEach(id => {
      io.to(id).emit('typing_start', { conversationId, senderId: socket.userId });
    });
  });

  socket.on('typing_stop', ({ conversationId, receiverIds, receiverId }) => {
    const otherReceivers = [
      ...new Set(
        (receiverIds || (receiverId ? [receiverId] : []))
          .map(id => id?.toString())
          .filter(id => id && id !== socket.userId.toString())
      )
    ];
    otherReceivers.forEach(id => {
      io.to(id).emit('typing_stop', { conversationId, senderId: socket.userId });
    });
  });

  // Mark messages as read
  socket.on('mark_messages_read', async ({ conversationId, senderId }) => {
    try {
      await Message.updateMany(
        { 
          conversationId, 
          senderId: { $ne: socket.userId }, 
          status: { $ne: 'read' } 
        },
        { $set: { status: 'read' } }
      );

      if (senderId) {
        io.to(senderId.toString()).emit('messages_read', { conversationId, readBy: socket.userId });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Message Reactions
  socket.on('react_message', async ({ messageId, emoji, receiverIds, receiverId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      
      const existingReactionIndex = message.reactions.findIndex(
        r => r.userId.toString() === socket.userId.toString()
      );
      
      if (existingReactionIndex > -1) {
        if (message.reactions[existingReactionIndex].emoji === emoji) {
          message.reactions.splice(existingReactionIndex, 1); // toggle off
        } else {
          message.reactions[existingReactionIndex].emoji = emoji; // change
        }
      } else {
        message.reactions.push({ emoji, userId: socket.userId }); // add
      }
      
      await message.save();
      
      const otherReceivers = [
        ...new Set(
          (receiverIds || (receiverId ? [receiverId] : []))
            .map(id => id?.toString())
            .filter(id => id && id !== socket.userId.toString())
        )
      ];
      const payload = { messageId, reactions: message.reactions, conversationId: message.conversationId };
      
      otherReceivers.forEach(id => {
        io.to(id).emit('message_reaction_update', payload);
      });
      io.to(socket.userId.toString()).emit('message_reaction_update', payload);
      
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  });

  // --- WEBRTC SIGNALING ---

  socket.on('call_user', async ({ userToCall, signalData, from, name, callType }) => {
    io.to(userToCall).emit('call_user', { signal: signalData, from, name, callType });
    
    try {
      // 1. Create Notification Record for Missed/Incoming call
      // We will create it as CALL_INCOMING and the frontend might clear it if answered
      const notification = await Notification.create({
        recipient: userToCall,
        sender: socket.userId,
        type: 'CALL_INCOMING',
        title: callType === 'audio' ? 'Incoming Voice Call' : 'Incoming Video Call',
        body: `${name || 'Someone'} is calling you.`,
      });

      // Emit direct unread count update
      const unreadCount = await Notification.countDocuments({ recipient: userToCall, isRead: false });
      io.to(userToCall).emit('notification:unread-count', unreadCount);
      io.to(userToCall).emit('notification:new', await notification.populate('sender', 'name profilePicture'));

      // 2. Send Push Notification
      await sendPushNotification(userToCall, {
        type: 'CALL_INCOMING',
        title: 'Incoming Video Call',
        body: `${name || 'Someone'} is calling you.`
      });
    } catch (err) {
      console.error('Failed to handle call notification:', err);
    }
  });

  socket.on('answer_call', ({ to, signal }) => {
    io.to(to).emit('call_accepted', signal);
  });

  socket.on('end_call', async ({ to, duration, callType, callerId }) => {
    io.to(to).emit('call_ended');
    
    if (duration !== undefined && callType && callerId) {
      try {
        const Conversation = require('../models/Conversation');
        const Message = require('../models/Message');

        // Find direct conversation between these two users
        const conv = await Conversation.findOne({
          isGroup: false,
          participants: { $all: [socket.userId, to] }
        });

        if (conv) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          const content = `${callType === 'audio' ? '📞 Voice' : '🎥 Video'} call ended (${formattedDuration})`;

          const sysMsg = await Message.create({
            conversationId: conv._id,
            senderId: callerId,
            type: 'system',
            content: content
          });

          conv.lastMessage = sysMsg._id;
          await conv.save();

          const populatedMsg = await sysMsg.populate('senderId', 'name profilePicture');
          io.to(socket.userId).emit('receive_message', populatedMsg);
          io.to(to).emit('receive_message', populatedMsg);
        }
      } catch (error) {
        console.error('Error saving call duration message:', error);
      }
    }
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(to).emit('ice_candidate', candidate);
  });

  // --- QR LOGIN SIGNALING ---
  socket.on('qr_login_join', (sessionId) => {
    socket.join(`qr_session_${sessionId}`);
  });

  socket.on('qr_login_approve', async ({ sessionId, token, privateKey }) => {
    // The mobile device (which is authenticated) sends this to the session room
    if (socket.userId) { // Ensure the approver is actually authenticated
      io.to(`qr_session_${sessionId}`).emit('qr_login_success', { token, privateKey });
    }
  });
};
