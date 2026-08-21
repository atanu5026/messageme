const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'messageme/images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const audioStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'messageme/audio',
    resource_type: 'video', // Cloudinary treats audio as video
    allowed_formats: ['mp3', 'webm', 'wav', 'ogg'],
  },
});

const upload = multer({ storage: storage });
const uploadAudio = multer({ storage: audioStorage });

module.exports = { cloudinary, upload, uploadAudio };
