const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification,
  subscribePush,
  unsubscribePush,
  getUnreadCount
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');
const Notification = require('../models/Notification');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);

router.delete('/all', async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', deleteNotification);

module.exports = router;
