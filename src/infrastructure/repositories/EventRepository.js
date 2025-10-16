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
  'settings.liveStatus': true, // ✅ use string for nested path
  };

  // Category filter
  if (typeof category === 'string' && category.trim() !== '') {
    baseFilter.categories = { $in: [category.trim()] };
  }

  // Search title filter
  if (typeof searchString === 'string' && searchString.trim() !== '') {
    baseFilter.title = { $regex: searchString.trim(), $options: 'i' };
  }

  // Date filter on the dates array: at least one date in range
  if (startDate || endDate) {
    baseFilter.dates = {
      $elemMatch: {
        $elemMatch: {}
      }
    };
    if (startDate && !isNaN(Date.parse(startDate))) {
      baseFilter.dates.$elemMatch.$elemMatch.startDate = { $gte: new Date(startDate) };
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      baseFilter.dates.$elemMatch.$elemMatch.startDate = baseFilter.dates.$elemMatch.$elemMatch.startDate || {};
      baseFilter.dates.$elemMatch.$elemMatch.startDate.$lte = new Date(endDate);
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
    });
    query = query.sort({ location: 1 }); // Sorting is implicit with $near but just in case
  } else {
    // Sort by creation date descending (newest first)
    query = Event.find(baseFilter).sort({ createdAt: -1 });
  }

  query = query
    .select('title dates categories bannerImages locations organizerId organizerName likesCount description dateTBA locationTBA') 
    .skip(skipCount)
    .limit(limit);

  return query.exec();
}


async findById (eventId, currentUserId = null)  {
const event = await Event.findOne({ _id: eventId, isDeleted: false })
  .populate('organizerId', 'name email profilePicture')
  .populate({
    path: 'stagePosts',
    populate: {
      path: 'creatorId',
      select: 'name email profilePicture userName',
    }
  }).populate({
  path: 'tickets',
}).lean({ virtuals: true });


  if (!event) throw new Error('Event not found');

  // Convert Map fields to plain JS objects
event.team = event.team instanceof Map ? Object.fromEntries(event.team) : event.team || {};
event.rsvps = event.rsvps instanceof Map ? Object.fromEntries(event.rsvps) : event.rsvps || {};
event.pool = event.pool instanceof Map ? Object.fromEntries(event.pool) : event.pool || {};



  // Likes info
  const likesCount = event.likes?.length || 0;
  const isLiked = currentUserId
    ? event.likes?.some(id => id.toString() === currentUserId.toString())
    : false;

  // RSVP Status
  const rsvp = currentUserId && event.rsvps?.[currentUserId];
  const isOrganizer = currentUserId && currentUserId.toString() === event.organizerId._id.toString();
  const isInvited = !!rsvp && !rsvp.status;
  const isAttending = !!rsvp && rsvp.status === 'attending';
  const isTeamMember = !!event.team?.[currentUserId];

  const isPublic = event.access === 'public';

  // Handle TBA conditions
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
    settings: event.settings ?? {}, // ✅ Add settings
    isInvited,
    isAttending,
    isTeamMember,
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
      settings: event.settings ?? {}, // ✅ Add settings

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
      tickets:event.tickets,
    };
  }

if (!isPublic && !isAttending && !isInvited && !isOrganizer) {
  throw new Error('Unauthorized access to private event');
}  return base;
};




  async updateEvent(eventId, updates) {
    return Event.findByIdAndUpdate(eventId, updates, { new: true });
  }


  async searchPublicEvents(query, page , limit ) {
  if (!query || query.trim() === '') {
    throw new Error('Search query is required');
  }

  const regex = new RegExp(query.trim(), 'i'); // contains query, case-insensitive
  const skip = (page - 1) * limit;

  const baseFilter = {
    isDeleted: false,
    isLive: true,
    access: 'public',
    title: { $regex: regex },
  };

  const projection = 'title bannerImages categories organizerId organizerName';

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

/*
  async searchPublicEvents(query, category) {
    const filter = { type: 'public', isDeleted: false };
    if (query) filter.name = { $regex: query, $options: 'i' };
    if (category) filter.category = category;
    return Event.find(filter);
  }

  async save(event) {
    return event.save();
  }*/
}

export default new EventRepository();
