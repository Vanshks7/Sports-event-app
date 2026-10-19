/**
 * ADMINISTRATOR & SYSTEM GOVERNANCE SERVICE
 * Community Multisports Booking Portal
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const config = require('../config/env');
const authService = require('./authService');

const adminService = {
  /**
   * Check if the database needs an initial administrator
   */
  async isInitialAdminSetupNeeded() {
    const admin = await db.get("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    return !admin;
  },

  /**
   * Secure initial administrator setup process
   * Permanently locks as soon as the first admin is created
   */
  async setupInitialAdmin({ fullName, email, phone, password, setupSecret }) {
    const needed = await this.isInitialAdminSetupNeeded();
    if (!needed) {
      const err = new Error('Initial admin setup is permanently locked. A system administrator account already exists.');
      err.status = 403;
      throw err;
    }

    // Verify bootstrap secret token
    if (!setupSecret || setupSecret !== config.adminSetupSecret) {
      const err = new Error('Invalid administrator setup secret token.');
      err.status = 401;
      throw err;
    }

    if (!password || password.length < 10) {
      const err = new Error('Administrator password must be at least 10 characters long.');
      err.status = 400;
      throw err;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = 'usr_admin_' + crypto.randomUUID().replace(/-/g, '');
    const playerId = 'ADM1001';

    await db.transaction(async () => {
      await db.run(
        `INSERT INTO users (
          id, player_id, full_name, email, phone, gender,
          password_hash, role, status
        ) VALUES (?, ?, ?, ?, ?, 'OTHER', ?, 'ADMIN', 'ACTIVE')`,
        [userId, playerId, fullName.trim(), cleanEmail, cleanPhone, passwordHash]
      );

      await db.run(
        `INSERT INTO audit_logs (id, user_id, action, payload) VALUES (?, ?, 'INITIAL_ADMIN_BOOTSTRAPPED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          userId,
          JSON.stringify({ email: cleanEmail, playerId })
        ]
      );
    });

    const admin = await authService.getUserById(userId);
    const token = authService.generateJwt(admin);

    return {
      admin,
      token,
      message: 'System root administrator account created successfully. Initial setup is now locked.'
    };
  },

  /**
   * Retrieve all players for organiser/admin directory
   */
  async getAllPlayers({ search = '', role = '', status = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT u.id, u.player_id, u.full_name, u.email, u.phone, u.gender,
             u.age_group, u.role, u.status, u.created_at,
             p.plays_pickleball, p.plays_paddle, p.plays_box_cricket
      FROM users u
      LEFT JOIN player_preferences p ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.player_id) LIKE ? OR u.phone LIKE ?)`;
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term, `%${search}%`);
    }

    if (role) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }

    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.all(sql, params);
  },

  /**
   * Update a player's role (ADMIN only)
   * Protects against demoting the last remaining administrator (system lockout guard).
   */
  async updatePlayerRole(targetUserId, newRole, requestingAdmin) {
    if (!['PLAYER', 'COORDINATOR', 'ADMIN'].includes(newRole)) {
      const err = new Error('Invalid role specified.');
      err.status = 400;
      throw err;
    }

    // Guard: never allow demoting the last remaining ADMIN (bootstrap is permanently locked)
    if (newRole !== 'ADMIN') {
      const target = await db.get('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
      if (target && target.role === 'ADMIN') {
        const adminCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'`);
        if (adminCount.count <= 1) {
          const err = new Error('Cannot demote the last remaining administrator. At least one ADMIN account must remain.');
          err.status = 403;
          throw err;
        }
      }
    }

    await db.run(
      `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`,
      [newRole, targetUserId]
    );

    await db.run(
      `INSERT INTO audit_logs (id, user_id, action, payload) VALUES (?, ?, 'USER_ROLE_CHANGED', ?)`,
      [
        'aud_' + crypto.randomUUID().replace(/-/g, ''),
        targetUserId,
        JSON.stringify({ newRole, changedBy: requestingAdmin.playerId })
      ]
    );

    return authService.getUserById(targetUserId);
  },

  /**
   * Suspend or activate a player account (ADMIN or COORDINATOR)
   * Protects against suspending the last remaining administrator (system lockout guard).
   */
  async updatePlayerStatus(targetUserId, newStatus, requestingAdmin) {
    if (!['ACTIVE', 'SUSPENDED'].includes(newStatus)) {
      const err = new Error('Invalid status. Must be ACTIVE or SUSPENDED.');
      err.status = 400;
      throw err;
    }

    // Guard: never allow suspending the last remaining ADMIN (system lockout guard)
    if (newStatus === 'SUSPENDED') {
      const target = await db.get('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
      if (target && target.role === 'ADMIN') {
        const adminCount = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'`);
        if (adminCount.count <= 1) {
          const err = new Error('Cannot suspend the last remaining administrator. At least one ADMIN account must remain active.');
          err.status = 403;
          throw err;
        }
      }
    }

    await db.run(
      `UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [newStatus, targetUserId]
    );

    await db.run(
      `INSERT INTO audit_logs (id, user_id, action, payload) VALUES (?, ?, 'USER_STATUS_CHANGED', ?)`,
      [
        'aud_' + crypto.randomUUID().replace(/-/g, ''),
        targetUserId,
        JSON.stringify({ newStatus, changedBy: requestingAdmin.playerId })
      ]
    );

    return authService.getUserById(targetUserId);
  },

  /**
   * Get operational overview statistics for admin dashboard
   */
  async getDashboardMetrics() {
    const totalUsers = await db.get(`SELECT COUNT(*) as count FROM users`);
    const activePlayers = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'PLAYER' AND status = 'ACTIVE'`);
    const pickleballCount = await db.get(`SELECT COUNT(*) as count FROM player_preferences WHERE plays_pickleball = 1`);
    const paddleCount = await db.get(`SELECT COUNT(*) as count FROM player_preferences WHERE plays_paddle = 1`);
    const cricketCount = await db.get(`SELECT COUNT(*) as count FROM player_preferences WHERE plays_box_cricket = 1`);

    return {
      totalUsers: totalUsers.count,
      activePlayers: activePlayers.count,
      sportsDemand: {
        pickleball: pickleballCount.count,
        paddleBall: paddleCount.count,
        boxCricket: cricketCount.count
      }
    };
  }
};

module.exports = adminService;
