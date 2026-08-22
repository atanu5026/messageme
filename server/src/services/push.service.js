const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// Configure Web Push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@messageme.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Helper to check if a user wants to receive this type of notification
 */
const shouldSendNotification = (user, type) => {
  if (!user.notificationSettings) return true; // Default to true if not set
  
  const settings = user.notificationSettings;
  switch (type) {
    case 'MESSAGE': return settings.messages;
    case 'CONNECTION_REQUEST': return settings.connectionRequests;
    case 'CONNECTION_ACCEPTED': return settings.connectionApprovals;
    case 'GROUP_MENTION': return settings.mentions;
    case 'REACTION': return settings.reactions;
    case 'CALL_INCOMING': 
    case 'CALL_MISSED': return settings.calls;
    case 'SECURITY': return settings.securityAlerts;
    default: return true;
  }
};

/**
 * Checks if a specific conversation is muted for the user
 */
const isConversationMuted = (conversation, userId) => {
  if (!conversation || !conversation.muteSettings) return false;
  
  const setting = conversation.muteSettings.find(s => s.user.toString() === userId.toString());
  if (!setting) return false;
  
  if (setting.level === 'always') return true;
  if (setting.mutedUntil && new Date() < setting.mutedUntil) return true;
  
  return false;
};

/**
 * Send a web push notification to a user's devices
 */
const sendPushNotification = async (userId, payload, conversationId = null) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    
    // 1. Check global notification preference for this type
    if (!shouldSendNotification(user, payload.type)) {
      return;
    }
    
    // 2. Check per-conversation mute settings
    if (conversationId && payload.type === 'MESSAGE') {
      const conversation = await Conversation.findById(conversationId);
      if (isConversationMuted(conversation, userId)) {
        return;
      }
    }

    // 3. Find all active subscriptions for the user
    const subscriptions = await PushSubscription.find({ user: userId });
    
    if (subscriptions.length === 0) return;
    
    // Format payload
    // Strip sensitive info if the user disabled previews
    let finalBody = payload.body;
    if (user.notificationSettings && !user.notificationSettings.showPreview && payload.type === 'MESSAGE') {
      finalBody = 'You have a new message';
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: finalBody,
      data: {
        url: payload.url || '/',
        type: payload.type,
        conversationId: conversationId
      }
    });

    // 4. Send to all devices
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, pushPayload);
        
        // Update last used
        sub.lastUsedAt = Date.now();
        await sub.save();
      } catch (err) {
        // If subscription is invalid/expired (statusCode 410 or 404), remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id);
        } else {
          console.error('Error sending push notification', err);
        }
      }
    });

    await Promise.all(sendPromises);
    
  } catch (error) {
    console.error('Failed to process push notification:', error);
  }
};

module.exports = {
  sendPushNotification,
};
