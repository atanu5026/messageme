const express = require('express');
const router = express.Router();
const {
  updateProfile,
  updateProfilePicture,
  updateAbout,
  updatePassword,
  updatePrivacySettings,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');

// All user routes are protected
router.use(protect);

router.put('/profile', updateProfile);
router.put('/profile-picture', upload.single('image'), updateProfilePicture);
router.put('/about', updateAbout);
router.put('/password', updatePassword);
router.put('/privacy', updatePrivacySettings);

module.exports = router;
