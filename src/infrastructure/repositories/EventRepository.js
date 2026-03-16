import Event from "../../domain/models/Event.js";

class EventRepository {

  async create(data) {
    const event = new Event(data);
    return event.save();
  }



  async findPublicEvents({
    lat,
    long,
    maxDistance = 50000,
    category,
    searchString,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = {}) {

    const baseFilter = {
      access: 'public',
      isDeleted: false,
      'settings.liveStatus': true,
      'moderation.status': 'approved' // ✅ moderation filter
    };

    // Category filter
    if (typeof category === 'string' && category.trim() !== '') {
      baseFilter.categories = { $in: [category.trim()] };
    }

    // Title search
    if (typeof searchString === 'string' && searchString.trim() !== '') {
      baseFilter.title = { $regex: searchString.trim(), $options: 'i' };
    }

    // Date filter
    if (startDate || endDate) {
      baseFilter.dates = {
        $elemMatch: {
          $elemMatch: {}
        }
      };

      if (startDate && !isNaN(Date.parse(startDate))) {
        baseFilter.dates.$elemMatch.$elemMatch.startDate = {
          $gte: new Date(startDate)
        };
      }

      if (endDate && !isNaN(Date.parse(endDate))) {
        baseFilter.dates.$elemMatch.$elemMatch.startDate =
          baseFilter.dates.$elemMatch.$elemMatch.startDate || {};

        baseFilter.dates.$elemMatch.$elemMatch.startDate.$lte =
          new Date(endDate);
      }
    }

    const skipCount = (page > 0 ? page - 1 : 0) * limit;

    let query;

    if (lat != null && long != null) {

      query = Event.find({
        ...baseFilter,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(long), parseFloat(lat)],
            },
            $maxDistance: parseInt(maxDistance),
          },
        },
      }).sort({ location: 1 });

    } else {

      query = Event.find(baseFilter)
        .sort({ createdAt: -1 });

    }

    query = query
      .select(
        'title dates categories bannerImages locations organizerId organizerName likesCount description dateTBA locationTBA'
      )
      .skip(skipCount)
      .limit(limit);

    return query.exec();
  }




  async findById(eventId, currentUserId = null) {

    const event = await Event.findOne({
      _id: eventId,
      isDeleted: false
    })
      .populate('organizerId', 'name email profilePicture')
      .populate({
        path: 'stagePosts',
        populate: {
          path: 'creatorId',
          select: 'name email profilePicture userName',
        }
      })
      .populate({
        path: 'tickets',
      })
      .lean({ virtuals: true });

    if (!event) throw new Error('Event not found');


    // 🔒 Moderation rules
    const moderationStatus = event.moderation?.status || "approved";

    const isOrganizer =
      currentUserId &&
      event.organizerId &&
      currentUserId.toString() === event.organizerId._id.toString();

    if (moderationStatus === "blocked") {
      throw new Error("Event removed by moderation");
    }

    if (moderationStatus === "pending" && !isOrganizer) {
      throw new Error("Event under moderation review");
    }

    if (moderationStatus === "shadow" && !isOrganizer) {
      throw new Error("Event not found");
    }


    // Convert Map fields
    event.team =
      event.team instanceof Map
        ? Object.fromEntries(event.team)
        : event.team || {};

    event.rsvps =
      event.rsvps instanceof Map
        ? Object.fromEntries(event.rsvps)
        : event.rsvps || {};

    event.pool =
      event.pool instanceof Map
        ? Object.fromEntries(event.pool)
        : event.pool || {};



    // Likes
    const likesCount = event.likes?.length || 0;

    const isLiked = currentUserId
      ? event.likes?.some(
          id => id.toString() === currentUserId.toString()
        )
      : false;


    // RSVP
    const rsvp = currentUserId && event.rsvps?.[currentUserId];

    const isInvited = !!rsvp && !rsvp.status;

    const isAttending = !!rsvp && rsvp.status === 'attending';

    const isTeamMember = !!event.team?.[currentUserId];

    const isPublic = event.access === 'public';


    const includeLocations = !event.locationTBA;

    const includeDates = !event.dateTBA;



    const base = {
      _id: event._id,
      title: event.title,
      organizerId: event.organizerId,
      organizerName: event.organizerName,
      access: event.access,
      bannerImages: event.bannerImages,
      tags: event.tags,
      categories: event.categories,
      isLive: event.isLive,
      lastDateForRefund: event.lastDateForRefund,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      locationTBA: event.locationTBA,
      dateTBA: event.dateTBA,
      likesCount,
      isLiked,
      isOrganizer,
      settings: event.settings ?? {},
      isInvited,
      isAttending,
      isTeamMember,
      moderation: event.moderation ?? {},
      ...(includeLocations && { locations: event.locations }),
      ...(includeDates && { dates: event.dates }),
    };


    if (isOrganizer) {
      return {
        ...event,
        isLiked,
        likesCount,
        isOrganizer,
        isInvited,
        isAttending,
        isTeamMember,
        settings: event.settings ?? {},
        moderation: event.moderation ?? {},
      };
    }


    if (isInvited || isAttending) {
      return {
        ...base,
        description: event.description,
        isLinkedWithGroup: event.isLinkedWithGroup,
        groupId: event.groupId,
        stagePosts: event.stagePosts,
        services: event.services,
        maxAttendees: event.maxAttendees,
        isCancelled: event.isCancelled,
        wherePoll: event.wherePoll,
        whenPoll: event.whenPoll,
        teamSetup: event.teamSetup,
        poolSetup: event.poolSetup,
      };
    }


    if (isPublic) {
      return {
        ...base,
        stagePosts: event.stagePosts,
        tickets: event.tickets,
      };
    }


    if (!isPublic && !isAttending && !isInvited && !isOrganizer) {
      throw new Error('Unauthorized access to private event');
    }

    return base;
  }




  async updateEvent(eventId, updates) {
    return Event.findByIdAndUpdate(eventId, updates, { new: true });
  }



  async searchPublicEvents(query, page, limit) {

    if (!query || query.trim() === '') {
      throw new Error('Search query is required');
    }

    const regex = new RegExp(query.trim(), 'i');

    const skip = (page - 1) * limit;

    const baseFilter = {
      isDeleted: false,
      access: 'public',
      'settings.liveStatus': true,
      'moderation.status': 'approved',
      title: { $regex: regex },
    };

    const projection =
      'title bannerImages categories organizerId organizerName';

    const [events, total] = await Promise.all([

      Event.find(baseFilter)
        .select(projection)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      Event.countDocuments(baseFilter),
    ]);

    return { events, total };
  }




  // Moderator queue
  async findModerationQueue(page = 1, limit = 20) {

    const skip = (page - 1) * limit;

    return Event.find({
      "moderation.status": { $in: ["pending", "blocked"] }
    })
      .populate("organizerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }



  // AI risk monitoring
  async findHighRiskEvents(riskScore = 0.8) {

    return Event.find({
      "moderation.riskScore": { $gte: riskScore }
    })
      .populate("organizerId", "name email")
      .limit(50);
  }

}

export default new EventRepository();