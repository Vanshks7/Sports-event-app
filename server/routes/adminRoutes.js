/**
 * ADMINISTRATOR & GOVERNANCE API ROUTES
 * Community Multisports Booking Portal
 */

const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/admin/setup-status
 * Public endpoint to check if initial bootstrap is needed
 */
router.get('/setup-status', async (req, res) => {
  try {
    const needed = await adminService.isInitialAdminSetupNeeded();
    res.json({
      initialAdminNeeded: needed,
      status: needed ? 'BOOTSTRAP_OPEN' : 'PERMANENTLY_LOCKED'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/initial-setup
 * Secure one-time root administrator bootstrapping
 */
router.post('/initial-setup', async (req, res) => {
  try {
    const { fullName, email, phone, password, setupSecret } = req.body;

    if (!fullName || !email || !phone || !password || !setupSecret) {
      return res.status(400).json({
        error: 'All fields (fullName, email, phone, password, setupSecret) are mandatory.'
      });
    }

    const result = await adminService.setupInitialAdmin({
      fullName,
      email,
      phone,
      password,
      setupSecret
    });

    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/admin/players
 * Searchable player directory (COORDINATOR or ADMIN)
 */
router.get('/players', authenticateToken, requireRole('COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const { search, role, status, limit, offset } = req.query;
    const players = await adminService.getAllPlayers({
      search,
      role,
      status,
      limit: parseInt(limit || '50', 10),
      offset: parseInt(offset || '0', 10)
    });
    res.json({
      count: players.length,
      players
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/players/:id/role
 * Update player role (ADMIN only)
 */
router.put('/players/:id/role', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    const updated = await adminService.updatePlayerRole(req.params.id, role, req.user);
    res.json({
      message: 'User role updated successfully.',
      player: updated
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/players/:id/status
 * Suspend or activate player (ADMIN or COORDINATOR)
 */
router.put('/players/:id/status', authenticateToken, requireRole('COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const updated = await adminService.updatePlayerStatus(req.params.id, status, req.user);
    res.json({
      message: 'User status updated successfully.',
      player: updated
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/admin/metrics
 * Overview dashboard metrics (COORDINATOR or ADMIN)
 */
router.get('/metrics', authenticateToken, requireRole('COORDINATOR', 'ADMIN'), async (req, res) => {
  try {
    const metrics = await adminService.getDashboardMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
