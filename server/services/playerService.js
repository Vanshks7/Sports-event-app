/**
 * PLAYER & PROFILE SERVICE
 * Community Multisports Booking Portal
 */

const crypto = require('crypto');
const db = require('../database/db');
const authService = require('./authService');

const playerService = {
  /**
   * Retrieve player profile by ID
   */
  async getProfile(userId) {
    const profile = await authService.getUserById(userId);
    if (!profile) {
      const err = new Error('Player profile not found.');
      err.status = 404;
      throw err;
    }
    return profile;
  },

  /**
   * Update player profile and sport preferences
   * Restricts tampering with role, status, player_id, or email
   */
  async updateProfile(userId, data, requestingUser) {
    const existing = await authService.getUserById(userId);
    if (!existing) {
      const err = new Error('Player not found.');
      err.status = 404;
      throw err;
    }

    // Role-based security check: only the player themselves or an ADMIN can update
    const isSelf = requestingUser.id === userId;
    const isAdmin = requestingUser.role === 'ADMIN';

    if (!isSelf && !isAdmin) {
      const err = new Error('Unauthorized: You can only update your own player profile.');
      err.status = 403;
      throw err;
    }

    // Check phone uniqueness if phone is updated
    if (data.phone && data.phone.trim() !== existing.phone) {
      const phoneTaken = await db.get(
        'SELECT id FROM users WHERE phone = ? AND id != ?',
        [data.phone.trim(), userId]
      );
      if (phoneTaken) {
        const err = new Error('This phone number is already registered to another account.');
        err.status = 409;
        throw err;
      }
    }

    await db.transaction(async () => {
      // 1. Update basic fields
      const phone = data.phone ? data.phone.trim() : existing.phone;
      const fullName = data.fullName ? data.fullName.trim() : existing.full_name;
      const ageGroup = data.ageGroup !== undefined ? data.ageGroup : existing.age_group;
      const emergencyContact = data.emergencyContact !== undefined ? data.emergencyContact : existing.emergency_contact;

      // Only ADMIN can alter role or status
      let role = existing.role;
      let status = existing.status;
      if (isAdmin) {
        if (data.role && ['PLAYER', 'COORDINATOR', 'ADMIN'].includes(data.role)) {
          role = data.role;
        }
        if (data.status && ['PENDING_PASSWORD', 'ACTIVE', 'SUSPENDED'].includes(data.status)) {
          status = data.status;
        }
      }

      await db.run(
        `UPDATE users SET 
          full_name = ?, phone = ?, age_group = ?, emergency_contact = ?,
          role = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [fullName, phone, ageGroup, emergencyContact, role, status, userId]
      );

      // 2. Update sport preferences if provided
      if (data.sports || data.skillLevel || data.notes !== undefined) {
        const playsPickleball = data.sports ? (data.sports.includes('pickleball') ? 1 : 0) : existing.preferences?.plays_pickleball || 0;
        const playsPaddle = data.sports ? (data.sports.includes('paddle_ball') ? 1 : 0) : existing.preferences?.plays_paddle || 0;
        const playsCricket = data.sports ? (data.sports.includes('box_cricket') ? 1 : 0) : existing.preferences?.plays_box_cricket || 0;

        const skillPickleball = data.skillLevel?.pickleball || existing.preferences?.skill_level_pickleball || 'INTERMEDIATE';
        const skillPaddle = data.skillLevel?.paddle_ball || existing.preferences?.skill_level_paddle || 'INTERMEDIATE';
        const skillCricket = data.skillLevel?.box_cricket || existing.preferences?.skill_level_cricket || 'INTERMEDIATE';
        const notes = data.notes !== undefined ? data.notes : existing.preferences?.notes || null;

        await db.run(
          `INSERT INTO player_preferences (
            user_id, plays_pickleball, plays_paddle, plays_box_cricket,
            skill_level_pickleball, skill_level_paddle, skill_level_cricket, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            plays_pickleball = excluded.plays_pickleball,
            plays_paddle = excluded.plays_paddle,
            plays_box_cricket = excluded.plays_box_cricket,
            skill_level_pickleball = excluded.skill_level_pickleball,
            skill_level_paddle = excluded.skill_level_paddle,
            skill_level_cricket = excluded.skill_level_cricket,
            notes = excluded.notes,
            updated_at = datetime('now')`,
          [
            userId, playsPickleball, playsPaddle, playsCricket,
            skillPickleball, skillPaddle, skillCricket, notes
          ]
        );
      }

      // Log update audit record
      await db.run(
        `INSERT INTO audit_logs (id, user_id, action, payload) VALUES (?, ?, 'PROFILE_UPDATED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          userId,
          JSON.stringify({ updatedBy: requestingUser.playerId, fields: Object.keys(data) })
        ]
      );
    });

    return this.getProfile(userId);
  },

  /**
   * Retrieve all confirmed bookings and event attendance for player
   */
  async getPlayerBookings(userId) {
    return db.all(
      `SELECT b.id as booking_id, b.status as booking_status, b.created_at as booked_at,
              s.slot_start, s.slot_end, s.max_capacity, s.booked_count,
              c.name as court_name, c.court_number, sp.display_name as sport_name,
              e.id as event_id, e.event_number, e.title as event_title, e.event_date
       FROM bookings b
       JOIN event_slots s ON b.slot_id = s.id
       JOIN courts c ON s.court_id = c.id
       JOIN sports sp ON s.sport_id = sp.id
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = ?
       ORDER BY s.slot_start DESC`,
      [userId]
    );
  }
};

module.exports = playerService;
