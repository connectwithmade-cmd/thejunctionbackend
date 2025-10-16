import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import ServiceService from '../../application/services/ServiceService.js';
import User from '../../domain/models/User.js';

const router = express.Router();

// 1. Create Service
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const serviceData = {
      ...req.body,
      vendorId: req.user.id,
    };

    try {
      const service = await ServiceService.createService(serviceData);

      // Optionally add service ID to user
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { myServiceIds: service._id } },
        { new: true }
      );

      CommonResponse.success(res, { id: service._id.toString() });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 2. Get Service by ID (Public)
router.get('/public/:id',passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const serviceId = req.params.id;
    const currentUserId = req.user?._id;
 try {
    
    const service = await ServiceService.getServiceById(serviceId, currentUserId);
    CommonResponse.success(res, service);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 3. Get All Public Services
router.post('/public', async (req, res) => {
  try {
    const services = await ServiceService.getAllPublishedServices(req.body);
    CommonResponse.success(res, services);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 4. Get my Services (Vendor)
router.get('/myServices',  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
  const vendorId = req.user?._id;
;
  try {
    const services = await ServiceService.getMyServices(vendorId);
    CommonResponse.success(res, services);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 4. Get Services by Vendor
router.get('/vendor/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  try {
    const services = await ServiceService.getVendorServices(vendorId);
    CommonResponse.success(res, services);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 5. Edit Service
router.put(
  '/:serviceId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { serviceId } = req.params;
    const updates = req.body;

    try {
      const updatedService = await ServiceService.editService(serviceId, updates, req.user.id);
      CommonResponse.success(res, updatedService);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 6. Soft Delete Service
router.delete(
  '/:serviceId',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { serviceId } = req.params;

    try {
      const result = await ServiceService.unpublishService(serviceId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 7. Search Services (Public)
router.get('/search', async (req, res) => {
  const { query = '', page = '1', limit = '10' } = req.query;

  try {
    const result = await ServiceService.searchServices({
      query,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    CommonResponse.success(res, result);
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

// 8. Book a Service (User Inquiry)
router.post('/book', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const result = await ServiceService.bookService(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
});


// 9. Admin Accepts Booking
router.post(
  '/booking/accept',
  passport.authenticate('jwt', { session: false }), // ensure only admin or vendor
  async (req, res) => {


    const result = await ServiceService.acceptBooking(req, res);;
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
    
  }
);

// 10. Admin Rejects Booking
router.post(
  '/booking/reject',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
     const result = await ServiceService.rejectBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });

  }
);

// 11. User Counter Offer
router.post(
  '/booking/counter',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {

       const result = await ServiceService.counterOfferBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });

    
  }
);

// 12. User Accepts Final Price (Confirm Booking)
router.post(
  '/booking/confirm',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {

    
       const result =     await ServiceService.confirmBooking(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
    
  }
);

// Bookings made by logged-in user
router.get(
  '/booking/client',
  passport.authenticate('jwt', { session: false }),
 async  (req, res) =>{
    const result = await ServiceService.getMyBookingsAsClient(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });
  } 
);

// Bookings received by vendor (logged-in user)
router.get(
  '/booking/vendor',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {const result = await  ServiceService.getMyBookingsAsVendor(req, res);
  if (result.error) {
    return res.status(500).json({ success: false, message: result.error });
  } else if (result.message) {
    return res.status(404).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, data: result });}
);


// 5. Rate or Unrate Service
router.post(
  '/:serviceId/rate',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { serviceId } = req.params;
    const { rating } = req.body; // Expected: number (e.g. 4.5) or null
    const userId = req.user.id;

    try {
      const service = await ServiceService.rateOrUnrateService({
        serviceId,
        userId,
        rating,
      });

      CommonResponse.success(res, {
        avgRating: service.ratings.avgRating,
        totalRatings: Object.keys(service.ratings.userRatings || {}).length,
      });
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);



export default router;
