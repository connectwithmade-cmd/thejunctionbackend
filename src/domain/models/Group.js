import mongoose from 'mongoose';



const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    tags: [{ type: String }],
    categories: [{ type: String }],
    bannerImages: [{ type: String }], // Equivalent of coverPicture/groupPicture
    type: { type: String, enum: ['public', 'private'], required: true }, // corresponds to "access"
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
      },
    ],

    inviteRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
      },
    ],

    stagePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "StagePost" }],

    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    eventStatuses: [
      {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        status: { type: String },
      }
    ],

    isDeleted: { type: Boolean, default: false },

    
  },
  { timestamps: true }
);
GroupSchema.methods.getUserGroupStatus = function (userId) {
  if (!userId) return { isMember: false, isAdmin: false, isInvited: false };

  const memberEntry = this.members.find(m => m.user.equals(userId));
  const isMember = !!memberEntry;
  const isAdmin = isMember && memberEntry.role === 'admin';

  const isInvited = this.inviteRequests.some(req =>
    req.user.equals(userId) && req.status === 'pending'
  );

  return { isMember, isAdmin, isInvited };
};



const Group = mongoose.model('Group', GroupSchema);
export default Group;
