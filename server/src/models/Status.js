const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(+new Date() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expires: '0' }, // TTL index
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Status', statusSchema);
