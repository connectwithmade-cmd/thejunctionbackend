import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import BookingService from '../../application/services/BookingService.js';

const router = express.Router();

// 1. Book a Service
router.post('/book', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.bookService(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 2. Vendor Accepts Booking
router.post('/accept', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.acceptBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 3. Vendor Rejects Booking
router.post('/reject', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.rejectBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 4. Client Sends Counter Offer
router.post('/counter', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.counterOfferBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 5. Client Confirms Final Price
router.post('/confirm', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.confirmBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 6. Bookings Made by Client
router.get('/client', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.getMyBookingsAsClient(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 7. Bookings Received by Vendor
router.get('/vendor', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await BookingService.getMyBookingsAsVendor(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});

// 8. Get Bookings by Service ID (public/admin)
router.get('/service/:serviceId', async (req, res) => {
  const result = await BookingService.getBookingsByServiceId(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  }
  return res.status(200).json({ success: true, data: result });
});

export default router;
