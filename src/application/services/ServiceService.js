import Service from '../../domain/models/Service.js';
import Booking from '../../domain/models/Booking.js';
import User from '../../domain/models/User.js';
import { registerNotification } from '../../application/services/NotificationService.js'; // adjust path as needed
import {v4 as uuidv4} from 'uuid';
import FileUploadService from "./FileUploadService.js";




const ServiceService = {
  // 1. Create Service
  async createService(data) {
    const service = new Service(data);
    return await service.save();
  },


async getServiceById(serviceId, userId) {
const service = await Service.findById(serviceId)
    .populate({
      path: 'vendorId',
      select: '_id firstName lastName userName userType'
    })
    .lean();  if (!service) return null;

  // Extract ratings
  const ratings = service.ratings || {};
  const userRatings = ratings.userRatings || {};
  const avgRating = ratings.avgRating || 0;
  const userRating = userRatings[userId] || null;

  const isVendor = service.vendorId.toString() === userId.toString();

  // 🔢 Booking Stats for Vendor
  let bookingStats = null;
  if (isVendor) {
    const statusCounts = await Booking.aggregate([
      { $match: { serviceId: service._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const counts = {
      total: 0,
      pending: 0,
      countered: 0,
      accepted: 0,
      confirmed: 0
    };

    statusCounts.forEach(stat => {
      counts.total += stat.count;
      if (['pending', 'countered', 'accepted', 'confirmed'].includes(stat._id)) {
        counts[stat._id] = stat.count;
      }
    });

    bookingStats = counts;
  }

  // 🧹 Fields to return
  const publicFields = {
    _id: service._id,
    title: service.title,
    category: service.category,
    description: service.description,
    basePrice: service.basePrice,
    pricingType: service.pricingType,
    pricingMode: service.pricingMode,
    images: service.images,
    addons: service.addons,
    inclusions: service.inclusions,
    exclusions: service.exclusions,
    availability: service.availability,
    locationAvailable: service.locationAvailable,
    cancellationPolicy: service.cancellationPolicy,
    termsAndConditions: service.termsAndConditions,
    customTags: service.customTags,
    isPublished: service.isPublished,
    avgRating,
    userRating,
    vendorId: service.vendorId,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };

  // ✨ Extra fields for vendors
  const vendorOnlyFields = {
    settings: service.settings,
    ratings: service.ratings, // full map
    maxBookingsPerDay: service.maxBookingsPerDay,
    setupTimeBufferHours: service.setupTimeBufferHours,
    bookingStats,
    isVendor: true,
  };

  return isVendor
    ? { ...publicFields, ...vendorOnlyFields }
    : publicFields;
}
,


  // 3. Get All Published Services with optional filters
  async getAllPublishedServices(filters = {}) {
  const query = { isPublished: true };

  if (filters.category) query.category = filters.category;
  if (filters.city) query['locationAvailable.cities'] = filters.city;
  if (filters.vendorId) query.vendorId = filters.vendorId;

  return await Service.find(query)
    .select('title locationAvailable images vendorId basePrice ratings avgRating customTags')
    .populate({
      path: 'vendorId',
      select: '_id firstName lastName userName userType'
    })
    .lean();
  },


  // 4. Edit Service
  async editService(serviceId, updates, vendorId) {
    const service = await Service.findOneAndUpdate(
      { _id: serviceId, vendorId },
      { $set: updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!service) throw new Error('Service not found or not authorized.');
    return service;
  },

  // 5. Rate or Unrate Service
async rateOrUnrateService(serviceId, userId, ratingValue) {
  const service = await Service.findById(serviceId);

  if (!service) {
    throw new Error("Service not found");
  }

  if (!service.ratings) {
    service.ratings = { avgRating: 0, userRatings: new Map() };
  }

  // Set or remove rating
  if (ratingValue === null) {
    service.ratings.userRatings.delete(userId);
  } else {
    service.ratings.userRatings.set(userId, ratingValue);
  }

  // Recalculate average
  const ratingsArray = Array.from(service.ratings.userRatings.values());
  const total = ratingsArray.reduce((sum, r) => sum + r, 0);
  const avg = ratingsArray.length ? total / ratingsArray.length : 0;

  service.ratings.avgRating = parseFloat(avg.toFixed(2));

  await service.save();
  return {
    avgRating: service.ratings.avgRating,
    userRating: service.ratings.userRatings.get(userId) ?? null,
  };
},



  // 5. Soft Delete (Unpublish) Service
  async unpublishService(serviceId, vendorId) {
    const result = await Service.findOneAndUpdate(
      { _id: serviceId, vendorId },
      { $set: { isPublished: false, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!result) throw new Error('Service not found or not authorized.');
    return { message: 'Service unpublished successfully.' };
  },

  // 6. Search Services
  async searchServices({ query = '', page = 1, limit = 10 }) {
  const searchConditions = { isPublished: true };

  if (query) {
    const regex = new RegExp('^' + query, 'i'); // starts with query, case-insensitive
    searchConditions.$or = [
      { title: regex },
      { category: regex },
      { 'locationAvailable.cities': query }  // exact match in cities array
    ];
  }

  const services = await Service.find(searchConditions)
    .skip((page - 1) * limit)
    .limit(limit);

  return services;
}
,


  // 7. Get Services by Vendor (no .lean())
async getVendorServices(vendorId) {
  return await Service.find({ 
    vendorId, 
    isPublished: true 
  });
},

async getMyServices(vendorId) {
  return await Service.find({ vendorId })
    .select('title locationAvailable images vendorId basePrice ratings avgRating customTags')
    .populate({
      path: 'vendorId',
      select: '_id firstName lastName userName userType'
    })
    ;
},




async bookService(req, res) {
  const { serviceId, selectedDates, addons, inquiryMessage } = req.body;
  const userId = req.user.id;

  try {
    const service = await Service.findById(serviceId);
    if (!service) return { message: 'Service not found' };

    const booking = new Booking({
      serviceId,
      userId,
      selectedDates,
      addons,
      inquiryMessage,
      isNegotiable: service.pricingMode === 'negotiable',
    });
    await booking.save();

    // Add to user's own bookings
    await User.findByIdAndUpdate(userId, {
      $push: { myBookings: booking._id },
    });

    // Add to vendor's received bookings
    await User.findByIdAndUpdate(service.vendorId, {
      $push: { receivedBookings: booking._id },
    });

    // 🔔 Send notification to the vendor
    await registerNotification({
      type: 'service_inquiry',
      title: 'New Service Inquiry',
      message: `You have received a new inquiry for "${service.title}".`,
      receiverId: service.vendorId,
      senderId: userId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });

    return { bookingId: booking._id };
  } catch (err) {
    return { error: err.message };
  }
},
async acceptBooking(req, res) {
  const { bookingId, finalPrice, adminMessage } = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'accepted',
        finalPrice,
        adminMessage
      },
      { new: true }
    );

    if (!booking) return { error: 'Booking not found' };

    const service = await Service.findById(booking.serviceId);

    // 🔔 Notify user
    await registerNotification({
      type: 'booking_update',
      title: 'Booking Accepted',
      message: `Your booking for "${service.title}" has been accepted.`,
      receiverId: booking.userId,
      senderId: service.vendorId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });

    return booking;
  } catch (err) {
    return { error: err.message };
  }
},


async rejectBooking(req, res) {
  const { bookingId, adminMessage } = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'rejected',
        adminMessage
      },
      { new: true }
    );

    if (!booking) return { error: 'Booking not found' };

    const service = await Service.findById(booking.serviceId);

    // 🔔 Notify user
    await registerNotification({
      type: 'booking_update',
      title: 'Booking Rejected',
      message: `Your booking for "${service.title}" was rejected.`,
      receiverId: booking.userId,
      senderId: service.vendorId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });

    return booking;
  } catch (err) {
    return { error: err.message };
  }
}
,
async counterOfferBooking(req, res) {
  const { bookingId, counterOffer, message } = req.body;
  const userId = req.user.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return { error: 'Booking not found' };
    if (booking.userId.toString() !== userId) {
      return { error: 'Unauthorized', status: 403 };
    }

    booking.status = 'countered';
    booking.userResponse = {
      accepted: false,
      counterOffer,
      message
    };
    await booking.save();

    const service = await Service.findById(booking.serviceId);

    // 🔔 Notify vendor
    await registerNotification({
      type: 'booking_response',
      title: 'Counter Offer Submitted',
      message: `User submitted a counter offer for "${service.title}".`,
      receiverId: service.vendorId,
      senderId: booking.userId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });

    return booking;
  } catch (err) {
    return { error: err.message };
  }
},


async confirmBooking(req, res) {
  const { bookingId } = req.body;
  const userId = req.user.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return { error: 'Booking not found' };
    if (booking.userId.toString() !== userId) {
      return { error: 'Unauthorized', status: 403 };
    }

    booking.status = 'confirmed';
    booking.userResponse = { accepted: true };
    await booking.save();

    const service = await Service.findById(booking.serviceId);

    // 🔔 Notify vendor
    await registerNotification({
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: `User confirmed the booking for "${service.title}".`,
      receiverId: service.vendorId,
      senderId: booking.userId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });

    return booking;
  } catch (err) {
    return { error: err.message };
  }
},


async markBookingAsPaid(bookingId) {
  const booking = await Booking.findByIdAndUpdate(bookingId, {
    paymentDone: true
  }, { new: true });

  if (booking) {
    const service = await Service.findById(booking.serviceId);

    // 🔔 Notify vendor
    await registerNotification({
      type: 'booking_payment',
      title: 'Payment Completed',
      message: `Payment has been completed for "${service.title}".`,
      receiverId: service.vendorId,
      senderId: booking.userId,
      metadata: {
        bookingId: booking._id,
        serviceId: service._id
      }
    });
  }
},



async  getBookingsByServiceId(req, res) {
  const { serviceId } = req.params;

  try {
    const bookings = await Booking.find({ serviceId }).populate('userId', 'name email');
    return CommonResponse.success(res, bookings);
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async  getMyBookingsAsClient(req, res) {
  const userId = req.user.id;

  try {
    const bookings = await Booking.find({ userId })
      .populate('serviceId', 'title vendorId')
      .populate({
        path: 'serviceId',
        populate: { path: 'vendorId', select: 'name email' },
      });

    return bookings;
  } catch (err) {
    return { error: err.message };
  }
},

async  getMyBookingsAsVendor(req, res) {
  const vendorId = req.user.id;

  try {
    const myServices = await Service.find({ vendorId }, '_id');
    const myServiceIds = myServices.map(service => service._id);

    const bookings = await Booking.find({ serviceId: { $in: myServiceIds } })
      .populate('userId', 'name email')
      .populate('serviceId', 'title');

    return  bookings;
  } catch (err) {
    return  {error: err.message};
  }
},






async addServiceMedia(serviceId, files, userId) {
  // Collect URLs for all uploaded files
  const uniqueFileNames = await Promise.all(files.map(async (file) => {
    const uniqueFileName = `media/services/${uuidv4()}_${file.originalname}`;
    const uploadResult = await FileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
    return uploadResult.Location; // Collect the URL for each file
  }));

  // Find the service and check if the user is authorized
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error('Service not found');
  }

  if (service.vendorId.toString() !== userId.toString()) {
    throw new Error('Unauthorized to edit this service');
  }

  // Replace the entire images array with the new list of URLs
  service.images = uniqueFileNames;

  // Save the updated service
  await service.save();

  return uniqueFileNames;  // Return the updated list of URLs
},


async deleteServiceMedia(serviceId, mediaUrl) {
  await FileUploadService.deleteFromS3(mediaUrl);
  return this.updateServiceById(serviceId, { $pull: { images: mediaUrl } });
}






};

export default ServiceService;
