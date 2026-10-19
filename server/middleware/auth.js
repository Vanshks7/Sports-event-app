/**
 * AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Community Multisports Booking Portal
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../database/db');

const authMiddleware = {
  /**
   * Verify JWT and attach authenticated user to request
   */
  async authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : (req.headers['x-access-token'] || req.cookies?.token);

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. No session token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);

      // Verify user is not suspended in database
      const user = await db.get(
        'SELECT id, player_id, role, status FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!user) {
        return res.status(401).json({ error: 'User account no longer exists.' });
      }

      if (user.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'User account has been suspended.' });
      }

      req.user = {
        id: user.id,
        playerId: user.player_id,
        role: user.role,
        status: user.status,
        fullName: decoded.fullName,
        email: decoded.email
      };

      next();
    } catch (err) {
      return res.status(401).json({
        error: 'Invalid or expired session token. Please sign in again.'
      });
    }
  },

  /**
   * Require one of specified roles (e.g. 'ADMIN', 'COORDINATOR')
   */
  requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] permissions.`
        });
      }

      next();
    };
  },

  /**
   * Enforce that a user can only access/modify their own resource unless they are an ADMIN
   */
  requireSelfOrAdmin(paramKey = 'id') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const targetId = req.params[paramKey] || req.body?.userId;
      const isSelf = req.user.id === targetId || req.user.playerId === targetId;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          error: 'Forbidden: You do not have permission to access or modify another player\'s data.'
        });
      }

      next();
    };
  }
};

module.exports = authMiddleware;
