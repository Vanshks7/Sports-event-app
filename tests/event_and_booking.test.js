/**
 * COMPREHENSIVE AUTOMATED TEST SUITE:
 * Event Management, Attendance Confirmation, Concurrency-Safe Booking Engine & Waitlists
 */

const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set isolated test environment
process.env.NODE_ENV = 'test';
const testDbPath = path.resolve(__dirname, 'test_booking_multisports.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DATABASE_URL = `sqlite:${testDbPath}`;

const db = require('../server/database/db');
const { runMigrations } = require('../server/database/migrator');
const authService = require('../server/services/authService');
const eventService = require('../server/services/eventService');
const bookingService = require('../server/services/bookingService');

let passedTests = 0;
let failedTests = 0;

async function runTest(testName, fn) {
  process.stdout.write(`• ${testName} ... `);
  try {
    await fn();
    console.log('✅ PASS');
    passedTests++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(`  Error: ${err.message}`);
    if (err.stack) console.error(`  ${err.stack.split('\n')[1]}`);
    failedTests++;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' RUNNING EVENT MANAGEMENT & BOOKING ENGINE TEST SUITE');
  console.log('================================================================\n');

  // 1. Initialize DB and run migrations
  db.init(`sqlite:${testDbPath}`);
  await runMigrations();

  // Create an admin user and 5 active test players
  const adminUser = {
    id: 'usr_admin_test',
    playerId: 'ADM1001',
    role: 'ADMIN',
    status: 'ACTIVE'
  };

  const players = [];
  for (let i = 1; i <= 6; i++) {
    const reg = await authService.registerPlayer({
      fullName: `Player ${i}`,
      email: `player${i}.test@example.com`,
      phone: `+91 98200 7000${i}`,
      gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
      sports: ['pickleball', 'paddle_ball', 'box_cricket'],
      password: 'StrongTestPass2026!'
    });
    players.push(reg.user);
  }

  let createdEvent;
  let testSlots;

  // ---------------------------------------------------------------------------
  // SUITE 1: EVENT CREATION, WINDOWS & SLOT GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Event Lifecycle & Auto-Generated Slots ---');

  await runTest('1.1: Create event with configurable sports, windows, and venue', async () => {
    createdEvent = await eventService.createEvent({
      title: 'Championship Round 05',
      eventDate: '2026-11-20',
      startTime: '19:00:00',
      endTime: '21:00:00', // 2 hours = 4 x 30-min slots per court
      venue: 'Jito Central Arena',
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      maxSlotsPerPlayer: 2,
      bookingOpenAt: new Date(Date.now() - 3600 * 1000).toISOString(), // Open now
      bookingCloseAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      confirmationOpenAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      confirmationCloseAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      cancellationDeadline: new Date(Date.now() + 43200 * 1000).toISOString(),
      status: 'DRAFT'
    }, adminUser);

    assert.ok(createdEvent.id, 'Event ID must be generated');
    assert.strictEqual(createdEvent.title, 'Championship Round 05');
    assert.strictEqual(createdEvent.status, 'DRAFT');
    assert.strictEqual(createdEvent.venue, 'Jito Central Arena');
    assert.strictEqual(createdEvent.max_slots_per_player, 2);
  });

  await runTest('1.2: Verify automatic generation of 30-min slots across all courts', async () => {
    testSlots = await bookingService.getEventSlots(createdEvent.id);
    // 10 pickleball courts + 4 paddle courts + 2 box cricket arenas = 16 courts
    // 19:00 to 21:00 = 4 slots of 30 mins each
    // Total slots = 16 * 4 = 64 slots
    assert.strictEqual(testSlots.length, 64, 'Expected exactly 64 slots (16 courts x 4 half-hour blocks)');
    
    // Check sports capacities
    const pbSlot = testSlots.find(s => s.sport_id === 'pickleball');
    const pdSlot = testSlots.find(s => s.sport_id === 'paddle_ball');
    const bcSlot = testSlots.find(s => s.sport_id === 'box_cricket');

    assert.strictEqual(pbSlot.max_capacity, 4, 'Pickleball slot capacity must be 4');
    assert.strictEqual(pdSlot.max_capacity, 4, 'Paddle ball slot capacity must be 4');
    assert.strictEqual(bcSlot.max_capacity, 14, 'Box cricket slot capacity must be 14');
  });

  await runTest('1.3: Publish event transitions status to BOOKING_OPEN when window is active', async () => {
    const published = await eventService.publishEvent(createdEvent.id, adminUser);
    assert.strictEqual(published.status, 'BOOKING_OPEN');
    assert.ok(published.published_at, 'published_at must be populated');
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: EVENT-WISE ATTENDANCE CONFIRMATION
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Event-wise Attendance Confirmation ---');

  await runTest('2.1: Player confirms attendance for the event', async () => {
    const res = await eventService.confirmAttendance(createdEvent.id, players[0].id, 'CONFIRMED');
    assert.strictEqual(res.status, 'CONFIRMED');

    const eventDetails = await eventService.getEventById(createdEvent.id, players[0].id);
    assert.strictEqual(eventDetails.userAttendance, 'CONFIRMED');
    assert.strictEqual(eventDetails.confirmed_attendees, 1);
  });

  let fullSlot;

  await runTest('2.2: Slot booking is rejected if player has NOT confirmed attendance', async () => {
    fullSlot = testSlots.find(s => s.sport_id === 'pickleball');
    assert.ok(fullSlot, 'Pickleball slot must exist');
    // Player 2 has NOT confirmed attendance
    await assert.rejects(
      async () => {
        await bookingService.createBooking({ slotId: fullSlot.id, userId: players[1].id });
      },
      (err) => {
        assert.strictEqual(err.code, 'ATTENDANCE_CONFIRMATION_REQUIRED');
        return true;
      }
    );
  });

  await runTest('2.3: Player confirms attendance and booking succeeds', async () => {
    await eventService.confirmAttendance(createdEvent.id, players[1].id, 'CONFIRMED');
    const res = await bookingService.createBooking({ slotId: fullSlot.id, userId: players[1].id });
    assert.strictEqual(res.status, 'CONFIRMED');
    assert.ok(res.bookingId);
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: CAPACITY BOUNDARIES & WAITLIST PROMOTION ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Capacity Boundaries & Automatic Waitlist ---');

  await runTest('3.1: Fill Pickleball slot up to maximum capacity (4 players)', async () => {
    // Confirm attendance for players 3, 4, 5
    for (let i = 2; i <= 4; i++) {
      await eventService.confirmAttendance(createdEvent.id, players[i].id, 'CONFIRMED');
    }

    // Player 1 is already in fullSlot (1 spot). Now book players 3, 4, 5 into fullSlot
    // Spot 2:
    const b2 = await bookingService.createBooking({ slotId: fullSlot.id, userId: players[2].id });
    assert.strictEqual(b2.status, 'CONFIRMED');

    // Spot 3:
    const b3 = await bookingService.createBooking({ slotId: fullSlot.id, userId: players[3].id });
    assert.strictEqual(b3.status, 'CONFIRMED');

    // Spot 4:
    const b4 = await bookingService.createBooking({ slotId: fullSlot.id, userId: players[4].id });
    assert.strictEqual(b4.status, 'CONFIRMED');

    // Verify slot capacity is now full (4 / 4)
    const slotCheck = await db.get('SELECT booked_count, max_capacity FROM event_slots WHERE id = ?', [fullSlot.id]);
    assert.strictEqual(slotCheck.booked_count, 4);
    assert.strictEqual(slotCheck.max_capacity, 4);
  });

  await runTest('3.2: 5th player booking attempt is automatically routed to Waitlist #1', async () => {
    // Player 6 confirms attendance
    await eventService.confirmAttendance(createdEvent.id, players[5].id, 'CONFIRMED');

    const res = await bookingService.createBooking({ slotId: fullSlot.id, userId: players[5].id });
    assert.strictEqual(res.status, 'WAITLISTED');
    assert.strictEqual(res.queuePosition, 1);
    assert.ok(res.waitlistId);

    // Verify slot booked_count NEVER exceeded max_capacity
    const slotCheck = await db.get('SELECT booked_count FROM event_slots WHERE id = ?', [fullSlot.id]);
    assert.strictEqual(slotCheck.booked_count, 4, 'Booked count must not exceed 4');
  });

  await runTest('3.3: Cancellation of confirmed booking automatically promotes Waitlist #1 player', async () => {
    // Find Player 2's booking in fullSlot
    const bookingToCancel = await db.get(
      `SELECT id FROM bookings WHERE slot_id = ? AND user_id = ? AND status = 'CONFIRMED'`,
      [fullSlot.id, players[1].id]
    );

    // Cancel Player 2's booking
    const cancelRes = await bookingService.cancelBooking(bookingToCancel.id, players[1], { bypassDeadline: true });
    assert.strictEqual(cancelRes.success, true);
    assert.ok(cancelRes.promoted, 'Waitlisted player must be promoted');
    assert.strictEqual(cancelRes.promoted.userId, players[5].id, 'Player 6 should be promoted');

    // Verify Player 6 now has a CONFIRMED booking
    const promotedBooking = await db.get(
      `SELECT id, status FROM bookings WHERE slot_id = ? AND user_id = ?`,
      [fullSlot.id, players[5].id]
    );
    assert.strictEqual(promotedBooking.status, 'CONFIRMED');

    // Verify slot booked_count is STILL 4 (seamless handoff)
    const slotCheck = await db.get('SELECT booked_count FROM event_slots WHERE id = ?', [fullSlot.id]);
    assert.strictEqual(slotCheck.booked_count, 4);
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: DUPLICATE PREVENTION, COLLISION & QUOTA LIMITS
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Duplicate Guards, Schedule Collision & Quotas ---');

  await runTest('4.1: Reject duplicate booking for the same slot', async () => {
    // Player 3 is already booked in fullSlot
    await assert.rejects(
      async () => {
        await bookingService.createBooking({ slotId: fullSlot.id, userId: players[2].id });
      },
      (err) => {
        assert.strictEqual(err.status, 409);
        return true;
      }
    );
  });

  await runTest('4.2: Reject schedule collision (simultaneous booking on different court at same time)', async () => {
    // Find another court slot at the EXACT same time as fullSlot
    const parallelSlot = testSlots.find(
      s => s.id !== fullSlot.id && s.slot_start === fullSlot.slot_start
    );

    await assert.rejects(
      async () => {
        // Player 3 is already booked at fullSlot.slot_start
        await bookingService.createBooking({ slotId: parallelSlot.id, userId: players[2].id });
      },
      (err) => {
        assert.strictEqual(err.code, 'SCHEDULE_COLLISION');
        return true;
      }
    );
  });

  await runTest('4.3: Enforce 2-slot quota limit per event', async () => {
    // Player 3 already has 1 slot (fullSlot). Book a 2nd slot in the next time interval
    const secondIntervalSlot = testSlots.find(
      s => s.slot_start !== fullSlot.slot_start
    );

    const b2 = await bookingService.createBooking({ slotId: secondIntervalSlot.id, userId: players[2].id });
    assert.strictEqual(b2.status, 'CONFIRMED');

    // Attempt to book a 3rd slot -> MUST be rejected by quota limit
    const thirdIntervalSlot = testSlots.find(
      s => s.id !== fullSlot.id && s.id !== secondIntervalSlot.id && s.slot_start !== secondIntervalSlot.slot_start && s.slot_start !== fullSlot.slot_start
    );

    await assert.rejects(
      async () => {
        await bookingService.createBooking({ slotId: thirdIntervalSlot.id, userId: players[2].id });
      },
      (err) => {
        assert.strictEqual(err.code, 'QUOTA_EXCEEDED');
        return true;
      }
    );
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: EVENT MODIFICATION VALIDATION & CANCELLATION CASCADE
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Event Update Validation & Cancellation Cascade ---');

  await runTest('5.1: Reject event date/time modification when active bookings exist', async () => {
    await assert.rejects(
      async () => {
        await eventService.updateEvent(createdEvent.id, { eventDate: '2026-11-25' }, adminUser);
      },
      (err) => {
        assert.match(err.message, /confirmed booking\(s\) exist/);
        return true;
      }
    );
  });

  await runTest('5.2: Postpone event updates event date and logs audit', async () => {
    const postponed = await eventService.postponeEvent(
      createdEvent.id, 
      { newDate: '2026-11-21', reason: 'Unseasonal monsoon rain' },
      adminUser
    );
    assert.strictEqual(postponed.status, 'POSTPONED');
    assert.strictEqual(postponed.event_date, '2026-11-21');
  });

  await runTest('5.3: Cancel event cascades cancellation to all active player bookings', async () => {
    const cancelled = await eventService.cancelEvent(createdEvent.id, 'Venue facility maintenance', adminUser);
    assert.strictEqual(cancelled.status, 'CANCELLED');

    // Verify all bookings for this event are now CANCELLED
    const activeBookings = await db.all(
      `SELECT * FROM bookings WHERE event_id = ? AND status = 'CONFIRMED'`,
      [createdEvent.id]
    );
    assert.strictEqual(activeBookings.length, 0, 'No active bookings should remain');

    // Verify all slots reset to 0 booked count
    const nonZeroSlots = await db.all(
      `SELECT * FROM event_slots WHERE event_id = ? AND booked_count > 0`,
      [createdEvent.id]
    );
    assert.strictEqual(nonZeroSlots.length, 0, 'All slot booked counts must reset to 0');
  });

  // ---------------------------------------------------------------------------
  // SUITE 6: CONCURRENCY, DEADLINES & SPORT-SPECIFIC FORMATS
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Concurrency Safety, Deadlines & Sport Formats ---');

  let deadlineEvent;
  await runTest('6.1: Reject slot booking when past booking_close_at deadline', async () => {
    // Create an event whose booking window has already closed
    deadlineEvent = await eventService.createEvent({
      title: 'Locked Deadline Event',
      eventDate: '2026-11-30',
      startTime: '19:00:00',
      endTime: '20:00:00',
      sportsOffered: ['pickleball', 'box_cricket'],
      bookingOpenAt: '2026-10-01 09:00:00',
      bookingCloseAt: '2026-10-10 19:00:00', // Already closed in the past!
      status: 'BOOKING_CLOSED'
    }, adminUser);

    await eventService.confirmAttendance(deadlineEvent.id, players[0].id, 'CONFIRMED');
    const slots = await bookingService.getEventSlots(deadlineEvent.id);

    await assert.rejects(
      async () => {
        await bookingService.createBooking({ slotId: slots[0].id, userId: players[0].id });
      },
      (err) => {
        assert.match(err.message, /closed|not open/i);
        return true;
      }
    );
  });

  await runTest('6.2: Concurrency Stress Test: 8 concurrent booking requests for 2 remaining spots', async () => {
    // Create fresh open event
    const stressEvent = await eventService.createEvent({
      title: 'Concurrency Stress Event',
      eventDate: '2026-12-05',
      startTime: '19:00:00',
      endTime: '20:00:00',
      sportsOffered: ['pickleball'],
      bookingOpenAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      bookingCloseAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      status: 'BOOKING_OPEN'
    }, adminUser);

    const stressSlots = await bookingService.getEventSlots(stressEvent.id);
    const targetStressSlot = stressSlots[0]; // Pickleball slot (capacity: 4)

    // Pre-fill 2 spots
    await eventService.confirmAttendance(stressEvent.id, players[0].id, 'CONFIRMED');
    await eventService.confirmAttendance(stressEvent.id, players[1].id, 'CONFIRMED');
    await bookingService.createBooking({ slotId: targetStressSlot.id, userId: players[0].id });
    await bookingService.createBooking({ slotId: targetStressSlot.id, userId: players[1].id });

    // Now slot has exactly 2 spots left (2/4 booked).
    // Register 8 more test players and confirm their attendance
    const stressPlayers = [];
    for (let p = 1; p <= 8; p++) {
      const u = await authService.registerPlayer({
        fullName: `Stress Player ${p}`,
        email: `stress${p}_${Date.now()}@example.com`,
        phone: `+91 97000 ${Math.floor(10000 + Math.random() * 90000)}`,
        gender: 'MALE',
        password: 'Password123!'
      });
      stressPlayers.push(u.user);
      await eventService.confirmAttendance(stressEvent.id, u.user.id, 'CONFIRMED');
    }

    // Fire all 8 requests simultaneously via Promise.all
    const promises = stressPlayers.map(user => 
      bookingService.createBooking({ slotId: targetStressSlot.id, userId: user.id })
    );

    const results = await Promise.all(promises);

    const confirmedResults = results.filter(r => r.status === 'CONFIRMED');
    const waitlistedResults = results.filter(r => r.status === 'WAITLISTED');

    // Exactly 2 must be CONFIRMED, exactly 6 must be WAITLISTED
    assert.strictEqual(confirmedResults.length, 2, 'Exactly 2 remaining spots must be confirmed');
    assert.strictEqual(waitlistedResults.length, 6, 'Remaining 6 requests must be routed to waitlist');

    // Verify slot capacity in DB never exceeded 4
    const finalSlot = await db.get('SELECT booked_count, max_capacity FROM event_slots WHERE id = ?', [targetStressSlot.id]);
    assert.strictEqual(finalSlot.booked_count, 4, 'Booked count must be strictly 4');
    assert.strictEqual(finalSlot.max_capacity, 4);

    // Verify waitlist queue positions are ordered 1 to 6
    const waitlistQueue = await db.all(
      'SELECT queue_position FROM waitlists WHERE slot_id = ? ORDER BY queue_position ASC',
      [targetStressSlot.id]
    );
    assert.strictEqual(waitlistQueue.length, 6);
    assert.deepStrictEqual(waitlistQueue.map(w => w.queue_position), [1, 2, 3, 4, 5, 6]);
  });

  await runTest('6.3: Box Cricket format accommodates 14 player spots per squad slot', async () => {
    const cricketEvent = await eventService.createEvent({
      title: 'Box Cricket Mega Match',
      eventDate: '2026-12-15',
      startTime: '19:00:00',
      endTime: '20:00:00',
      sportsOffered: ['box_cricket'],
      bookingOpenAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      bookingCloseAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      maxSlotsPerPlayer: 2,
      status: 'BOOKING_OPEN'
    }, adminUser);

    const cricketSlots = await bookingService.getEventSlots(cricketEvent.id, 'box_cricket');
    assert.strictEqual(cricketSlots[0].max_capacity, 14, 'Box cricket slot must have max_capacity = 14');
  });
  console.log('\n================================================================');
  console.log(` TEST RUN COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[FATAL TEST SUITE ERROR]', err);
  process.exit(1);
});
