/**
 * AUTHENTICATION & IDENTITY SERVICE
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/env');

const authService = {
  /**
   * Generates a deterministic, sequential Unique Player ID (e.g. MP1001, FP1002)
   */
  async generateUniquePlayerId(gender) {
    const prefix = gender === 'FEMALE' ? 'FP' : (gender === 'MALE' ? 'MP' : 'JP');
    
    // Find highest sequence for this prefix
    const rows = await db.all(
      `SELECT player_id FROM users WHERE player_id LIKE ? ORDER BY player_id DESC`,
      [`${prefix}%`]
    );

    let maxSeq = 1000;
    for (const row of rows) {
      const match = row.player_id.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq}`;
  },

  /**
   * Helper to hash password setup tokens for database storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Generates a signed JWT session token
   */
  generateJwt(user) {
    const payload = {
      id: user.id,
      playerId: user.player_id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  },

  /**
   * Register a new player with permanent profile
   */
  async registerPlayer(data) {
    const email = data.email.toLowerCase().trim();
    const phone = data.phone.trim();
    const fullName = data.fullName.trim();
    const gender = data.gender.toUpperCase();

    if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      const err = new Error('Invalid gender. Must be MALE, FEMALE, or OTHER.');
      err.status = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const err = new Error('Invalid email format. Please provide a valid email address.');
      err.status = 400;
      throw err;
    }

    const phoneRegex = /^[0-9+\s\-()]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      const err = new Error('Invalid phone number format. Must contain at least 7 digits.');
      err.status = 400;
      throw err;
    }

    // 1. Check for duplicate email or phone safely
    const existingUser = await db.get(
      'SELECT id, player_id, email, phone FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUser) {
      const field = existingUser.email.toLowerCase() === email ? 'email' : 'phone number';
      const err = new Error(
        `A player account with this ${field} is already registered. Your permanent Player ID is ${existingUser.player_id}. Please log in.`
      );
      err.status = 409;
      err.existingPlayerId = existingUser.player_id;
      throw err;
    }

    // 2. Generate permanent Unique Player ID
    const playerId = await this.generateUniquePlayerId(gender);
    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '');

    let passwordHash = null;
    let userStatus = 'PENDING_PASSWORD';
    let setupToken = null;

    if (data.password !== undefined && data.password !== null && data.password !== '') {
      if (data.password.length < 8) {
        const err = new Error('Password must be at least 8 characters long.');
        err.status = 400;
        throw err;
      }
      passwordHash = await bcrypt.hash(data.password, 10);
      userStatus = 'ACTIVE';
    } else {
      // Framework security policy: Generate setup token for password link
      setupToken = crypto.randomBytes(32).toString('hex');
    }

    // 3. Insert user record inside transaction
    await db.transaction(async () => {
      await db.run(
        `INSERT INTO users (
          id, player_id, full_name, email, phone, gender, 
          date_of_birth, age_group, password_hash, role, status, emergency_contact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLAYER', ?, ?)`,
        [
          userId,
          playerId,
          fullName,
          email,
          phone,
          gender,
          data.dateOfBirth || null,
          data.ageGroup || null,
          passwordHash,
          userStatus,
          data.emergencyContact || null
        ]
      );

      // Insert sports preferences
      const playsPickleball = data.sports?.includes('pickleball') ? 1 : 0;
      const playsPaddle = data.sports?.includes('paddle_ball') ? 1 : 0;
      const playsCricket = data.sports?.includes('box_cricket') ? 1 : 0;

      await db.run(
        `INSERT INTO player_preferences (
          user_id, plays_pickleball, plays_paddle, plays_box_cricket,
          skill_level_pickleball, skill_level_paddle, skill_level_cricket, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          playsPickleball,
          playsPaddle,
          playsCricket,
          data.skillLevel?.pickleball || 'INTERMEDIATE',
          data.skillLevel?.paddle_ball || 'INTERMEDIATE',
          data.skillLevel?.box_cricket || 'INTERMEDIATE',
          data.notes || null
        ]
      );

      // Store setup token if password wasn't provided directly
      if (setupToken) {
        const tokenHash = this.hashToken(setupToken);
        const expiresAt = new Date(Date.now() + config.passwordTokenExpiresHours * 3600 * 1000).toISOString();
        const tokenId = 'tok_' + crypto.randomUUID().replace(/-/g, '');

        await db.run(
          `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
           VALUES (?, ?, ?, ?)`,
          [tokenId, userId, tokenHash, expiresAt]
        );
      }

      // Log registration audit record
      await db.run(
        `INSERT INTO audit_logs (id, user_id, action, payload)
         VALUES (?, ?, 'PLAYER_REGISTERED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          userId,
          JSON.stringify({ playerId, email, gender })
        ]
      );
    });

    // Retrieve created user without password_hash
    const user = await this.getUserById(userId);
    const token = userStatus === 'ACTIVE' ? this.generateJwt(user) : null;

    return {
      user,
      setupToken,
      token,
      message: userStatus === 'ACTIVE' 
        ? 'Account created and activated.' 
        : 'Account created. Use the setup token to establish your password.'
    };
  },

  /**
   * Set or reset password using cryptographic token
   */
  async setupPassword(token, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      const err = new Error('Password must be at least 8 characters long.');
      err.status = 400;
      throw err;
    }

    const tokenHash = this.hashToken(token);
    const tokenRecord = await db.get(
      `SELECT * FROM password_reset_tokens 
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
      [tokenHash, new Date().toISOString()]
    );

    if (!tokenRecord) {
      const err = new Error('Invalid or expired password setup token.');
      err.status = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.transaction(async () => {
      // Mark token used
      await db.run(
        `UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`,
        [tokenRecord.id]
      );

      // Activate user
      await db.run(
        `UPDATE users SET password_hash = ?, status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?`,
        [passwordHash, tokenRecord.user_id]
      );

      // Log audit
      await db.run(
        `INSERT INTO audit_logs (id, user_id, action) VALUES (?, ?, 'PASSWORD_SETUP_COMPLETED')`,
        ['aud_' + crypto.randomUUID().replace(/-/g, ''), tokenRecord.user_id]
      );
    });

    const user = await this.getUserById(tokenRecord.user_id);
    const jwtToken = this.generateJwt(user);

    return {
      user,
      token: jwtToken,
      message: 'Password successfully configured. Account activated.'
    };
  },

  /**
   * Authenticate user with Player ID or Email + Password
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      const err = new Error('Player ID/Email and password are required.');
      err.status = 400;
      throw err;
    }

    const cleanId = identifier.trim();
    const user = await db.get(
      `SELECT * FROM users WHERE LOWER(player_id) = LOWER(?) OR LOWER(email) = LOWER(?)`,
      [cleanId, cleanId]
    );

    if (!user) {
      const err = new Error('Invalid Player ID / Email or password.');
      err.status = 401;
      throw err;
    }

    if (user.status === 'SUSPENDED') {
      const err = new Error('Your account has been suspended by an administrator. Please contact event coordinators.');
      err.status = 403;
      throw err;
    }

    if (user.status === 'PENDING_PASSWORD' || !user.password_hash) {
      const err = new Error('Account password has not been established yet. Please check your activation link.');
      err.status = 403;
      throw err;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const err = new Error('Invalid Player ID / Email or password.');
      err.status = 401;
      throw err;
    }

    // Log successful login
    await db.run(
      `INSERT INTO audit_logs (id, user_id, action) VALUES (?, ?, 'LOGIN_SUCCESS')`,
      ['aud_' + crypto.randomUUID().replace(/-/g, ''), user.id]
    );

    const safeUser = await this.getUserById(user.id);
    const token = this.generateJwt(safeUser);

    return {
      user: safeUser,
      token
    };
  },

  /**
   * Retrieve user profile and sport preferences by ID (excluding password_hash)
   */
  async getUserById(userId) {
    const user = await db.get(
      `SELECT id, player_id, full_name, email, phone, gender, date_of_birth, age_group,
              role, status, emergency_contact, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) return null;

    const preferences = await db.get(
      `SELECT plays_pickleball, plays_paddle, plays_box_cricket,
              skill_level_pickleball, skill_level_paddle, skill_level_cricket, notes
       FROM player_preferences WHERE user_id = ?`,
      [userId]
    );

    return {
      ...user,
      preferences: preferences || {}
    };
  }
};

module.exports = authService;
