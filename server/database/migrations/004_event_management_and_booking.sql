-- ==============================================================================
-- MIGRATION 004: Event Management & Configurable Booking Windows
-- ==============================================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS events_new (
    id TEXT PRIMARY KEY,
    event_number INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    venue TEXT NOT NULL DEFAULT 'Jito Multisports Complex, Main Arena',
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '19:00:00',
    end_time TEXT NOT NULL DEFAULT '22:00:00',
    sports_offered TEXT NOT NULL DEFAULT '["pickleball","paddle_ball","box_cricket"]',
    published_at TIMESTAMP,
    confirmation_open_at TIMESTAMP,
    confirmation_close_at TIMESTAMP,
    booking_open_at TIMESTAMP NOT NULL,
    booking_close_at TIMESTAMP NOT NULL,
    cancellation_deadline TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'UPCOMING', 'CONFIRMATION_OPEN', 'BOOKING_OPEN', 'BOOKING_CLOSED', 'SCHEDULE_PUBLISHED', 'POSTPONED', 'CANCELLED', 'ARCHIVED', 'COMPLETED')),
    max_slots_per_player INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO events_new (
    id, event_number, title, description, venue, event_date, start_time, end_time,
    sports_offered, published_at, confirmation_open_at, confirmation_close_at,
    booking_open_at, booking_close_at, cancellation_deadline, status, max_slots_per_player,
    created_at, updated_at
)
SELECT 
    id, 
    event_number, 
    title, 
    'The inaugural round of the 2026–2027 Community Multisports Championship. Permanent player registrations and attendance confirmations are currently open.',
    'Jito Multisports Complex, Main Arena',
    event_date, 
    start_time, 
    end_time,
    '["pickleball","paddle_ball","box_cricket"]',
    '2026-10-15 09:00:00',
    '2026-10-15 09:00:00',
    '2026-10-22 09:00:00',
    booking_open_at, 
    booking_close_at, 
    '2026-10-27 19:00:00',
    status, 
    max_slots_per_player,
    created_at, 
    updated_at
FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

PRAGMA foreign_keys = ON;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_confirmations_user_event ON event_confirmations(user_id, event_id);
