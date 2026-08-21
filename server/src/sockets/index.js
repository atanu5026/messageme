const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Track online users globally
// Map of userId -> Set of socketIds
const onlineUsers = new Map();

const initializeSockets = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected via socket: ${socket.userId} (${socket.id})`);

    // Add user to online users map
    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, new Set());
      // Update DB and broadcast
      const user = await User.findByIdAndUpdate(socket.userId, { isOnline: true }, { new: true });
      if (user && user.privacySettings?.lastSeen !== 'nobody') {
        io.emit('user_online', { userId: socket.userId });
      }
    }
    onlineUsers.get(socket.userId).add(socket.id);

    // Let the user join their own personal room (for direct notifications)
    socket.join(socket.userId);

    // Initialize chat-specific events
    require('./chat.socket')(io, socket);

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId} (${socket.id})`);
      
      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          // Update DB and broadcast
          const user = await User.findByIdAndUpdate(socket.userId, { 
            isOnline: false,
            lastSeen: new Date()
          }, { new: true });
          
          if (user && user.privacySettings?.lastSeen !== 'nobody') {
            io.emit('user_offline', { userId: socket.userId });
          }
        }
      }
    });
  });
};

module.exports = initializeSockets;
