const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await notification.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Subscribe to push notifications
 * @route   POST /api/notifications/subscribe
 * @access  Private
 */
const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys, deviceInfo } = req.body;

    if (!endpoint || !keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    // Check if subscription already exists for this endpoint
    let subscription = await PushSubscription.findOne({ endpoint });

    if (subscription) {
      // If it exists, make sure it belongs to the current user (could be different user on same device)
      if (subscription.user.toString() !== req.user._id.toString()) {
        subscription.user = req.user._id;
      }
      subscription.keys = keys;
      subscription.deviceInfo = deviceInfo || subscription.deviceInfo;
      subscription.lastUsedAt = Date.now();
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await PushSubscription.create({
        user: req.user._id,
        endpoint,
        keys,
        deviceInfo
      });
    }

    res.status(200).json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Unsubscribe from push notifications
 * @route   POST /api/notifications/unsubscribe
 * @access  Private
 */
const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required' });
    }

    await PushSubscription.findOneAndDelete({ endpoint, user: req.user._id });

    res.status(200).json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribePush,
  unsubscribePush,
  getUnreadCount
};
