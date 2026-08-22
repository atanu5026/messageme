const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Update user profile (name, email)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.publicKey) user.publicKey = req.body.publicKey;

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile picture
// @route   PUT /api/users/profile-picture
// @access  Private
const updateProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const user = await User.findById(req.user._id);

    if (user) {
      // The file URL is available on req.file.path thanks to CloudinaryStorage
      user.profilePicture = req.file.path;
      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: updatedUser,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update about text
// @route   PUT /api/users/about
// @access  Private
const updateAbout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.about = req.body.about || user.about;
      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'About text updated successfully',
        data: updatedUser,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (user) {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide both current and new passwords' });
      }

      // Check current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect current password' });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password updated successfully',
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   PUT /api/users/privacy
// @access  Private
const updatePrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.lastSeen) user.privacySettings.lastSeen = req.body.lastSeen;
      if (req.body.status) user.privacySettings.status = req.body.status;

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: updatedUser,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};
// @desc    Update notification settings
// @route   PUT /api/users/notifications
// @access  Private
const updateNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.notificationSettings) {
        user.notificationSettings = {
          ...user.notificationSettings,
          ...req.body.notificationSettings
        };
      }

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Notification settings updated successfully',
        data: updatedUser,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle block/unblock a user
// @route   PUT /api/users/block/:id
// @access  Private
const toggleBlockUser = async (req, res, next) => {
  try {
    const userToBlockId = req.params.id;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userToBlockId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const isBlocked = user.blockedUsers.includes(userToBlockId);

    if (isBlocked) {
      // Unblock
      user.blockedUsers = user.blockedUsers.filter(
        (id) => id.toString() !== userToBlockId
      );
    } else {
      // Block
      user.blockedUsers.push(userToBlockId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: user.blockedUsers,
      message: isBlocked ? 'User unblocked' : 'User blocked',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  updateProfilePicture,
  updateAbout,
  updatePassword,
  updatePrivacySettings,
  updateNotificationSettings,
  toggleBlockUser,
};
