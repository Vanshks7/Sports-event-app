-- ==============================================================================
-- MIGRATION 001: Initial Schema Definition
-- Community Multisports Booking Portal (Jito Sports Series 2026-2027)
-- ==============================================================================

-- 1. Permanent Player & User Accounts
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    player_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth TEXT,
    age_group TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'PLAYER' CHECK(role IN ('PLAYER', 'COORDINATOR', 'ADMIN')),
    status TEXT NOT NULL DEFAULT 'PENDING_PASSWORD' CHECK(status IN ('PENDING_PASSWORD', 'ACTIVE', 'SUSPENDED')),
    emergency_contact TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Player Sports Preferences
CREATE TABLE IF NOT EXISTS player_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plays_pickleball INTEGER NOT NULL DEFAULT 0,
    plays_paddle INTEGER NOT NULL DEFAULT 0,
    plays_box_cricket INTEGER NOT NULL DEFAULT 0,
    skill_level_pickleball TEXT DEFAULT 'INTERMEDIATE',
    skill_level_paddle TEXT DEFAULT 'INTERMEDIATE',
    skill_level_cricket TEXT DEFAULT 'INTERMEDIATE',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Password Setup & Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sports Configuration
CREATE TABLE IF NOT EXISTS sports (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    default_reservation_mode TEXT NOT NULL DEFAULT 'INDIVIDUAL_SPOT',
    default_player_capacity INTEGER NOT NULL,
    total_courts INTEGER NOT NULL DEFAULT 1,
    slot_duration_min INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Courts Infrastructure
CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,
    sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    court_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sport_id, court_number)
);

-- 6. Events & 15-Day Cadence Engine
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    event_number INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '19:00:00',
    end_time TEXT NOT NULL DEFAULT '22:00:00',
    booking_open_at TIMESTAMP NOT NULL,
    booking_close_at TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'UPCOMING', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'SCHEDULE_PUBLISHED', 'COMPLETED', 'CANCELLED')),
    max_slots_per_player INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Event-wise Attendance Confirmations
CREATE TABLE IF NOT EXISTS event_confirmations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'DECLINED', 'TENTATIVE')),
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- 8. 30-Minute Event Slots with Strict Capacity Checks
CREATE TABLE IF NOT EXISTS event_slots (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    court_id TEXT NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
    sport_id TEXT NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
    slot_start TIMESTAMP NOT NULL,
    slot_end TIMESTAMP NOT NULL,
    max_capacity INTEGER NOT NULL,
    booked_count INTEGER NOT NULL DEFAULT 0,
    lock_version INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK(booked_count >= 0 AND booked_count <= max_capacity),
    UNIQUE(court_id, slot_start, slot_end)
);

-- 9. Player Bookings & Quotas
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES event_slots(id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'CANCELLED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    UNIQUE(slot_id, user_id)
);

-- 10. Waitlist Queue
CREATE TABLE IF NOT EXISTS waitlists (
    id TEXT PRIMARY KEY,
    slot_id TEXT NOT NULL REFERENCES event_slots(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    is_notified INTEGER NOT NULL DEFAULT 0,
    promoted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_id, user_id)
);

-- 11. Audit Logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    slot_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_player_id ON users(player_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_user_event ON bookings(user_id, event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_slots_event ON event_slots(event_id, sport_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_waitlists_slot_queue ON waitlists(slot_id, queue_position);
