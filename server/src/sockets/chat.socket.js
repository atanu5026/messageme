const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

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
      
      otherReceivers.forEach(id => {
        io.to(id).emit('receive_message', populatedMessage);
      });

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

  socket.on('call_user', ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit('call_user', { signal: signalData, from, name });
  });

  socket.on('answer_call', ({ to, signal }) => {
    io.to(to).emit('call_accepted', signal);
  });

  socket.on('end_call', ({ to }) => {
    io.to(to).emit('call_ended');
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(to).emit('ice_candidate', candidate);
  });
};
