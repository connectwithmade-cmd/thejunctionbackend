import Notification from '../../domain/models/Notification.js';
import User from '../../domain/models/User.js';
import admin from '../../config/firebase.js'; // Firebase Admin SDK

/**
 * Registers a notification and optionally sends a push notification.
 *
 * @param {Object} params
 * @param {string} params.type - notification type
 * @param {string} params.title - heading for push notification
 * @param {string} params.message - body text for push notification
 * @param {ObjectId} params.receiverId - receiver's ID
 * @param {ObjectId} [params.senderId] - optional sender
 * @param {Object} [params.metadata] - optional metadata (e.g., eventId, serviceId)
 */
export const registerNotification = async ({
  type,
  title,
  message,
  receiverId,
  senderId,
  metadata = {},
}) => {
  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) throw new Error('Receiver not found');

    // Special case: "message" type -> push only, no DB entry
    if (type === 'message') {
      const isEnabled = receiver.notificationSettings?.get(type);
      if (isEnabled !== false) {
        await sendPushNotification(receiver, title, message);
      }
      return { pushOnly: true };
    }

    // Save notification in DB for all other types
    const notification = new Notification({
      type,
      title,
      message,
      receiver: receiverId,
      sender: senderId,
      metadata,
    });
    await notification.save();

    // Add notification to user's list and increment unread count
    await User.findByIdAndUpdate(receiverId, {
      $push: { notifications: notification._id },
      $inc: { unreadNotificationCount: 1 },
    });

    // Check if push is enabled for this type
    const isEnabled = receiver.notificationSettings?.get(type);
    if (isEnabled !== false) {
      await sendPushNotification(receiver, title, message);
    }

    return notification;
  } catch (err) {
    console.error('Failed to register notification:', err.message);
  }
};

/**
 * Sends push notification using Firebase Admin SDK
 */
async function sendPushNotification(user, title, message) {
  if (!user.fcmTokens || user.fcmTokens.length === 0) return;

  for (const token of user.fcmTokens) {
    try {
      await admin.messaging().send({
        notification: { title, body: message },
        token,
      });
      console.log(`Push sent to ${token}`);
    } catch (error) {
      console.error(`Push failed for ${token}: ${error.message}`);
    }
  }
}
