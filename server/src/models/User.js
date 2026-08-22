const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Do not return password by default
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true,
      trim: true,
    },
    connectCode: {
      type: String,
      unique: true,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(), // Generate random 4-digit code
    },
    profilePicture: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Hey there! I am using this app.',
      maxlength: 150,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    privacySettings: {
      lastSeen: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
      status: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
    },
    publicKey: {
      type: String,
      default: '', // Public key for E2EE (JWK format as string)
    },
    notificationSettings: {
      messages: { type: Boolean, default: true },
      connectionRequests: { type: Boolean, default: true },
      connectionApprovals: { type: Boolean, default: true },
      groupMessages: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      reactions: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      statusUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      showPreview: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibrate: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
