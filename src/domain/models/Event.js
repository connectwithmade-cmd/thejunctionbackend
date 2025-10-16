import mongoose from "mongoose";
import { registerNotification } from '../../application/services/NotificationService.js'; // adjust path as needed




const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  settings: {
  type: new mongoose.Schema({
    liveStatus: { type: Boolean, default: false },
    access: { type: String, enum: ['public', 'private'], default: 'public' },
    postPermissions: {
      type: String,
      enum: ['admin_only', 'attendees', 'team_members', 'everyone'],
      default: 'admin_only',
    },
    commentsEnabled: { type: Boolean, default: true },
    showAttendeesList: { type: Boolean, default: true },
    allowReshare: { type: Boolean, default: true },
  }, { _id: false }), // Don't generate _id for sub-schema
  default: {}
},


  isLinkedWithGroup: { type: Boolean, default: false },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

  // Likes
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Location options (polls)
  locations: [
    {

      coordinates: {
        type: [Number], // [lat, long]
        required: true,
      },
      votes: {
        type: [String], // userIds
        default: [],
      },
      title:{
        type: String,
        default:'',
      }
    }
  ],

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [long, lat]
  },
  locationTBA: { type: Boolean, default: false },

  // Date options (polls)
  dates: [
    
      {
        votes: { type: [String], default: [] }, // userIds
        startDate: { type: Date, required: true },
        endDate: { type: Date },
      }
    
  ],
  dateTBA: { type: Boolean, default: false },

  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organizerName: String,

  bannerImages: [String],
  tags: [String],
  categories: [String],

  access: { type: String, enum: ['public', 'private'], default: 'public' },

  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
  maxAttendees: { type: Number, default: 0 },

  stagePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "StagePost" }],

  isCancelled: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  isLive: { type: Boolean, default: false },

  wherePoll: { type: Boolean, default: false },
  whenPoll: { type: Boolean, default: false },

  services: [String],

  // Team: Map of userId → role (role can be null or string)
  team: {
  type: Map,
  of: {
    role: { type: String, default: null },

    // Realtime location info
    location: {
      lat: { type: Number, default: null },
      long: { type: Number, default: null },
    },

    // Status flags
    isOnline: { type: Boolean, default: false },
    sharingLocation: { type: Boolean, default: false },

    // Optional: timestamps for location/activity
    lastSeen: { type: Date, default: null },
    lastLocationUpdate: { type: Date, default: null },

    // Optional: device type or other info
    deviceInfo: { type: String, default: null },
  },
  default: {},
},



  // Pool: generic map
  pool: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  teamSetup: { type: Boolean, default: false },
  poolSetup: { type: Boolean, default: false },

  // RSVPs: object keyed by userId
  rsvps: {
    type: Map,
    of: {
      status: { type: String, enum: ['attending', 'maybe', 'declined'], default: 'maybe' },
      respondedAt: { type: Date, default: Date.now },
    },
    default: {}
  },

  lastDateForRefund: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geo queries
eventSchema.index({ location: "2dsphere" });

// Virtual: total number of likes
eventSchema.virtual("likesCount").get(function () {
  return this.likes?.length || 0;
});

// Check if a user liked this event
eventSchema.methods.isLikedBy = function (userId) {
  if (!userId) return false;
  return this.likes.some(id => id.equals(userId));
};

// Add like from userId
eventSchema.methods.like = function (userId) {
  if (!userId) return;
  if (!this.likes.some(id => id.equals(userId))) {
    this.likes.push(userId);
  }
  return this.save();
};

// Remove like from userId
eventSchema.methods.unlike = function (userId) {
  if (!userId) return;
  this.likes = this.likes.filter(id => !id.equals(userId));
  return this.save();
};

// Add these methods inside your eventSchema.methods

// Vote for a location or date option
// type: 'location' | 'date'
// index: which location or date option index (for dates, it's [outerIndex, innerIndex])
// userId: voter user id
eventSchema.methods.vote = function(type, index, userId) {
  if (!userId) throw new Error('UserId is required');

  if (type === 'location') {
    // index is location index
    if (!this.locations || !this.locations[index]) {
      throw new Error('Invalid location index');
    }
    const votes = this.locations[index].votes;
    if (!votes.includes(userId.toString())) {
      votes.push(userId.toString());
    }
  } else if (type === 'date') {
    // index is expected to be an array [outerIndex, innerIndex]
    if (!Array.isArray(index) || index.length !== 2) {
      throw new Error('Date vote requires [outerIndex, innerIndex]');
    }
    const [outerIndex, innerIndex] = index;
    if (!this.dates || !this.dates[outerIndex] || !this.dates[outerIndex][innerIndex]) {
      throw new Error('Invalid date index');
    }
    const votes = this.dates[outerIndex][innerIndex].votes;
    if (!votes.includes(userId.toString())) {
      votes.push(userId.toString());
    }
  } else {
    throw new Error('Invalid vote type');
  }

  return this.save();
};

// Remove vote for a location or date option
eventSchema.methods.unvote = function(type, index, userId) {
  if (!userId) throw new Error('UserId is required');

  if (type === 'location') {
    if (!this.locations || !this.locations[index]) {
      throw new Error('Invalid location index');
    }
    this.locations[index].votes = this.locations[index].votes.filter(id => id.toString() !== userId.toString());
  } else if (type === 'date') {
    if (!Array.isArray(index) || index.length !== 2) {
      throw new Error('Date unvote requires [outerIndex, innerIndex]');
    }
    const [outerIndex, innerIndex] = index;
    if (!this.dates || !this.dates[outerIndex] || !this.dates[outerIndex][innerIndex]) {
      throw new Error('Invalid date index');
    }
    this.dates[outerIndex][innerIndex].votes = this.dates[outerIndex][innerIndex].votes.filter(id => id.toString() !== userId.toString());
  } else {
    throw new Error('Invalid vote type');
  }

  return this.save();
};



// Invite users to event

eventSchema.methods.inviteUsers = async function (userIds, inviterId = null) {
  const invited = [];

  for (const userId of userIds) {
    if (!this.rsvps.has(userId)) {
      // Add RSVP entry
      this.rsvps.set(userId, {
        status: 'maybe',
        respondedAt: new Date()
      });
      invited.push(userId);

      // ✅ Send notification
      await registerNotification({
        type: 'event_invite',
        title: 'You’ve been invited!',
        message: `You’ve been invited to the event "${this.title}"`,
        receiverId: userId,
        senderId: inviterId,
        metadata: { eventId: this._id }
      });
    }
  }

  await this.save();
  return invited;
};

//Cancel Invite
eventSchema.methods.cancelInvites = async function (userIds, cancellerId = null) {
  const removed = [];

  for (const userId of userIds) {
    if (this.rsvps.has(userId)) {
      this.rsvps.delete(userId);
      removed.push(userId);

      // ✅ Optional: send cancellation notification
      await registerNotification({
        type: 'event_invite_cancelled',
        title: 'Invitation Cancelled',
        message: `Your invitation to the event "${this.title}" has been cancelled.`,
        receiverId: userId,
        senderId: cancellerId,
        metadata: { eventId: this._id }
      });
    }
  }

  await this.save();
  return removed;
};



// Respond to invite
// status must be: 'attending', 'maybe', or 'declined'
eventSchema.methods.respondToInvite = async function(userId, status) {
  const validStatuses = ['attending', 'maybe', 'declined'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid RSVP status');
  }

  // If not invited, don't allow response
  if (!this.pool.has(userId.toString()) || !this.pool.get(userId.toString()).invited) {
    throw new Error('User not invited to this event');
  }

  this.rsvps.set(userId.toString(), {
    status,
    respondedAt: new Date(),
  });

  return this.save();
};



// Add a new stage post
eventSchema.methods.addStagePost = function (post) {
  this.stagePosts.push(post);
  return this.save();
};

// Update an existing stage post by ID
eventSchema.methods.updateStagePost = function (postId, updatedFields) {
  const postIndex = this.stagePosts.findIndex(p => p._id.equals(postId));
  if (postIndex === -1) throw new Error("Stage post not found");

  this.stagePosts[postIndex] = {
    ...this.stagePosts[postIndex].toObject(), // convert to plain object
    ...updatedFields,
  };
  return this.save();
};

// Delete a stage post by ID
eventSchema.methods.deleteStagePost = function (postId) {
  const originalLength = this.stagePosts.length;
  this.stagePosts = this.stagePosts.filter(p => !p._id.equals(postId));
  if (this.stagePosts.length === originalLength) throw new Error("Stage post not found");
  return this.save();
};

// Reorder stage posts: pass an array of stagePost IDs in new order
eventSchema.methods.reorderStagePosts = function (newOrder) {
  if (!Array.isArray(newOrder)) throw new Error("New order must be an array");

  const orderedPosts = [];
  for (const id of newOrder) {
    const found = this.stagePosts.find(p => p._id.equals(id));
    if (found) orderedPosts.push(found);
  }

  if (orderedPosts.length !== this.stagePosts.length) {
    throw new Error("New order does not match existing stagePosts");
  }

  this.stagePosts = orderedPosts;
  return this.save();
};





// Automatically update maxAttendees based on sum of tickets quantity
eventSchema.pre('save', function (next) {
  if (Array.isArray(this.price)) {
    this.maxAttendees = this.price.reduce((total, ticket) => total + (ticket.quantity || 0), 0);
  } else {
    this.maxAttendees = 0;
  }
  next();
});

export default mongoose.model("Event", eventSchema);
