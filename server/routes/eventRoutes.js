/**
 * EVENT MANAGEMENT API ROUTES
 * Community Multisports Booking Portal
 */

const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService');
const bookingService = require('../services/bookingService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Optional authentication middleware to attach req.user if a token is present
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    req.user = null;
    return next();
  }
  authenticateToken(req, res, () => next());
}

/**
 * GET /api/events
 * Public listing of events with real-time capacity and attendance stats
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const isStaff = req.user && ['ADMIN', 'COORDINATOR'].includes(req.user.role);
    
    const events = await eventService.getEvents({
      status,
      search,
      includeDrafts: isStaff
    });

    res.json({
      count: events.length,
      events
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/events/:id
 * Retrieve single event details, including user attendance & bookings if authenticated
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const event = await eventService.getEventById(req.params.id, userId);

    if (!event) {
      return res.status(404).json({ error: `Event '${req.params.id}' not found.` });
    }

    res.json(event);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/events/:id/slots
 * Retrieve full 30-minute court slots matrix with live capacity
 */
router.get('/:id/slots', optionalAuth, async (req, res) => {
  try {
    const { sport } = req.query;
    const slots = await bookingService.getEventSlots(req.params.id, sport);
    res.json({
      eventId: req.params.id,
      count: slots.length,
      slots
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/attendance
 * Confirm or decline event-wise attendance (Player only)
 */
router.post('/:id/attendance', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Attendance status (CONFIRMED or DECLINED) is required.' });
    }

    const result = await eventService.confirmAttendance(req.params.id, req.user.id, status);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/events/:id/attendance
 * Retrieve event attendance list (Staff or attendees)
 */
router.get('/:id/attendance', authenticateToken, requireRole('COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const list = await eventService.getAttendanceList(req.params.id);
    res.json({
      eventId: req.params.id,
      count: list.length,
      attendees: list
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events
 * Create new event (Admin only)
 */
router.post('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const newEvent = await eventService.createEvent(req.body, req.user);
    res.status(201).json({
      message: 'Event created successfully with auto-generated court slots.',
      event: newEvent
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/events/:id
 * Edit event details, validated against existing bookings (Admin only)
 */
router.put('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const updated = await eventService.updateEvent(req.params.id, req.body, req.user);
    res.json({
      message: 'Event updated successfully.',
      event: updated
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/publish
 * Publish event (Admin only)
 */
router.post('/:id/publish', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const published = await eventService.publishEvent(req.params.id, req.user);
    res.json({
      message: 'Event published successfully.',
      event: published
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/postpone
 * Postpone event (Admin only)
 */
router.post('/:id/postpone', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const postponed = await eventService.postponeEvent(req.params.id, req.body, req.user);
    res.json({
      message: 'Event postponed successfully.',
      event: postponed
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/cancel
 * Cancel event and cascade cancellations to confirmed bookings (Admin only)
 */
router.post('/:id/cancel', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body;
    const cancelled = await eventService.cancelEvent(req.params.id, reason, req.user);
    res.json({
      message: 'Event cancelled. All active player bookings have been cancelled.',
      event: cancelled
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/archive
 * Archive event (Admin only)
 */
router.post('/:id/archive', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const archived = await eventService.archiveEvent(req.params.id, req.user);
    res.json({
      message: 'Event archived.',
      event: archived
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
