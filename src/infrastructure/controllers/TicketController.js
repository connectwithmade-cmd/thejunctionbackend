import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import TicketService from '../../application/services/TicketService.js';

const router = express.Router();

// 1. Add Ticket to Event
router.post(
  '/:id/ticket',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
        const eventId = req.params.id;
    const currentUserId = req.user?._id;
      const result = await TicketService.addTicket(eventId, currentUserId, req.body);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 2. Update Ticket
router.put(
  '/:id/ticket/:tid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const currentUserId = req.user?._id;
      const result = await TicketService.updateTicket(eventId,currentUserId,req.params.tid, req.body);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 3. Delete Ticket
router.delete(
  '/:id/ticket/:tid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
        const eventId = req.params.id;
      const currentUserId = req.user?._id;
      const result = await TicketService.deleteTicket(eventId, currentUserId, req.params.tid);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 4. Purchase Ticket
router.post(
  '/:id/:tid/purchase',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const ticketId = req.params.tid;
      const quantity = req.body.quantity;
      const currentUserId = req.user?._id;

      const result = await TicketService.purchaseTicket(eventId, ticketId, quantity, currentUserId);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 5. Get User Passes
router.get(
  '/user/:id/passes',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await TicketService.getUserPasses(req.params.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

export default router;
