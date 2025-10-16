import Booking from '../../domain/models/Booking.js';
import Service from '../../domain/models/Service.js';
import User from '../../domain/models/User.js';

const BookingService = {
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
        isNegotiable: service.pricingMode === 'negotiable'
      });
      await booking.save();

      await User.findByIdAndUpdate(userId, {
        $push: { myBookings: booking._id }
      });

      await User.findByIdAndUpdate(service.vendorId, {
        $push: { receivedBookings: booking._id }
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
      return booking;
    } catch (err) {
      return { error: err.message };
    }
  },

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

      return booking;
    } catch (err) {
      return { error: err.message };
    }
  },

  async markBookingAsPaid(bookingId) {
    try {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentDone: true
      });
    } catch (err) {
      return { error: err.message };
    }
  },

  async getBookingsByServiceId(req, res) {
    const { serviceId } = req.params;

    try {
      const bookings = await Booking.find({ serviceId }).populate('userId', 'name email');
      return CommonResponse.success(res, bookings);
    } catch (err) {
      return CommonResponse.error(res, err.message, 500);
    }
  },

  async getMyBookingsAsClient(req, res) {
    const userId = req.user.id;

    try {
  const bookings = await Booking.find({ userId })
    .populate({
      path: 'serviceId',
      select: 'title vendorId',
      populate: {
        path: 'vendorId',
        select: 'name email',
      },
    })
    .populate({
      path: 'userId',
      select: 'name username',
    });

  return bookings;
} catch (err) {
  return { error: err.message };
}

  },

  async getMyBookingsAsVendor(req, res) {
    const vendorId = req.user.id;

    try {
      const myServices = await Service.find({ vendorId }, '_id');
      const myServiceIds = myServices.map(service => service._id);

      const bookings = await Booking.find({ serviceId: { $in: myServiceIds } })
        .populate('userId', 'name email')
        .populate('serviceId', 'title');

      return bookings;
    } catch (err) {
      return { error: err.message };
    }
  }
};

export default BookingService;
