/**
 * AUTHENTICATION API ROUTES
 * Community Multisports Booking Portal
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * One-time permanent player registration
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, gender, dateOfBirth, ageGroup, emergencyContact, sports, skillLevel, password } = req.body;

    if (!fullName || !email || !phone || !gender) {
      return res.status(400).json({
        error: 'Missing required fields: fullName, email, phone, and gender are mandatory.'
      });
    }

    const result = await authService.registerPlayer({
      fullName,
      email,
      phone,
      gender,
      dateOfBirth,
      ageGroup,
      emergencyContact,
      sports,
      skillLevel,
      password
    });

    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message,
      existingPlayerId: err.existingPlayerId
    });
  }
});

/**
 * POST /api/auth/login
 * Sign in with Player ID or Email + Password
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Identifier (Player ID or Email) and password are required.'
      });
    }

    const result = await authService.login(identifier, password);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/auth/setup-password
 * Complete password setup via cryptographic token
 */
router.post('/setup-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and newPassword are required.'
      });
    }

    const result = await authService.setupPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Retrieve authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
