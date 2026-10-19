-- ==============================================================================
-- MIGRATION 003: Seed Demo Player & Coordinator Accounts and Sample Slots
-- ==============================================================================

-- 1. Demo Player: Arjun Mehta (MP1001)
INSERT OR IGNORE INTO users (
    id, player_id, full_name, email, phone, gender, date_of_birth, age_group,
    password_hash, role, status, emergency_contact
) VALUES (
    'usr_demo_arjun',
    'MP1001',
    'Arjun Mehta',
    'arjun.mehta@example.com',
    '+91 98200 12345',
    'MALE',
    '1994-06-15',
    '26-35',
    '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', -- DemoPlayer@2026
    'PLAYER',
    'ACTIVE',
    'Ramesh Mehta (+91 98200 99999)'
);

INSERT OR IGNORE INTO player_preferences (
    user_id, plays_pickleball, plays_paddle, plays_box_cricket,
    skill_level_pickleball, skill_level_paddle, skill_level_cricket, notes
) VALUES (
    'usr_demo_arjun', 1, 0, 1, 'INTERMEDIATE', 'INTERMEDIATE', 'ADVANCED',
    'Prefers evening doubles pickleball matches.'
);

-- 2. Demo Player: Pooja Shah (FP1002)
INSERT OR IGNORE INTO users (
    id, player_id, full_name, email, phone, gender, date_of_birth, age_group,
    password_hash, role, status, emergency_contact
) VALUES (
    'usr_demo_pooja',
    'FP1002',
    'Pooja Shah',
    'pooja.shah@example.com',
    '+91 98200 67890',
    'FEMALE',
    '2001-09-22',
    '18-25',
    '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', -- DemoPlayer@2026
    'PLAYER',
    'ACTIVE',
    'Kavita Shah (+91 98200 88888)'
);

INSERT OR IGNORE INTO player_preferences (
    user_id, plays_pickleball, plays_paddle, plays_box_cricket,
    skill_level_pickleball, skill_level_paddle, skill_level_cricket, notes
) VALUES (
    'usr_demo_pooja', 1, 1, 0, 'BEGINNER', 'ADVANCED', 'INTERMEDIATE',
    'Active paddle player, enjoys mixed doubles.'
);

-- 3. Demo Coordinator: Priya Patel (COORD1001)
INSERT OR IGNORE INTO users (
    id, player_id, full_name, email, phone, gender, date_of_birth, age_group,
    password_hash, role, status, emergency_contact
) VALUES (
    'usr_demo_coord',
    'COORD1001',
    'Priya Patel',
    'coordinator@jito.org',
    '+91 98200 55555',
    'FEMALE',
    '1990-03-10',
    '26-35',
    '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', -- DemoPlayer@2026
    'COORDINATOR',
    'ACTIVE',
    'Staff Coordinator Desk'
);

-- 4. Additional Sample Players for Rich Admin Heatmap & Directory
INSERT OR IGNORE INTO users (
    id, player_id, full_name, email, phone, gender, age_group, password_hash, role, status
) VALUES 
    ('usr_demo_vikram', 'MP1003', 'Vikram Singhania', 'vikram.s@example.com', '+91 98111 22233', 'MALE', '36-50', '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', 'PLAYER', 'ACTIVE'),
    ('usr_demo_ananya', 'FP1004', 'Ananya Deshmukh', 'ananya.d@example.com', '+91 98111 44455', 'FEMALE', '18-25', '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', 'PLAYER', 'ACTIVE'),
    ('usr_demo_rohit', 'MP1005', 'Rohit Kothari', 'rohit.k@example.com', '+91 98111 66677', 'MALE', '26-35', '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', 'PLAYER', 'ACTIVE'),
    ('usr_demo_meera', 'FP1006', 'Meera Jain', 'meera.jain@example.com', '+91 98111 88899', 'FEMALE', '26-35', '$2b$10$fDHO7C4Zv8gLd9b62ZDA2eBCFUhuXwld82/2kQAQUzJNSU1G.RlR6', 'PLAYER', 'ACTIVE');

INSERT OR IGNORE INTO player_preferences (user_id, plays_pickleball, plays_paddle, plays_box_cricket, skill_level_pickleball)
VALUES 
    ('usr_demo_vikram', 1, 1, 0, 'ADVANCED'),
    ('usr_demo_ananya', 1, 0, 1, 'INTERMEDIATE'),
    ('usr_demo_rohit', 0, 0, 1, 'ADVANCED'),
    ('usr_demo_meera', 1, 1, 0, 'INTERMEDIATE');

-- 5. Seed Event #1 30-Minute Slots across Courts 1-10 for Pickleball
INSERT OR IGNORE INTO event_slots (id, event_id, court_id, sport_id, slot_start, slot_end, max_capacity, booked_count)
VALUES
    ('slt_01_c1_1900', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 19:00:00', '2026-10-29 19:30:00', 4, 3),
    ('slt_01_c1_1930', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 19:30:00', '2026-10-29 20:00:00', 4, 4), -- FULL
    ('slt_01_c1_2000', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 20:00:00', '2026-10-29 20:30:00', 4, 2),
    ('slt_01_c1_2030', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 20:30:00', '2026-10-29 21:00:00', 4, 1),
    ('slt_01_c1_2100', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 21:00:00', '2026-10-29 21:30:00', 4, 2),
    ('slt_01_c1_2130', 'evt_001', 'crt_pb_01', 'pickleball', '2026-10-29 21:30:00', '2026-10-29 22:00:00', 4, 0),

    ('slt_01_c2_1900', 'evt_001', 'crt_pb_02', 'pickleball', '2026-10-29 19:00:00', '2026-10-29 19:30:00', 4, 4), -- FULL
    ('slt_01_c2_1930', 'evt_001', 'crt_pb_02', 'pickleball', '2026-10-29 19:30:00', '2026-10-29 20:00:00', 4, 2),
    ('slt_01_c2_2000', 'evt_001', 'crt_pb_02', 'pickleball', '2026-10-29 20:00:00', '2026-10-29 20:30:00', 4, 3),

    ('slt_01_c3_1900', 'evt_001', 'crt_pb_03', 'pickleball', '2026-10-29 19:00:00', '2026-10-29 19:30:00', 4, 1),
    ('slt_01_c3_1930', 'evt_001', 'crt_pb_03', 'pickleball', '2026-10-29 19:30:00', '2026-10-29 20:00:00', 4, 2);

-- 6. Sample Bookings for Demonstration of Capacity
INSERT OR IGNORE INTO bookings (id, slot_id, user_id, event_id, status)
VALUES
    ('bkg_001', 'slt_01_c1_1900', 'usr_demo_arjun', 'evt_001', 'CONFIRMED'),
    ('bkg_002', 'slt_01_c1_1900', 'usr_demo_pooja', 'evt_001', 'CONFIRMED'),
    ('bkg_003', 'slt_01_c1_1900', 'usr_demo_vikram', 'evt_001', 'CONFIRMED'),
    ('bkg_004', 'slt_01_c1_1930', 'usr_demo_arjun', 'evt_001', 'CONFIRMED'), -- Arjun's 2nd slot (max 2 rule satisfied)
    ('bkg_005', 'slt_01_c1_1930', 'usr_demo_ananya', 'evt_001', 'CONFIRMED'),
    ('bkg_006', 'slt_01_c1_1930', 'usr_demo_rohit', 'evt_001', 'CONFIRMED'),
    ('bkg_007', 'slt_01_c1_1930', 'usr_demo_meera', 'evt_001', 'CONFIRMED');
