// nodemon restart trigger  
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const connectDB = require('./config/db');

const http = require('http');
const { Server } = require('socket.io');
const initializeSockets = require('./sockets');

const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Create HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
initializeSockets(io);

// Start Server
const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

