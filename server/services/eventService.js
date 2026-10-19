/**
 * EVENT MANAGEMENT SERVICE
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const crypto = require('crypto');
const db = require('../database/db');

const eventService = {
  /**
   * Helper to format Date objects to SQLite-compatible YYYY-MM-DD HH:mm:ss strings
   */
  formatDateTime(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  },

  /**
   * Automatically generate 30-minute court slots for an event
   */
  async generateSlotsForEvent(eventId, eventDate, startTime, endTime, sportsOffered) {
    // Parse start and end time (format HH:mm:ss or HH:mm)
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Fetch active courts for the offered sports
    const placeholders = sportsOffered.map(() => '?').join(',');
    const courts = await db.all(
      `SELECT c.id as court_id, c.court_number, c.name as court_name, 
              s.id as sport_id, s.display_name as sport_name, s.default_player_capacity, s.slot_duration_min
       FROM courts c
       JOIN sports s ON c.sport_id = s.id
       WHERE c.is_active = 1 AND s.id IN (${placeholders})
       ORDER BY s.id, c.court_number`,
      sportsOffered
    );

    for (const court of courts) {
      const slotDuration = court.slot_duration_min || 30;
      for (let m = startMinutes; m < endMinutes; m += slotDuration) {
        const slotStartH = String(Math.floor(m / 60)).padStart(2, '0');
        const slotStartM = String(m % 60).padStart(2, '0');
        const slotEndH = String(Math.floor((m + slotDuration) / 60)).padStart(2, '0');
        const slotEndM = String((m + slotDuration) % 60).padStart(2, '0');

        const slotStartStr = `${eventDate} ${slotStartH}:${slotStartM}:00`;
        const slotEndStr = `${eventDate} ${slotEndH}:${slotEndM}:00`;

        const slotId = `slt_${eventId}_${court.court_id}_${slotStartH}${slotStartM}`;

        await db.run(
          `INSERT OR IGNORE INTO event_slots (
            id, event_id, court_id, sport_id, slot_start, slot_end, max_capacity, booked_count, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
          [
            slotId,
            eventId,
            court.court_id,
            court.sport_id,
            slotStartStr,
            slotEndStr,
            court.default_player_capacity
          ]
        );
      }
    }
  },

  /**
   * Create a new event with configurable windows and automatically generated slots
   */
  async createEvent(data, adminUser) {
    const title = data.title?.trim();
    const eventDate = data.eventDate?.trim();

    if (!title || !eventDate) {
      const err = new Error('Title and Event Date are mandatory.');
      err.status = 400;
      throw err;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || isNaN(new Date(eventDate).getTime())) {
      const err = new Error('Invalid eventDate format. Must be YYYY-MM-DD.');
      err.status = 400;
      throw err;
    }

    const startTime = data.startTime || '19:00:00';
    const endTime = data.endTime || '22:00:00';
    const venue = data.venue?.trim() || 'Jito Multisports Complex, Main Arena';
    const description = data.description || 'Community Multisports Series Fortnightly Event.';
    const sportsOffered = Array.isArray(data.sportsOffered) && data.sportsOffered.length > 0
      ? data.sportsOffered
      : ['pickleball', 'paddle_ball', 'box_cricket'];
    const maxSlotsPerPlayer = Number(data.maxSlotsPerPlayer) || 2;

    // Timeline defaults
    const eventDateObj = new Date(`${eventDate}T${startTime}`);
    
    // Booking window: opens T-7 days, closes T-48 hours
    const defaultBookingOpen = new Date(eventDateObj.getTime() - 7 * 24 * 3600 * 1000);
    defaultBookingOpen.setHours(9, 0, 0, 0);

    const defaultBookingClose = new Date(eventDateObj.getTime() - 48 * 3600 * 1000);
    
    // Attendance confirmation window: opens T-14 days, closes T-7 days
    const defaultConfirmOpen = new Date(eventDateObj.getTime() - 14 * 24 * 3600 * 1000);
    defaultConfirmOpen.setHours(9, 0, 0, 0);

    const defaultConfirmClose = new Date(eventDateObj.getTime() - 7 * 24 * 3600 * 1000);
    defaultConfirmClose.setHours(9, 0, 0, 0);

    const defaultCancellationDeadline = new Date(eventDateObj.getTime() - 48 * 3600 * 1000);

    const bookingOpenAt = this.formatDateTime(data.bookingOpenAt || defaultBookingOpen);
    const bookingCloseAt = this.formatDateTime(data.bookingCloseAt || defaultBookingClose);
    const confirmationOpenAt = this.formatDateTime(data.confirmationOpenAt || defaultConfirmOpen);
    const confirmationCloseAt = this.formatDateTime(data.confirmationCloseAt || defaultConfirmClose);
    const cancellationDeadline = this.formatDateTime(data.cancellationDeadline || defaultCancellationDeadline);
    const status = data.status || 'DRAFT';
    const publishedAt = status !== 'DRAFT' ? new Date().toISOString() : null;

    // Determine event number
    const maxRow = await db.get('SELECT MAX(event_number) as max_num FROM events');
    const eventNumber = (maxRow?.max_num || 0) + 1;
    const eventId = data.id || `evt_${String(eventNumber).padStart(3, '0')}`;

    await db.transaction(async () => {
      await db.run(
        `INSERT INTO events (
          id, event_number, title, description, venue, event_date, start_time, end_time,
          sports_offered, published_at, confirmation_open_at, confirmation_close_at,
          booking_open_at, booking_close_at, cancellation_deadline, status, max_slots_per_player
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          eventNumber,
          title,
          description,
          venue,
          eventDate,
          startTime,
          endTime,
          JSON.stringify(sportsOffered),
          publishedAt,
          confirmationOpenAt,
          confirmationCloseAt,
          bookingOpenAt,
          bookingCloseAt,
          cancellationDeadline,
          status,
          maxSlotsPerPlayer
        ]
      );

      // Generate 30-minute slots for the sports offered
      await this.generateSlotsForEvent(eventId, eventDate, startTime, endTime, sportsOffered);

      // Audit log
      await db.run(
        `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
         VALUES (?, ?, ?, 'EVENT_CREATED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          eventId,
          adminUser?.id || null,
          JSON.stringify({ title, eventDate, status, sportsOffered })
        ]
      );
    });

    return this.getEventById(eventId);
  },

  /**
   * Update an existing event, safely validating against existing confirmed bookings
   */
  async updateEvent(eventId, updateData, adminUser) {
    const existing = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!existing) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    if (updateData.eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(updateData.eventDate) || isNaN(new Date(updateData.eventDate).getTime()))) {
      const err = new Error('Invalid eventDate format. Must be YYYY-MM-DD.');
      err.status = 400;
      throw err;
    }

    // Check if active bookings exist
    const bookingsCountRow = await db.get(
      `SELECT COUNT(*) as count FROM bookings WHERE event_id = ? AND status = 'CONFIRMED'`,
      [eventId]
    );
    const hasActiveBookings = (bookingsCountRow?.count || 0) > 0;

    // Validate event changes against existing bookings
    if (hasActiveBookings) {
      if (updateData.eventDate && updateData.eventDate !== existing.event_date) {
        const err = new Error(
          `Cannot modify event date: ${bookingsCountRow.count} confirmed booking(s) exist. Please postpone or cancel the event instead.`
        );
        err.status = 400;
        throw err;
      }
      if (updateData.startTime && updateData.startTime !== existing.start_time) {
        const err = new Error(
          `Cannot modify start time: ${bookingsCountRow.count} confirmed booking(s) exist.`
        );
        err.status = 400;
        throw err;
      }
      if (updateData.endTime && updateData.endTime !== existing.end_time) {
        const err = new Error(
          `Cannot modify end time: ${bookingsCountRow.count} confirmed booking(s) exist.`
        );
        err.status = 400;
        throw err;
      }
      if (updateData.sportsOffered) {
        const existingSports = JSON.parse(existing.sports_offered || '[]');
        const removed = existingSports.filter(s => !updateData.sportsOffered.includes(s));
        if (removed.length > 0) {
          // Check if any booking is in the removed sports
          const bookedSports = await db.all(
            `SELECT DISTINCT s.sport_id 
             FROM bookings b
             JOIN event_slots s ON b.slot_id = s.id
             WHERE b.event_id = ? AND b.status = 'CONFIRMED'`,
            [eventId]
          );
          const bookedSportIds = bookedSports.map(r => r.sport_id);
          const conflictingRemoved = removed.filter(s => bookedSportIds.includes(s));
          if (conflictingRemoved.length > 0) {
            const err = new Error(
              `Cannot remove sport '${conflictingRemoved.join(', ')}': active bookings exist in those sports.`
            );
            err.status = 400;
            throw err;
          }
        }
      }
    }

    const title = updateData.title !== undefined ? updateData.title.trim() : existing.title;
    const description = updateData.description !== undefined ? updateData.description : existing.description;
    const venue = updateData.venue !== undefined ? updateData.venue.trim() : existing.venue;
    const eventDate = updateData.eventDate || existing.event_date;
    const startTime = updateData.startTime || existing.start_time;
    const endTime = updateData.endTime || existing.end_time;
    const sportsOffered = updateData.sportsOffered 
      ? JSON.stringify(updateData.sportsOffered) 
      : existing.sports_offered;
    const bookingOpenAt = updateData.bookingOpenAt ? this.formatDateTime(updateData.bookingOpenAt) : existing.booking_open_at;
    const bookingCloseAt = updateData.bookingCloseAt ? this.formatDateTime(updateData.bookingCloseAt) : existing.booking_close_at;
    const confirmationOpenAt = updateData.confirmationOpenAt ? this.formatDateTime(updateData.confirmationOpenAt) : existing.confirmation_open_at;
    const confirmationCloseAt = updateData.confirmationCloseAt ? this.formatDateTime(updateData.confirmationCloseAt) : existing.confirmation_close_at;
    const cancellationDeadline = updateData.cancellationDeadline ? this.formatDateTime(updateData.cancellationDeadline) : existing.cancellation_deadline;
    const maxSlotsPerPlayer = updateData.maxSlotsPerPlayer !== undefined ? Number(updateData.maxSlotsPerPlayer) : existing.max_slots_per_player;
    const status = updateData.status || existing.status;

    await db.transaction(async () => {
      await db.run(
        `UPDATE events SET
          title = ?, description = ?, venue = ?, event_date = ?, start_time = ?, end_time = ?,
          sports_offered = ?, booking_open_at = ?, booking_close_at = ?,
          confirmation_open_at = ?, confirmation_close_at = ?, cancellation_deadline = ?,
          status = ?, max_slots_per_player = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title, description, venue, eventDate, startTime, endTime,
          sportsOffered, bookingOpenAt, bookingCloseAt,
          confirmationOpenAt, confirmationCloseAt, cancellationDeadline,
          status, maxSlotsPerPlayer, eventId
        ]
      );

      // If sports changed and no active bookings conflict, generate newly added sports slots
      if (updateData.sportsOffered) {
        await this.generateSlotsForEvent(eventId, eventDate, startTime, endTime, updateData.sportsOffered);
      }

      await db.run(
        `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
         VALUES (?, ?, ?, 'EVENT_UPDATED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          eventId,
          adminUser?.id || null,
          JSON.stringify(updateData)
        ]
      );
    });

    return this.getEventById(eventId);
  },

  /**
   * Publish an event (Transitions DRAFT -> PUBLISHED or BOOKING_OPEN based on booking window)
   */
  async publishEvent(eventId, adminUser) {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    let newStatus = 'PUBLISHED';
    if (event.booking_open_at <= now && event.booking_close_at > now) {
      newStatus = 'BOOKING_OPEN';
    } else if (event.confirmation_open_at <= now && event.confirmation_close_at > now) {
      newStatus = 'CONFIRMATION_OPEN';
    }

    await db.run(
      `UPDATE events 
       SET status = ?, published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStatus, eventId]
    );

    await db.run(
      `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
       VALUES (?, ?, ?, 'EVENT_PUBLISHED', ?)`,
      [
        'aud_' + crypto.randomUUID().replace(/-/g, ''),
        eventId,
        adminUser?.id || null,
        JSON.stringify({ previousStatus: event.status, newStatus })
      ]
    );

    return this.getEventById(eventId);
  },

  /**
   * Postpone an event
   */
  async postponeEvent(eventId, { newDate, newStartTime, newEndTime, reason }, adminUser) {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    await db.transaction(async () => {
      const updatedDate = newDate || event.event_date;
      const updatedStart = newStartTime || event.start_time;
      const updatedEnd = newEndTime || event.end_time;

      await db.run(
        `UPDATE events 
         SET status = 'POSTPONED', event_date = ?, start_time = ?, end_time = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [updatedDate, updatedStart, updatedEnd, eventId]
      );

      await db.run(
        `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
         VALUES (?, ?, ?, 'EVENT_POSTPONED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          eventId,
          adminUser?.id || null,
          JSON.stringify({ reason: reason || 'Organiser rescheduling', newDate: updatedDate })
        ]
      );
    });

    return this.getEventById(eventId);
  },

  /**
   * Cancel an event (Cancels all active bookings and frees quotas)
   */
  async cancelEvent(eventId, reason, adminUser) {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    await db.transaction(async () => {
      // 1. Mark event CANCELLED
      await db.run(
        `UPDATE events SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [eventId]
      );

      // 2. Cancel all active bookings
      await db.run(
        `UPDATE bookings 
         SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, 
             cancellation_reason = ? 
         WHERE event_id = ? AND status = 'CONFIRMED'`,
        [reason || 'Event cancelled by tournament organizers.', eventId]
      );

      // 3. Reset slot booked counts
      await db.run(
        `UPDATE event_slots SET booked_count = 0 WHERE event_id = ?`,
        [eventId]
      );

      // 4. Clear waitlists
      await db.run(`DELETE FROM waitlists WHERE event_id = ?`, [eventId]);

      // 5. Audit log
      await db.run(
        `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
         VALUES (?, ?, ?, 'EVENT_CANCELLED', ?)`,
        [
          'aud_' + crypto.randomUUID().replace(/-/g, ''),
          eventId,
          adminUser?.id || null,
          JSON.stringify({ reason: reason || 'Organiser cancellation' })
        ]
      );
    });

    return this.getEventById(eventId);
  },

  /**
   * Archive an event
   */
  async archiveEvent(eventId, adminUser) {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    await db.run(
      `UPDATE events SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [eventId]
    );

    await db.run(
      `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
       VALUES (?, ?, ?, 'EVENT_ARCHIVED', ?)`,
      [
        'aud_' + crypto.randomUUID().replace(/-/g, ''),
        eventId,
        adminUser?.id || null,
        JSON.stringify({ previousStatus: event.status })
      ]
    );

    return this.getEventById(eventId);
  },

  /**
   * Retrieve all events with real-time statistics
   */
  async getEvents({ status, includeDrafts = false, search = '' } = {}) {
    let sql = `
      SELECT e.*,
             (SELECT COUNT(*) FROM event_confirmations ec WHERE ec.event_id = e.id AND ec.status = 'CONFIRMED') as confirmed_attendees,
             (SELECT COUNT(*) FROM event_confirmations ec WHERE ec.event_id = e.id AND ec.status = 'DECLINED') as declined_attendees,
             (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.id AND b.status = 'CONFIRMED') as total_bookings,
             (SELECT COUNT(*) FROM event_slots es WHERE es.event_id = e.id) as total_slots,
             (SELECT SUM(es.max_capacity) FROM event_slots es WHERE es.event_id = e.id) as total_capacity,
             (SELECT SUM(es.booked_count) FROM event_slots es WHERE es.event_id = e.id) as booked_capacity
      FROM events e
      WHERE 1=1
    `;
    const params = [];

    if (!includeDrafts) {
      sql += ` AND e.status != 'DRAFT' AND e.status != 'ARCHIVED'`;
    }

    if (status) {
      sql += ` AND e.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (LOWER(e.title) LIKE ? OR LOWER(e.venue) LIKE ?)`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    sql += ` ORDER BY e.event_date ASC, e.start_time ASC`;

    const rows = await db.all(sql, params);
    return rows.map(r => ({
      ...r,
      sports_offered: typeof r.sports_offered === 'string' ? JSON.parse(r.sports_offered) : r.sports_offered
    }));
  },

  /**
   * Retrieve single event by ID with full court slot breakdown and user attendance status
   */
  async getEventById(eventId, userId = null) {
    const event = await db.get(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_confirmations ec WHERE ec.event_id = e.id AND ec.status = 'CONFIRMED') as confirmed_attendees,
              (SELECT COUNT(*) FROM event_confirmations ec WHERE ec.event_id = e.id AND ec.status = 'DECLINED') as declined_attendees,
              (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.id AND b.status = 'CONFIRMED') as total_bookings,
              (SELECT COUNT(*) FROM waitlists w WHERE w.event_id = e.id AND w.promoted_at IS NULL) as total_waitlisted,
              (SELECT COUNT(*) FROM event_slots es WHERE es.event_id = e.id) as total_slots,
              (SELECT SUM(es.max_capacity) FROM event_slots es WHERE es.event_id = e.id) as total_capacity,
              (SELECT SUM(es.booked_count) FROM event_slots es WHERE es.event_id = e.id) as booked_capacity
       FROM events e
       WHERE e.id = ?`,
      [eventId]
    );

    if (!event) return null;

    let userAttendance = null;
    let userBookings = [];
    let userWaitlists = [];

    if (userId) {
      const conf = await db.get(
        'SELECT status, confirmed_at FROM event_confirmations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );
      userAttendance = conf ? conf.status : null;

      userBookings = await db.all(
        `SELECT b.id as booking_id, b.status, b.created_at, b.slot_id,
                s.slot_start, s.slot_end, c.name as court_name, c.court_number, sp.display_name as sport_name
         FROM bookings b
         JOIN event_slots s ON b.slot_id = s.id
         JOIN courts c ON s.court_id = c.id
         JOIN sports sp ON s.sport_id = sp.id
         WHERE b.event_id = ? AND b.user_id = ? AND b.status = 'CONFIRMED'`,
        [eventId, userId]
      );

      userWaitlists = await db.all(
        `SELECT w.id as waitlist_id, w.queue_position, w.created_at, w.slot_id,
                s.slot_start, s.slot_end, c.name as court_name, sp.display_name as sport_name
         FROM waitlists w
         JOIN event_slots s ON w.slot_id = s.id
         JOIN courts c ON s.court_id = c.id
         JOIN sports sp ON s.sport_id = sp.id
         WHERE w.event_id = ? AND w.user_id = ? AND w.promoted_at IS NULL`,
        [eventId, userId]
      );
    }

    return {
      ...event,
      sports_offered: typeof event.sports_offered === 'string' ? JSON.parse(event.sports_offered) : event.sports_offered,
      userAttendance,
      userBookings,
      userWaitlists
    };
  },

  /**
   * Event-wise Attendance Confirmation (Separate from slot booking)
   */
  async confirmAttendance(eventId, userId, status) {
    if (!['CONFIRMED', 'DECLINED', 'TENTATIVE'].includes(status)) {
      const err = new Error('Invalid status. Must be CONFIRMED, DECLINED, or TENTATIVE.');
      err.status = 400;
      throw err;
    }

    const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      const err = new Error(`Event '${eventId}' not found.`);
      err.status = 404;
      throw err;
    }

    if (['CANCELLED', 'ARCHIVED'].includes(event.status)) {
      const err = new Error(`Cannot modify attendance for a ${event.status.toLowerCase()} event.`);
      err.status = 400;
      throw err;
    }

    // Check confirmation window deadline if configured
    const now = new Date().toISOString();
    if (event.confirmation_close_at && now > event.confirmation_close_at) {
      const err = new Error('Attendance confirmation window for this event has closed.');
      err.status = 400;
      throw err;
    }

    // Upsert confirmation
    const confId = 'conf_' + crypto.randomUUID().replace(/-/g, '');
    await db.run(
      `INSERT INTO event_confirmations (id, event_id, user_id, status, confirmed_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         status = excluded.status,
         confirmed_at = CURRENT_TIMESTAMP`,
      [confId, eventId, userId, status]
    );

    // Audit log
    await db.run(
      `INSERT INTO audit_logs (id, event_id, user_id, action, payload)
       VALUES (?, ?, ?, 'ATTENDANCE_CONFIRMED', ?)`,
      [
        'aud_' + crypto.randomUUID().replace(/-/g, ''),
        eventId,
        userId,
        JSON.stringify({ status })
      ]
    );

    return {
      eventId,
      userId,
      status,
      message: status === 'CONFIRMED'
        ? 'Attendance confirmed! You are now eligible to reserve 30-minute court slots during the booking window.'
        : 'Attendance response recorded.'
    };
  },

  /**
   * Retrieve list of confirmed / declined players for an event
   */
  async getAttendanceList(eventId) {
    return db.all(
      `SELECT ec.id, ec.status, ec.confirmed_at,
              u.id as user_id, u.player_id, u.full_name, u.email, u.phone, u.gender
       FROM event_confirmations ec
       JOIN users u ON ec.user_id = u.id
       WHERE ec.event_id = ?
       ORDER BY ec.confirmed_at ASC`,
      [eventId]
    );
  }
};

module.exports = eventService;
