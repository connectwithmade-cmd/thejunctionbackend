import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: false },
  name: { type: String, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  userName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  dob: { type: Date, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, required: false },
  password: { type: String, required: false },
  profilePicture: { type: String, required: false },
  isVerified: { type: Boolean, default: false },
  isProfileSetup: { type: Boolean, default: false },
  userType: { type: String, required: false },
  identificationNumber: { type: String, required: false },
  identificationRecord: { type: String, required: false },
  isCompany: { type: Boolean, default: false, required: true },
  companyName: { type: String, required: false },
  companyRegistrationNumber: { type: String, required: false },
  verificationToken: String,
  resetOtpExpiry: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  myEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

  myPasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketPurchase' }],

stagePosts: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'StagePost'
}],


  friendRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    },
  ],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // 📦 Notifications
notifications: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Notification'
}]
,


  accountSettings: {
    privacy: {
      profileVisibility: { 
        type: String, 
        enum: ['public', 'friends', 'private'], 
        default: 'public' 
      },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      allowFriendRequests: { type: Boolean, default: true },
    },
    posts: {
      allowCommentsFrom: { 
        type: String, 
        enum: ['everyone', 'friends', 'none'], 
        default: 'everyone' 
      },
      allowTagging: { type: Boolean, default: true }
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      loginAlerts: { type: Boolean, default: true },
    }
  },



  unreadNotificationCount: { type: Number, default: 0 },
  notificationSettings: {
    type: Map,
    of: Boolean,
    default: {
      friend_request: true,           // done
      friend_accepted: true,          // done
      mention: true,
      new_follower: true,
      role_update: true,              // done
      ticket_purchase: true,         // renamed from ticket_purchased
      ticket_received: true,
      event_updated: true,
      event_reminder: true,
      event_invite: true,            // new
      event_cancelled: true,
      service_inquiry: true,         // done
      booking_update: true,          // done
      booking_response: true,        // done
      booking_confirmed: true,       // done
      booking_payment: true,         // done
      message: true,                 // done
      group_chat_mention: true,
      group_invite: true,            // done
      admin_announcement: true,
      account_warning: true,
      app_update: true
    },
  },

  // 🔔 FCM push token
  fcmTokens: {
    type: [String],   // array of strings
    default: []       // default empty array
  }
});

const User = mongoose.model('User', UserSchema);
export default User;
