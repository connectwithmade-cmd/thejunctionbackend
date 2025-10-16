import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'friend_request',//done
      'friend_accepted',// done
      'mention',
      'new_follower',
      'role_update',//done
      'ticket_purchase',//done
      'ticket_received',
      'event_updated',
      'event_reminder',
      'event_invite',//done
      'event_cancelled',
      'service_inquiry',//done initial inquiry 
      'booking_update',//done accepted/offer by vendor or rejected
      'booking_response',// done  countered by client if negotiable
      'booking_confirmed',// done confirmed by client, make payment
      'booking_payment',//done payment received
      'message',//done
      'group_chat_mention',
      'group_invite',//done
      'admin_announcement',
      'account_warning',
      'app_update'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  metadata: { type: Object }, // e.g., related event/service/etc
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
