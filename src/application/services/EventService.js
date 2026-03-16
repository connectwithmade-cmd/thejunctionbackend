import EventRepository from "../../infrastructure/repositories/EventRepository.js";
import GroupRepository from "../../infrastructure/repositories/GroupRepository.js";
import Event from "../../domain/models/Event.js";
import User from "../../domain/models/User.js";
import Ticket from "../../domain/models/Ticket.js";
import FileUploadService from "./FileUploadService.js";
import { registerNotification } from '../../application/services/NotificationService.js'; // adjust path as needed


import {v4 as uuidv4} from 'uuid';
import ModerationEngine from "./moderation/ModerationEngine.js";

import mongoose from "mongoose";
import GroupService from "./GroupService.js";

class EventService {


  /// Create a new event
/// Create a new event with safe AI moderation
async createEvent(data) {
  const { groupId, creatorId } = data;
  const tickets = data.tickets || [];
  delete data.tickets;

  data.isLive = data.isLive ?? false;
  data.access = data.access ?? "public";
  data.isLinkedWithGroup = !!groupId;
  data.groupId = groupId || null;

  // Validate group admin if group is provided
  if (groupId) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw new Error("Group not found.");

    const isAdmin =
      data.organizerId === group.creator.toString() ||
      group.members.some(
        (member) =>
          member.user.toString() === data.organizerId && member.role === "admin"
      );

    if (!isAdmin) throw new Error("Only group admins can create events.");
  }

  // 1️⃣ Create event first (moderation async)
  const event = new Event(data);
  await event.save();

  // 2️⃣ Create tickets
  const ticketIds = [];
  for (const ticketData of tickets) {
    const ticket = new Ticket({ ...ticketData, eventId: event._id });
    await ticket.save();
    ticketIds.push(ticket._id);
  }

  event.tickets = ticketIds;
  await event.save();

  // 3️⃣ Link to group if needed
  if (groupId) {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw new Error("Group not found");

    group.eventIds.push(event._id);
    group.eventStatuses.push({
      eventId: event._id,
      status: data.isLive ? "live" : "upcoming",
    });

    await GroupRepository.save(group);
  }

  // 4️⃣ Add event to creator
  await User.findByIdAndUpdate(
    creatorId,
    { $push: { myEventIds: event._id } },
    { new: true }
  );

  // 5️⃣ Queue AI moderation (non-blocking)
  queueModeration({
    userId: data.organizerId,
    eventId: event._id,
    content: {
      title: data.title,
      description: data.description,
      images: data.bannerImages,
    },
  });

  // 6️⃣ Return populated event immediately
  return await Event.findById(event._id).populate("tickets");
}

/**
 * Queue moderation request to prevent 429 errors
 * Uses a simple retry/backoff internally
 */
async  queueModeration({ userId, eventId, content }) {
  setImmediate(async () => {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Retry logic to prevent 429
      for (let i = 0; i < 5; i++) {
        try {
          const moderation = await ModerationEngine.moderate({
            user,
            contentType: "event",
            content,
          });

          const update = {};
          if (moderation.action === "block") {
            update["moderation.status"] = "blocked";
            update["moderation.riskScore"] = moderation.risk;
          } else if (moderation.action === "shadow") {
            update["moderation.status"] = "shadow";
            update["moderation.riskScore"] = moderation.risk;
          } else if (moderation.action === "review") {
            update["moderation.status"] = "pending";
            update["moderation.riskScore"] = moderation.risk;
          }

          if (Object.keys(update).length > 0) {
            await Event.findByIdAndUpdate(eventId, update);
          }
          break; // success, exit retry
        } catch (err) {
          if (err.status === 429) {
            await new Promise((r) => setTimeout(r, (i + 1) * 1000));
          } else {
            console.error("Moderation failed:", err.message);
            break;
          }
        }
      }
    } catch (err) {
      console.error("Queue moderation error:", err.message);
    }
  });
}
  //Upload Images
  async uploadEventBannerImage(file,type, event) {
      const uniqueFileName = `images/${type}/${event.id}/${uuidv4()}_${file.originalname}`;
      const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
      console.log("uploadResult:::::::: ", uploadResult);
      await this.editEvent(event.id, {bannerImages: uploadResult?.Location});
      return uploadResult;
    }


  //Get Event by ID
  async getEventById(eventId, currentUserId) {
        return EventRepository.findById(eventId, currentUserId);
  }
    
  async getAllEvents(reqBody) {
        return EventRepository.findPublicEvents(reqBody);
  }

  // Edit an existing event
  async  editEvent(eventId, updates, userId) {
    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

 if (event.organizerId.toString() !== userId.toString()) {
  throw new Error('Unauthorized to edit this event');
}
    // Update allowed fields only (optional: whitelist fields)
    const allowedUpdates = [
      'title', 'description', 'locations', 'dates',
      'categories', 'bannerImages', 'isLive', 'access',
      'price', 'maxAttendees', 'tags', 'services','settings'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        event[key] = updates[key];
      }
    });

    // Save and return updated event
    return event.save();
  }

  async searchEvents(query, page, limit ) {
        return EventRepository.searchPublicEvents(query, page, limit);
  }

  // Soft delete an event  
  async softDeleteEvent(eventId, userId) {
    const event = await Event.findById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.organizerId || !event.organizerId.equals(userId)) {
      throw new Error("Unauthorized: You are not the organizer");
    }

    event.isDeleted = true;
    await event.save();

    return { message: "Event soft-deleted successfully" };
  }

// Like and dislike events

  async likeEvent(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    await event.like(userId);
    return { success: true, message: 'Event liked' };
  }

  async dislikeEvent(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');
    await event.unlike(userId);
    return { success: true, message: 'Event unliked' };
  }

  // Vote for a location or date option
  async voteOnOption(eventId, type, index, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    // Call schema method
    return event.vote(type, index, userId);
  }

  // Unvote for a location or date option
  async unvoteOnOption(eventId, type, index, userId) {
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    // Call schema method
    return event.unvote(type, index, userId);
  }


async inviteUsersToEvent(eventId, inviterId, userIds) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const isOrganizer = event.organizerId?.toString() === inviterId.toString();
  const isTeamMember = event.team?.has(inviterId.toString());
  if (!isOrganizer && !isTeamMember) {
    throw new Error('Unauthorized to invite users');
  }

  await event.inviteUsers(userIds, inviterId); // Add users to the invite list

  // Optional: fetch inviter name
  const inviter = await User.findById(inviterId);
  const inviterName = inviter?.name || 'Someone';

  // Send notification to each invited user
  for (const userId of userIds) {
    await registerNotification({
      type: 'event_invite',
      title: 'Event Invitation',
      message: `${inviterName} invited you to join an event.`,
      receiverId: userId,
      senderId: inviterId,
      metadata: { eventId, inviterId }
    });
  }

  return event;
}


//Cancel Invite
async cancelUserInvites(eventId, adminId, userIds) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const isOrganizer = event.organizerId?.toString() === adminId.toString();
  const isTeamMember = event.team?.has(adminId.toString());

  if (!isOrganizer && !isTeamMember) {
    throw new Error('Unauthorized to cancel invites');
  }

  const cancelled = await event.cancelInvites(userIds, adminId);
  return cancelled;
}


// Respond to Event Invite
  async respondToEventInvite(eventId, userId, status) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  await event.respondToInvite(userId, status); // schema method
  return event;
  }


// Get My Events
async getMyEvents(userId, page = 1, limit = 10) {
  const user = await User.findById(userId).populate({
    path: 'myEventIds',
    select: 'title dates categories bannerImages locations organizerId organizerName likesCount description dateTBA locationTBA', // ✅ only return these fields from Event
    options: {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit: limit
    }
  });

  if (!user) throw new Error('User not found');

  return {
    events: user.myEventIds,
    pagination: {
      page,
      limit,
      total: user.myEventIds.length // ⚠️ This is just the length of *this page's* events, not total count
    }
  };
}


//Image Upload
async addEventMedia(eventId, files, userId) {
  // Collect URLs for all uploaded files
  const uniqueFileNames = await Promise.all(files.map(async (file) => {
    const uniqueFileName = `media/events/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
    return uploadResult.Location; // Collect the URL for each file
  }));

  // Find the event and check if the user is authorized
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error('Unauthorized to edit this event');
  }

  // Replace the entire bannerImages array with the new list of URLs
  event.bannerImages = uniqueFileNames;

  // Save the updated event
  await event.save();

  return uniqueFileNames;  // Return the updated list of URLs
}


async deleteEventMedia(eventId, mediaUrl, userId) {
  await FileUploadService.deleteFromS3(mediaUrl);
  return this.editEvent(eventId, { $pull: { bannerImages: mediaUrl }, userId });
}




async getUserInvitedEvents(userId) {
  return await Event.find({
    [`rsvps.${userId}.status`]: 'invited' // ✅ Match only if RSVP status is 'invited'
  })
  .select('title dates categories bannerImages locations organizerId organizerName likesCount description dateTBA locationTBA') // ✅ Limit fields here
  .lean({ virtuals: true });
}



///Team Functions

async joinEventTeam(eventId, userId, role, location) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  event.team.set(userId.toString(), {
    role,
    location: location || null,
    isOnline: true,
    sharingLocation: false,
    lastSeen: new Date(),
  });

  await event.save();
  return event;
}

async updateTeamLocation(eventId, userId, lat, long) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  if (!event.team?.has(userId.toString())) {
    throw new Error('User not part of event team');
  }

  const teamMember = event.team.get(userId.toString());
  teamMember.location = { lat, long };
  teamMember.lastLocationUpdate = new Date();

  event.team.set(userId.toString(), teamMember);
  await event.save();

  return event;
}

async toggleLocationSharing(eventId, userId, sharing) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const member = event.team.get(userId.toString());
  if (!member) throw new Error('User not in team');

  member.sharingLocation = sharing;
  event.team.set(userId.toString(), member);
  await event.save();

  return event;
}

async updateOnlineStatus(eventId, userId, isOnline) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const member = event.team.get(userId.toString());
  if (!member) throw new Error('User not in team');

  member.isOnline = isOnline;
  member.lastSeen = new Date();
  event.team.set(userId.toString(), member);

  await event.save();
  return event;
}

async removeTeamMember(eventId, removerId, targetUserId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const isOrganizer = event.organizerId?.toString() === removerId.toString();
  if (!isOrganizer) throw new Error('Only organizer can remove team members');

  event.team.delete(targetUserId.toString());
  await event.save();

  return event;
}


async updateTeamMemberRole(eventId, userId, newRole) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const member = event.team.get(userId.toString());
  if (!member) throw new Error('User not in team');

  member.role = newRole;
  event.team.set(userId.toString(), member);

  await event.save();

  // Optional: fetch event title or name
  const eventName = event.title || 'an event';

  // Notify the user about their updated role
  await registerNotification({
    type: 'role_update',
    title: 'Role Updated',
    message: `Your role in ${eventName} has been updated to "${newRole}".`,
    receiverId: userId,
    senderId: event.organizerId || null,
    metadata: {
      eventId,
      newRole,
    }
  });

  return event;
}





}

export default new EventService();
