/**
 * CONCURRENCY-SAFE BOOKING ENGINE & WAITLIST PROMOTION SERVICE
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const crypto = require('crypto');
const db = require('../database/db');

const bookingService = {
  /**
   * Helper to parse dates into UTC milliseconds for timestamp comparisons
   */
  parseTimestamp(val) {
    if (!val) return null;
    if (val instanceof Date) return val.getTime();
    const isoStr = String(val).replace(' ', 'T');
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  },

  /**
   * Concurrency-safe slot reservation with automatic waitlist queueing
   */
  async createBooking({ slotId, userId, bypassDeadlines = false }) {
    if (!slotId || !userId) {
      const err = new Error('Slot ID and User ID are mandatory.');
      err.status = 400;
      throw err;
    }

    return await db.transaction(async () => {
      // 1. Validate User Account & Status
      const user = await db.get(
        'SELECT id, player_id, full_name, email, role, status FROM users WHERE id = ?',
        [userId]
      );
      if (!user) {
        const err = new Error('User account not found.');
        err.status = 404;
        throw err;
      }
      if (user.status !== 'ACTIVE') {
        const err = new Error(`Account is not active (Status: ${user.status}). Please complete password activation.`);
        err.status = 403;
        throw err;
      }

      // 2. Retrieve Slot, Court, Sport, and Event Details
      const slot = await db.get(
        `SELECT s.*, c.name as court_name, c.court_number, 
                sp.id as sport_id, sp.display_name as sport_name, sp.default_player_capacity,
                e.id as event_id, e.title as event_title, e.event_date, e.status as event_status,
                e.booking_open_at, e.booking_close_at, e.max_slots_per_player, e.cancellation_deadline
         FROM event_slots s
         JOIN courts c ON s.court_id = c.id
         JOIN sports sp ON s.sport_id = sp.id
         JOIN events e ON s.event_id = e.id
         WHERE s.id = ?`,
        [slotId]
      );

      if (!slot) {
        const err = new Error(`Slot '${slotId}' not found.`);
        err.status = 404;
        throw err;
      }

      if (!slot.is_active) {
        const err = new Error('This court slot is currently inactive / undergoing maintenance.');
        err.status = 400;
        throw err;
      }

      // 3. Event Status & Booking Window Enforcement
      const nowMs = Date.now();
      const isStaff = ['ADMIN', 'COORDINATOR'].includes(user.role);

      if (!bypassDeadlines && !isStaff) {
        if (!['BOOKING_OPEN', 'PUBLISHED', 'UPCOMING'].includes(slot.event_status)) {
          const err = new Error(`Bookings are not open for this event (Current status: ${slot.event_status}).`);
          err.status = 400;
          throw err;
        }

        if (slot.booking_open_at) {
          const openMs = this.parseTimestamp(slot.booking_open_at);
          if (openMs && nowMs < openMs) {
            const err = new Error(`Booking window has not opened yet. Opens on ${slot.booking_open_at}.`);
            err.status = 400;
            throw err;
          }
        }

        if (slot.booking_close_at) {
          const closeMs = this.parseTimestamp(slot.booking_close_at);
          if (closeMs && nowMs > closeMs) {
            const err = new Error(`Booking window closed on ${slot.booking_close_at} (T-48 Hours lock).`);
            err.status = 400;
            throw err;
          }
        }
      }

      // 4. Attendance Confirmation Guard (Separate from slot booking)
      if (!bypassDeadlines && !isStaff) {
        const attendance = await db.get(
          `SELECT status FROM event_confirmations WHERE event_id = ? AND user_id = ?`,
          [slot.event_id, userId]
        );

        if (!attendance || attendance.status !== 'CONFIRMED') {
          const err = new Error(
            'Event-wise attendance confirmation is required before booking slots. Please confirm your event attendance first.'
          );
          err.status = 400;
          err.code = 'ATTENDANCE_CONFIRMATION_REQUIRED';
          throw err;
        }
      }

      // 5. Duplicate Booking Guard for Same Slot
      const existingSlotBooking = await db.get(
        `SELECT id, status FROM bookings WHERE slot_id = ? AND user_id = ? AND status = 'CONFIRMED'`,
        [slotId, userId]
      );
      if (existingSlotBooking) {
        const err = new Error('You already have a confirmed reservation for this exact court slot.');
        err.status = 409;
        throw err;
      }

      // 6. Time Collision Guard (Cannot book 2 different courts at the exact same time interval)
      const timeCollision = await db.get(
        `SELECT b.id, c.name as court_name, s.slot_start, s.slot_end
         FROM bookings b
         JOIN event_slots s ON b.slot_id = s.id
         JOIN courts c ON s.court_id = c.id
         WHERE b.user_id = ? AND b.status = 'CONFIRMED' AND s.event_id = ? AND s.slot_start = ?`,
        [userId, slot.event_id, slot.slot_start]
      );

      if (timeCollision) {
        const err = new Error(
          `Schedule conflict: You are already booked on ${timeCollision.court_name} during ${slot.slot_start.substring(11, 16)} to ${slot.slot_end.substring(11, 16)}.`
        );
        err.status = 409;
        err.code = 'SCHEDULE_COLLISION';
        throw err;
      }

      // 7. Quota Limit Check (Default 2 slots per player per event)
      const maxSlots = slot.max_slots_per_player || 2;
      const currentBookingsCount = await db.get(
        `SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND event_id = ? AND status = 'CONFIRMED'`,
        [userId, slot.event_id]
      );

      if ((currentBookingsCount?.count || 0) >= maxSlots) {
        const err = new Error(
          `Quota limit reached: You have already reserved ${currentBookingsCount.count} of ${maxSlots} allowed slots for this event.`
        );
        err.status = 400;
        err.code = 'QUOTA_EXCEEDED';
        throw err;
      }

      // 8. Concurrency-Safe Atomic Capacity Increment
      // Only increments if booked_count < max_capacity
      const updateResult = await db.run(
        `UPDATE event_slots 
         SET booked_count = booked_count + 1, lock_version = lock_version + 1
         WHERE id = ? AND booked_count < max_capacity`,
        [slotId]
      );

      // A: Spot was successfully secured!
      if (updateResult.changes > 0) {
        const bookingId = 'bkg_' + crypto.randomUUID().replace(/-/g, '');
        await db.run(
          `INSERT INTO bookings (id, slot_id, user_id, event_id, status)
           VALUES (?, ?, ?, ?, 'CONFIRMED')`,
          [bookingId, slotId, userId, slot.event_id]
        );

        // Remove from waitlist if user was previously waiting
        await db.run(
          `DELETE FROM waitlists WHERE slot_id = ? AND user_id = ?`,
          [slotId, userId]
        );

        // Audit Log
        await db.run(
          `INSERT INTO audit_logs (id, event_id, slot_id, user_id, action, payload)
           VALUES (?, ?, ?, ?, 'SLOT_BOOKED', ?)`,
          [
            'aud_' + crypto.randomUUID().replace(/-/g, ''),
            slot.event_id,
            slotId,
            userId,
            JSON.stringify({ court: slot.court_name, sport: slot.sport_name, time: slot.slot_start })
          ]
        );

        return {
          status: 'CONFIRMED',
          bookingId,
          slotId,
          courtName: slot.court_name,
          sportName: slot.sport_name,
          slotStart: slot.slot_start,
          slotEnd: slot.slot_end,
          maxCapacity: slot.max_capacity,
          message: `Slot confirmed on ${slot.court_name} (${slot.sport_name}) from ${slot.slot_start.substring(11, 16)} to ${slot.slot_end.substring(11, 16)}.`
        };
      }

      // B: Slot is at Full Capacity -> Join Waitlist Queue
      const existingWaitlist = await db.get(
        `SELECT id, queue_position FROM waitlists WHERE slot_id = ? AND user_id = ? AND promoted_at IS NULL`,
        [slotId, userId]
      );

      if (existingWaitlist) {
        const err = new Error(`Slot is full. You are already in the waitlist at position #${existingWaitlist.queue_position}.`);
        err.status = 409;
        err.queuePosition = existingWaitlist.queue_position;
        throw err;
      }

      // Calculate next queue position
      const maxQueueRow = await db.get(
        `SELECT COALESCE(MAX(queue_position), 0) as max_pos FROM waitlists WHERE slot_id = ? AND promoted_at IS NULL`,
        [slotId]
      );
      const nextQueuePos = (maxQueueRow?.max_pos || 0) + 1;
      const waitlistId = 'wtl_' + crypto.randomUUID().replace(/-/g, '');

      await db.run(
        `INSERT INTO waitlists (id, slot_id, user_id, event_id, queue_position)
         VALUES (?, ?, ?, ?, ?)`,
        [waitlistId, slotId, userId, slot.event_id, nextQueuePos]
      );

      await db.run(
        `INSERT INTO audit_logs (id, event_id, slot_id, user_id, action, payload)
         VALUES (?, ?, ?, ?, 'WAITLIST_JOINED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          slot.event_id,
          slotId,
          userId,
          JSON.stringify({ queuePosition: nextQueuePos })
        ]
      );

      return {
        status: 'WAITLISTED',
        waitlistId,
        slotId,
        queuePosition: nextQueuePos,
        courtName: slot.court_name,
        sportName: slot.sport_name,
        message: `Slot is at maximum capacity (${slot.max_capacity} players). You have been placed on the waitlist at position #${nextQueuePos}.`
      };
    });
  },

  /**
   * Cancel booking with automatic waitlist promotion engine
   */
  async cancelBooking(bookingId, requestingUser, { reason = 'Player self-cancellation', bypassDeadline = false } = {}) {
    return await db.transaction(async () => {
      const booking = await db.get(
        `SELECT b.*, s.slot_start, s.slot_end, s.court_id, s.sport_id, s.max_capacity, s.booked_count,
                c.name as court_name, e.cancellation_deadline, e.event_date, e.title as event_title
         FROM bookings b
         JOIN event_slots s ON b.slot_id = s.id
         JOIN courts c ON s.court_id = c.id
         JOIN events e ON b.event_id = e.id
         WHERE b.id = ?`,
        [bookingId]
      );

      if (!booking) {
        const err = new Error(`Booking '${bookingId}' not found.`);
        err.status = 404;
        throw err;
      }

      if (booking.status !== 'CONFIRMED') {
        const err = new Error(`Booking cannot be cancelled because its current status is '${booking.status}'.`);
        err.status = 400;
        throw err;
      }

      const isOwner = booking.user_id === requestingUser.id;
      const isStaff = ['ADMIN', 'COORDINATOR'].includes(requestingUser.role);

      if (!isOwner && !isStaff) {
        const err = new Error('Forbidden: You do not have permission to cancel another player\'s booking.');
        err.status = 403;
        throw err;
      }

      // Cancellation Deadline Check (unless staff or bypassed)
      const nowMs = Date.now();
      if (!isStaff && !bypassDeadline && booking.cancellation_deadline) {
        const deadlineMs = this.parseTimestamp(booking.cancellation_deadline);
        if (deadlineMs && nowMs > deadlineMs) {
          const err = new Error(
            `Cancellation deadline has passed (${booking.cancellation_deadline}). Late cancellations must be requested through event coordinators.`
          );
          err.status = 400;
          throw err;
        }
      }

      // 1. Mark Booking as CANCELLED
      await db.run(
        `UPDATE bookings 
         SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?
         WHERE id = ?`,
        [reason, bookingId]
      );

      // 2. Waitlist Promotion Engine
      // Check if there are players waiting for this exact slot
      const nextInLine = await db.get(
        `SELECT w.*, u.id as user_id, u.full_name, u.email, u.player_id
         FROM waitlists w
         JOIN users u ON w.user_id = u.id
         WHERE w.slot_id = ? AND w.promoted_at IS NULL
         ORDER BY w.queue_position ASC
         LIMIT 1`,
        [booking.slot_id]
      );

      let promotedInfo = null;

      if (nextInLine) {
        // Promote player from waitlist directly into confirmed booking!
        const newBookingId = 'bkg_' + crypto.randomUUID().replace(/-/g, '');
        
        await db.run(
          `INSERT INTO bookings (id, slot_id, user_id, event_id, status)
           VALUES (?, ?, ?, ?, 'CONFIRMED')`,
          [newBookingId, booking.slot_id, nextInLine.user_id, booking.event_id]
        );

        await db.run(
          `UPDATE waitlists SET promoted_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [nextInLine.id]
        );

        // Shift remaining queue positions down by 1
        await db.run(
          `UPDATE waitlists SET queue_position = queue_position - 1 
           WHERE slot_id = ? AND promoted_at IS NULL`,
          [booking.slot_id]
        );

        // Note: Slot booked_count remains identical since the spot is directly handed over!
        promotedInfo = {
          promoted: true,
          userId: nextInLine.user_id,
          playerId: nextInLine.player_id,
          fullName: nextInLine.full_name,
          bookingId: newBookingId
        };

        // Audit Log for Promotion
        await db.run(
          `INSERT INTO audit_logs (id, event_id, slot_id, user_id, action, payload)
           VALUES (?, ?, ?, ?, 'WAITLIST_PROMOTED', ?)`,
          [
            'aud_' + crypto.randomUUID().replace(/-/g, ''),
            booking.event_id,
            booking.slot_id,
            nextInLine.user_id,
            JSON.stringify({ previousBookingId: bookingId, newBookingId })
          ]
        );
      } else {
        // No waitlisted player -> decrement slot booked_count atomically
        await db.run(
          `UPDATE event_slots 
           SET booked_count = MAX(0, booked_count - 1), lock_version = lock_version + 1 
           WHERE id = ?`,
          [booking.slot_id]
        );
      }

      // Audit Log for Cancellation
      await db.run(
        `INSERT INTO audit_logs (id, event_id, slot_id, user_id, action, payload)
         VALUES (?, ?, ?, ?, 'BOOKING_CANCELLED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          booking.event_id,
          booking.slot_id,
          booking.user_id,
          JSON.stringify({ cancelledBy: requestingUser.playerId, reason, waitlistPromoted: !!promotedInfo })
        ]
      );

      return {
        success: true,
        bookingId,
        message: 'Booking cancelled successfully. Your event quota has been restored.',
        promoted: promotedInfo
      };
    });
  },

  /**
   * Leave waitlist
   */
  async leaveWaitlist(waitlistId, requestingUser) {
    const entry = await db.get(
      'SELECT * FROM waitlists WHERE id = ? AND promoted_at IS NULL',
      [waitlistId]
    );
    if (!entry) {
      const err = new Error('Waitlist entry not found.');
      err.status = 404;
      throw err;
    }

    if (entry.user_id !== requestingUser.id && !['ADMIN', 'COORDINATOR'].includes(requestingUser.role)) {
      const err = new Error('Forbidden: Cannot remove other players from waitlist.');
      err.status = 403;
      throw err;
    }

    await db.transaction(async () => {
      await db.run('DELETE FROM waitlists WHERE id = ?', [waitlistId]);
      // Re-order remaining queue
      await db.run(
        `UPDATE waitlists SET queue_position = queue_position - 1 
         WHERE slot_id = ? AND queue_position > ? AND promoted_at IS NULL`,
        [entry.slot_id, entry.queue_position]
      );
    });

    return { success: true, message: 'Removed from waitlist.' };
  },

  /**
   * Retrieve all 30-minute court slots for an event, grouped with live player lists
   */
  async getEventSlots(eventId, sportId = null) {
    let sql = `
      SELECT s.*, 
             c.name as court_name, c.court_number, 
             sp.id as sport_id, sp.display_name as sport_name, sp.default_player_capacity
      FROM event_slots s
      JOIN courts c ON s.court_id = c.id
      JOIN sports sp ON s.sport_id = sp.id
      WHERE s.event_id = ? AND s.is_active = 1
    `;
    const params = [eventId];

    if (sportId) {
      sql += ' AND s.sport_id = ?';
      params.push(sportId);
    }

    sql += ' ORDER BY s.slot_start ASC, c.court_number ASC';
    const slots = await db.all(sql, params);

    // Fetch confirmed bookings for each slot to show booked players
    const slotIds = slots.map(s => s.id);
    if (slotIds.length === 0) return [];

    const placeholders = slotIds.map(() => '?').join(',');
    const playersInSlots = await db.all(
      `SELECT b.slot_id, b.id as booking_id, u.id as user_id, u.player_id, u.full_name, u.gender,
              pp.skill_level_pickleball, pp.skill_level_paddle, pp.skill_level_cricket
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN player_preferences pp ON u.id = pp.user_id
       WHERE b.slot_id IN (${placeholders}) AND b.status = 'CONFIRMED'
       ORDER BY b.created_at ASC`,
      slotIds
    );

    const playersBySlot = {};
    for (const p of playersInSlots) {
      if (!playersBySlot[p.slot_id]) playersBySlot[p.slot_id] = [];
      playersBySlot[p.slot_id].push({
        bookingId: p.booking_id,
        userId: p.user_id,
        playerId: p.player_id,
        fullName: p.full_name,
        gender: p.gender,
        skill: p[`skill_level_${p.sport_id}`] || 'INTERMEDIATE'
      });
    }

    return slots.map(s => ({
      ...s,
      isFull: s.booked_count >= s.max_capacity,
      availableSpots: Math.max(0, s.max_capacity - s.booked_count),
      players: playersBySlot[s.id] || []
    }));
  }
};

module.exports = bookingService;
