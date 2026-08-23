const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const OTP = require('../models/OTP');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber, publicKey } = req.body;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });

    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or phone number already exists' 
      });
    }

    // Generate unique 4-digit connect code
    let connectCode;
    let codeExists = true;
    while (codeExists) {
      connectCode = Math.floor(1000 + Math.random() * 9000).toString();
      const existingUser = await User.findOne({ connectCode });
      if (!existingUser) {
        codeExists = false;
      }
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      phoneNumber,
      connectCode,
      publicKey
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          about: user.about,
          publicKey: user.publicKey,
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const validOTP = await OTP.findOne({ email, otp });

    if (!validOTP) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isEmailVerified = true;
    await user.save();

    // Delete the OTP after verification
    await OTP.deleteOne({ _id: validOTP._id });

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password, publicKey } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Update publicKey if provided during login
      if (publicKey && user.publicKey !== publicKey) {
        user.publicKey = publicKey;
        await user.save();
      }
      
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Set refresh token in HTTP-only cookie
      res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        sameSite: 'strict', // Prevent CSRF attacks
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture,
          phoneNumber: user.phoneNumber,
          connectCode: user.connectCode,
          about: user.about,
          publicKey: user.publicKey,
          accessToken, // Sending access token to client
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
      return res.status(401).json({ success: false, message: 'Unauthorized, no refresh token' });
    }

    const refreshToken = cookies.jwt;

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ success: false, message: 'Forbidden, invalid refresh token' });

      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const accessToken = generateAccessToken(user._id);

      res.status(200).json({
        success: true,
        data: {
          accessToken,
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  refresh,
  logoutUser,
  getMe,
};
