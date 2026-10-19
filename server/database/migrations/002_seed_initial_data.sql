-- ==============================================================================
-- MIGRATION 002: Seed Sports, Courts and Inaugural Event
-- ==============================================================================

-- 1. Insert Sports
INSERT OR IGNORE INTO sports (id, display_name, default_reservation_mode, default_player_capacity, total_courts, slot_duration_min)
VALUES 
    ('pickleball', 'Pickleball', 'INDIVIDUAL_SPOT', 4, 10, 30),
    ('paddle_ball', 'Paddle Ball (Pádel)', 'INDIVIDUAL_SPOT', 4, 4, 30),
    ('box_cricket', 'Box Cricket', 'INDIVIDUAL_SPOT', 14, 2, 30);

-- 2. Insert Pickleball Courts (1 to 10)
INSERT OR IGNORE INTO courts (id, sport_id, court_number, name, is_active)
VALUES
    ('crt_pb_01', 'pickleball', 1, 'Pickleball Court 1', 1),
    ('crt_pb_02', 'pickleball', 2, 'Pickleball Court 2', 1),
    ('crt_pb_03', 'pickleball', 3, 'Pickleball Court 3', 1),
    ('crt_pb_04', 'pickleball', 4, 'Pickleball Court 4', 1),
    ('crt_pb_05', 'pickleball', 5, 'Pickleball Court 5', 1),
    ('crt_pb_06', 'pickleball', 6, 'Pickleball Court 6', 1),
    ('crt_pb_07', 'pickleball', 7, 'Pickleball Court 7', 1),
    ('crt_pb_08', 'pickleball', 8, 'Pickleball Court 8', 1),
    ('crt_pb_09', 'pickleball', 9, 'Pickleball Court 9', 1),
    ('crt_pb_10', 'pickleball', 10, 'Pickleball Court 10', 1);

-- 3. Insert Paddle Courts (1 to 4)
INSERT OR IGNORE INTO courts (id, sport_id, court_number, name, is_active)
VALUES
    ('crt_pd_01', 'paddle_ball', 1, 'Paddle Glass Court 1', 1),
    ('crt_pd_02', 'paddle_ball', 2, 'Paddle Glass Court 2', 1),
    ('crt_pd_03', 'paddle_ball', 3, 'Paddle Glass Court 3', 1),
    ('crt_pd_04', 'paddle_ball', 4, 'Paddle Glass Court 4', 1);

-- 4. Insert Box Cricket Arenas (1 to 2)
INSERT OR IGNORE INTO courts (id, sport_id, court_number, name, is_active)
VALUES
    ('crt_bc_01', 'box_cricket', 1, 'Turf Cricket Arena A', 1),
    ('crt_bc_02', 'box_cricket', 2, 'Turf Cricket Arena B', 1);

-- 5. Insert Event 1: Opening Night (29 October 2026)
INSERT OR IGNORE INTO events (
    id, event_number, title, event_date, start_time, end_time,
    booking_open_at, booking_close_at, status, max_slots_per_player
)
VALUES (
    'evt_001', 
    1, 
    'Jito Multisports Series: Opening Night', 
    '2026-10-29', 
    '19:00:00', 
    '22:00:00',
    '2026-10-22 09:00:00', 
    '2026-10-27 19:00:00', 
    'BOOKING_OPEN', 
    2
);
