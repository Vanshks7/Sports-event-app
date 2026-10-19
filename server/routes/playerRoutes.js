/**
 * PLAYER & PROFILE API ROUTES
 * Community Multisports Booking Portal
 */

const express = require('express');
const router = express.Router();
const playerService = require('../services/playerService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/players/profile
 * Get authenticated user's own profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await playerService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/players/:id
 * Retrieve profile by ID (Self, Coordinator, or Admin)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const isSelf = req.user.id === req.params.id || req.user.playerId === req.params.id;
    const isStaff = ['COORDINATOR', 'ADMIN'].includes(req.user.role);

    if (!isSelf && !isStaff) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to view other players\' complete profiles.'
      });
    }

    const profile = await playerService.getProfile(req.params.id);
    res.json(profile);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/players/:id
 * Update player profile (Self or Admin)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await playerService.updateProfile(req.params.id, req.body, req.user);
    res.json({
      message: 'Profile updated successfully.',
      profile: updated
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/players/:id/bookings
 * Retrieve confirmed bookings history for player
 */
router.get('/:id/bookings', authenticateToken, async (req, res) => {
  try {
    const isSelf = req.user.id === req.params.id || req.user.playerId === req.params.id;
    const isStaff = ['COORDINATOR', 'ADMIN'].includes(req.user.role);

    if (!isSelf && !isStaff) {
      return res.status(403).json({
        error: 'Forbidden: You cannot view booking histories for other members.'
      });
    }

    const bookings = await playerService.getPlayerBookings(req.params.id);
    res.json(bookings);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
