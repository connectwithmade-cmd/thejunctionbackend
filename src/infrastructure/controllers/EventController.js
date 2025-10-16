import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import EventService from '../../application/services/EventService.js';
import UserManagementService from '../../application/services/EventService.js';

import User from '../../domain//models/User.js'; 
import multer from 'multer';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      title,
      description,
      locations = [],
      dates = [],
      bannerImages = [],
      tags = [],
      categories = [],
      groupId = null,
      isLive = false,
      access = 'public',
      tickets = [], // 👈 YOU MISSED THIS
      maxAttendees,
      services = [],
      lastDateForRefund,
    } = req.body;

    try {
      // Find user for organizerName
      const user = await User.findById(req.user.id);
      if (!user) throw new Error("User not found");

      // Default to first location for geo field
      const primaryLocation = locations[0]?.coordinates || [0, 0];

      // Prepare rsvps object: Map with userId keys
      const rsvps = new Map([
        [req.user.id.toString(), { status: 'attending', respondedAt: new Date() }]
      ]);

      // Prepare team Map
      const team = new Map([
        [req.user.id.toString(), { role: 'organizer' }]
      ]);

      const event = await EventService.createEvent({
        title,
        description,
        locations,
        dates,
        bannerImages,
        tags,
        categories,
        groupId,
        isLinkedWithGroup: !!groupId,
        isLive,
        access,
        maxAttendees,
        tickets,
        services,
        lastDateForRefund,

        // Organizer
        organizerId: req.user.id,
        organizerName: user.name,

        // Initial team and RSVPs as Maps
        team,
        rsvps,

        // Geo search location
        location: {
          type: 'Point',
          coordinates: [primaryLocation[1], primaryLocation[0]] // GeoJSON: [long, lat]
        },
      });

      // Add event ID to user
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { myEventIds: event._id } },
        { new: true }
      );

      CommonResponse.success(res, { id: event._id.toString() });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);
// 2. Get Event by ID
router.get('/public/:id',
    passport.authenticate('jwt', { session: false }),

  async (req, res) => {
  try {
    const eventId = req.params.id;
    const currentUserId = req.user?._id; // optional: if you're using auth middleware

    const event = await EventService.getEventById(eventId, currentUserId);
    CommonResponse.success(res, event);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 3. Get All Public Events (GET with query params)
router.get('/public', async (req, res) => {
  try {
    // Extract query params from req.query
    // req.query properties are always strings, so convert as needed
    const {
      lat,
      long,
      maxDistance,
      category,
      searchString,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const filters = {
      lat: lat ? parseFloat(lat) : undefined,
      long: long ? parseFloat(long) : undefined,
      maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
      category,
      searchString,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const events = await EventService.getAllEvents(filters);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});


// 4. Get Events by Group
router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params;
  try {
    const events = await EventService.getGroupEvents(groupId);
    CommonResponse.success(res, events);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 5. Edit Event
router.put(
  '/:eventId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const updates = req.body;

    try {
      const updatedEvent = await EventService.editEvent(
        eventId,
        updates,
        req.user.id
      );
      CommonResponse.success(res, updatedEvent);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 6. Soft Delete Event
router.delete(
  '/:eventId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const result = await EventService.softDeleteEvent(eventId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);



// 7. Search Events (Public & Live)
router.get('/search', async (req, res) => {
  const { query, page, limit } = req.query;

  try {
    const result = await EventService.searchEvents(query, parseInt(page), parseInt(limit));
    CommonResponse.success(res, result);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 8. Like an event
router.post(
  '/:eventId/like',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.likeEvent(eventId, userId);
      CommonResponse.success(res, { likesCount: updatedEvent.likesCount, likedByUser: true });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 9. Dislike (unlike) an event
router.post(
  '/:eventId/dislike',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.dislikeEvent(eventId, userId);
      CommonResponse.success(res, { likesCount: updatedEvent.likesCount, likedByUser: false });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 10. Vote on an option (location or date)
router.post(
  '/:eventId/vote',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const { type, index } = req.body; // type: 'location' or 'date', index: number or array
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.voteOnOption(eventId, type, index, userId);
      CommonResponse.success(res, { message: 'Vote recorded', event: updatedEvent });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 11. Unvote on an option (location or date)
router.post(
  '/:eventId/unvote',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const { type, index } = req.body;
    const userId = req.user.id;

    try {
      const updatedEvent = await EventService.unvoteOnOption(eventId, type, index, userId);
      CommonResponse.success(res, { message: 'Vote removed', event: updatedEvent });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);



//12. Invite users to event (organizer/team only)
router.post(
  '/:eventId/invite',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const inviterId = req.user.id;
    const { userIds } = req.body;

    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return CommonResponse.error(res, 'userIds must be a non-empty array', 400);
      }

      const event = await EventService.inviteUsersToEvent(eventId, inviterId, userIds);
      CommonResponse.success(res, { message: 'Users invited', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 403);
    }
  }
);


// Cancel invites to an event
router.post('/:id/cancel-invites',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const adminId = req.user._id;
      const { userIds } = req.body; // Expecting: { userIds: [array of user IDs] }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return CommonResponse.error(res, 'No user IDs provided', 400);
      }

      const cancelled = await EventService.cancelUserInvites(eventId, adminId, userIds);
      return CommonResponse.success(res, { cancelled });
    } catch (err) {
      return CommonResponse.error(res, err.message, 400);
    }
  }
);


//13. RSVP to event invite
router.post(
  '/:eventId/rsvp',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['attending', 'maybe', 'declined'].includes(status)) {
      return CommonResponse.error(res, 'Invalid RSVP status', 400);
    }

    try {
      const event = await EventService.respondToEventInvite(eventId, userId, status);
      CommonResponse.success(res, { message: 'RSVP updated', event });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

router.get(
  '/:userId/my-events',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
      const user = await User.findById(userId).lean();
      if (!user || !Array.isArray(user.myEventIds)) {
        return CommonResponse.success(res, {
          events: [],
          page,
          total: 0,
          pages: 0
        });
      }

      const total = user.myEventIds.length;
      const startIndex = (page - 1) * limit;
      const paginatedEventIds = user.myEventIds.slice(startIndex, startIndex + limit);

      const events = await Promise.all(
        paginatedEventIds.map(async eventId =>
          await EventService.getEventById(eventId, userId).catch(() => null)
        )
      );

      const filteredEvents = events.filter(e => e !== null);

      CommonResponse.success(res, {
        events: filteredEvents,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      console.error(err);
      CommonResponse.error(res, err.message || 'Failed to load user events', 500);
    }
  }
);







//18. Upload banner image for an event
router.post('/:id/banner-image', upload.single('file'), 
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
  try {
    const  {id}  = req.params;
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return CommonResponse.error(res, 'No file uploaded', 400);
    }
    const event = await EventService.getEventById(id, userId);
    if(event){
      const uploadResult = await EventService.uploadEventBannerImage(file, 'event-banners',event);
      CommonResponse.success(res, uploadResult);
    }
  } catch (error) {
    CommonResponse.error(res, error.message, 500);
  }
});


// 19. Get events user is invited to (based on RSVPs)
router.get('/user-invites',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const userId = req.user.id;


      const events = await EventService.getUserInvitedEvents(userId);

      CommonResponse.success(res, {
        events,
        total: events.length
      });

    } catch (error) {
      CommonResponse.error(res, error.message, 500);
    }
  }
);


//Team Apis

router.post('/:id/join-team',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      const { role, location } = req.body;

      const event = await EventService.joinEventTeam(eventId, userId, role, location);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


router.post('/:id/team-location',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      const { lat, long } = req.body;

      const event = await EventService.updateTeamLocation(eventId, userId, lat, long);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


router.post('/:id/location-sharing',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      const { sharing } = req.body;

      const event = await EventService.toggleLocationSharing(eventId, userId, sharing);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


router.post('/:id/online-status',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      const { isOnline } = req.body;

      const event = await EventService.updateOnlineStatus(eventId, userId, isOnline);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);


router.post('/:id/remove-team-member',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const removerId = req.user._id;
      const { targetUserId } = req.body;

      const event = await EventService.removeTeamMember(eventId, removerId, targetUserId);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

router.post('/:id/update-team-role',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    try {
      const eventId = req.params.id;
      const { userId, newRole } = req.body;

      const event = await EventService.updateTeamMemberRole(eventId, userId, newRole);
      CommonResponse.success(res, event);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);




export default router;
