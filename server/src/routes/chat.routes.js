const express = require('express');
const router = express.Router();
const {
  getConversations,
  createOrGetConversation,
  getMessages,
  searchUsers,
  sendImageMessage,
  sendAudioMessage,
  createGroup,
  updateDisappearingMessages,
  togglePinConversation,
} = require('../controllers/chat.controller');
const { getLinkPreview } = require('../controllers/utils.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, uploadAudio } = require('../config/cloudinary');

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.post('/groups', createGroup);
router.get('/messages/:conversationId', getMessages);
router.post('/messages/image', upload.single('image'), sendImageMessage);
router.post('/messages/audio', uploadAudio.single('audio'), sendAudioMessage);
router.put('/conversations/:id/disappearing', updateDisappearingMessages);
router.put('/conversations/:id/pin', togglePinConversation);
router.get('/link-preview', getLinkPreview);
router.get('/users/search', searchUsers);

module.exports = router;
