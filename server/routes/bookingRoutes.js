/**
 * BOOKINGS & WAITLIST API ROUTES
 * Community Multisports Booking Portal
 */

const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/bookings
 * Concurrency-safe slot reservation (with auto-waitlist fallback)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { slotId } = req.body;
    if (!slotId) {
      return res.status(400).json({ error: 'slotId is required.' });
    }

    const result = await bookingService.createBooking({
      slotId,
      userId: req.user.id
    });

    const statusCode = result.status === 'CONFIRMED' ? 201 : 200;
    res.status(statusCode).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message,
      code: err.code || null,
      queuePosition: err.queuePosition || null
    });
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel confirmed booking (restores quota, promotes waitlist player)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await bookingService.cancelBooking(req.params.id, req.user, {
      reason: reason || 'Player self-cancellation'
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * DELETE /api/bookings/waitlist/:id
 * Leave waitlist queue
 */
router.delete('/waitlist/:id', authenticateToken, async (req, res) => {
  try {
    const result = await bookingService.leaveWaitlist(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
