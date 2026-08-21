const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmail,
  loginUser,
  refresh,
  logoutUser,
  getMe,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Strict Rate Limiting for Auth routes: 1000 requests per 15 minutes (Relaxed for dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  }
});

router.post('/register', authLimiter, registerUser);
router.post('/verify-email', verifyEmail);
router.post('/login', authLimiter, loginUser);
router.post('/refresh', refresh);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

module.exports = router;
