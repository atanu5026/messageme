# MERN Real-Time Messaging Application

## 1. Project Requirements
A modern, full-stack real-time messaging application using the MERN stack with WebSocket support (Socket.IO).
Features include User Registration, JWT Authentication, One-to-one/Group Messaging, Typing Indicators, Delivery Status, and WebRTC Video Calls.

## 2. Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (Local or Atlas)

## 3. Installation
1. Clone the repository.
2. Install dependencies for the backend:
   ```bash
   cd server
   npm install
   ```
3. Install dependencies for the frontend:
   ```bash
   cd client
   npm install
   ```

## 4. Environment Variables
Copy the `.env.example` file to `.env` in the `server` directory and fill in the necessary values:
```bash
cp .env.example .env
```
Refer to the `.env.example` file for required variables.

## 5. MongoDB Configuration
Provide your MongoDB connection URI in the `.env` file under the `MONGODB_URI` variable.

## 6. Backend Startup
From the `server` directory, run:
```bash
npm run dev
```
The server will start on port 5000 by default.

## 7. Frontend Startup
From the `client` directory, run:
```bash
npm run dev
```
The Vite development server will start.
