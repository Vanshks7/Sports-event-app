/**
 * DATA & STATE REPOSITORY
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const CommunityData = {
  // 1. SPORTS METADATA
  sports: [
    {
      id: 'pickleball',
      name: 'Pickleball',
      tagline: 'High-energy, fast-paced court game with paddles & perforated ball',
      image: 'assets/images/pickleball.jpg',
      badgeColor: 'badge-cyan',
      defaultFormat: 'Doubles (2 vs 2)',
      capacityPerCourt: 4,
      totalCourts: 10,
      slotDurationMin: 30,
      courtType: 'Dedicated Hardcourt with Non-Volley Zone (Kitchen)',
      equipmentProvided: 'Official Franklin X-40 balls & Selkirk composite paddles',
      description: 'Pickleball combines elements of tennis, badminton, and ping-pong. Played on a badminton-sized court with a lowered net, each 30-minute court slot accommodates four players in dynamic doubles play. Players rotate and build community connections every 15 days.',
      rules: [
        'Each 30-minute court slot accommodates exactly 4 player appearances.',
        'Serves must be underhand and made diagonally crosscourt.',
        'The Two-Bounce Rule is strictly in effect: both serve and return must bounce.',
        'Volleys are prohibited within the 7-foot Non-Volley Zone (the Kitchen).'
      ],
      capacityNote: '10 courts × 6 slots × 4 players = up to 240 player appearances per 3-hour evening.'
    },
    {
      id: 'paddle_ball',
      name: 'Paddle Ball (Pádel)',
      tagline: 'Strategic enclosed glass-court sport with solid perforated racquets',
      image: 'assets/images/paddle.jpg',
      badgeColor: 'badge-amber',
      defaultFormat: 'Doubles (2 vs 2)',
      capacityPerCourt: 4,
      totalCourts: 4,
      slotDurationMin: 30,
      courtType: 'Enclosed Glass Wall Arena with Blue Synthetic Turf',
      equipmentProvided: 'Carbon fibre paddle racquets & low-compression pressureless balls',
      description: 'Paddle Tennis (Pádel) is played in an enclosed glass court roughly a third the size of a standard tennis court. The walls are part of the game, creating thrilling rebounds, tactical positioning, and accessible, high-energy rallies for all age groups.',
      rules: [
        'Enclosed glass walls are in play; balls can be struck after rebounding off glass.',
        'Standard doubles format with 4 players per court.',
        'Underhand serve must bounce once in the server’s box before striking.',
        'Points scored following standard tennis scoring convention.'
      ],
      capacityNote: 'Enclosed court format requiring fast reflexes; reservations managed per player spot.'
    },
    {
      id: 'box_cricket',
      name: 'Box Cricket',
      tagline: 'Thrilling indoor turf arena cricket with high-intensity action',
      image: 'assets/images/box_cricket.jpg',
      badgeColor: 'badge-emerald',
      defaultFormat: 'Team Squad (6v6 or 8v8)',
      capacityPerCourt: 14,
      totalCourts: 2,
      slotDurationMin: 30,
      courtType: 'All-Weather High-Density Turf Cage Arena with Overhead Nets',
      equipmentProvided: 'Tennis light/heavy balls, Kashmir willow bats, protective gear',
      description: 'Box Cricket brings the passion of cricket into a high-speed, netted arena. With boundaries padded and nets directly in play, every ball creates action. Individual registrations are aggregated into event match squads drafted by tournament directors.',
      rules: [
        'Direct hit on top net is out or single-run depending on arena local rules.',
        'Overhead netting keeps ball continuously in play—no dead balls on perimeter touches.',
        'Every player in the squad bowls minimum 1 over.',
        'Organiser-drafted squads ensure fair and competitive community pairings.'
      ],
      capacityNote: 'Accommodates 12 to 16 players per match slot; individual pool registrations.'
    }
  ],

  // 2. YEAR-LONG EVENT CADENCE (October 2026 - October 2027)
  // Run one event approximately every 15 days (~24 rounds)
  events: [
    {
      id: 1,
      round: 'Round 01 — Series Kickoff',
      title: 'Jito Multisports Series: Opening Night',
      date: '2026-10-29',
      displayDate: 'Thursday, 29 October 2026',
      time: '7:00 PM – 10:00 PM (180 mins)',
      venue: 'Jito Multisports Complex, Main Arena (Courts 1–10 + Turf Box)',
      status: 'REGISTRATION_OPEN',
      statusLabel: 'Phase 1 Registration Open',
      statusBadgeClass: 'badge-cyan',
      bookingWindow: {
        opens: '2026-10-22T09:00:00',
        displayOpens: '22 Oct 2026, 09:00 AM (T-7 Days)',
        closes: '2026-10-27T19:00:00',
        displayCloses: '27 Oct 2026, 07:00 PM (T-48 Hours - Lock)',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'The inaugural round of the 2026–2027 Community Multisports Championship. Permanent player registrations are currently open. Bookings for specific 30-minute slots will unlock 7 days before the event.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 2,
      round: 'Round 02',
      title: 'Fortnightly Series: Autumn Rally',
      date: '2026-11-12',
      displayDate: 'Thursday, 12 November 2026',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Upcoming Event',
      statusBadgeClass: 'badge-purple',
      bookingWindow: {
        opens: '2026-11-05T09:00:00',
        displayOpens: '05 Nov 2026, 09:00 AM (T-7 Days)',
        closes: '2026-11-10T19:00:00',
        displayCloses: '10 Nov 2026, 07:00 PM (T-48 Hours)',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'Round 2 of the series. Registered players will receive an attendance confirmation invitation one week prior.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 3,
      round: 'Round 03',
      title: 'Fortnightly Series: Winter Warmup',
      date: '2026-11-26',
      displayDate: 'Thursday, 26 November 2026',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Upcoming Event',
      statusBadgeClass: 'badge-purple',
      bookingWindow: {
        opens: '2026-11-19T09:00:00',
        displayOpens: '19 Nov 2026, 09:00 AM',
        closes: '2026-11-24T19:00:00',
        displayCloses: '24 Nov 2026, 07:00 PM',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'Round 3 of the community sports calendar.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 4,
      round: 'Round 04',
      title: 'December Championship Clash',
      date: '2026-12-10',
      displayDate: 'Thursday, 10 December 2026',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Upcoming Event',
      statusBadgeClass: 'badge-purple',
      bookingWindow: {
        opens: '2026-12-03T09:00:00',
        displayOpens: '03 Dec 2026, 09:00 AM',
        closes: '2026-12-08T19:00:00',
        displayCloses: '08 Dec 2026, 07:00 PM',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'Mid-season championship fixtures.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 5,
      round: 'Round 05',
      title: 'Year-End Community Invitational',
      date: '2026-12-24',
      displayDate: 'Thursday, 24 December 2026',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Upcoming Event',
      statusBadgeClass: 'badge-purple',
      bookingWindow: {
        opens: '2026-12-17T09:00:00',
        displayOpens: '17 Dec 2026, 09:00 AM',
        closes: '2026-12-22T19:00:00',
        displayCloses: '22 Dec 2026, 07:00 PM',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'Holiday celebration sports evening.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 6,
      round: 'Round 06',
      title: 'New Year Kickoff Meet',
      date: '2027-01-07',
      displayDate: 'Thursday, 07 January 2027',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Upcoming Event',
      statusBadgeClass: 'badge-purple',
      bookingWindow: {
        opens: '2026-12-31T09:00:00',
        displayOpens: '31 Dec 2026, 09:00 AM',
        closes: '2027-01-05T19:00:00',
        displayCloses: '05 Jan 2027, 07:00 PM',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'First event of 2027.',
      totalSlots: 60,
      isDemonstration: true
    },
    {
      id: 12,
      round: 'Round 12',
      title: 'Mid-Series Spring Festival',
      date: '2027-04-01',
      displayDate: 'Thursday, 01 April 2027',
      time: '7:00 PM – 10:00 PM',
      venue: 'Jito Multisports Complex, Main Arena',
      status: 'UPCOMING',
      statusLabel: 'Spring 2027 Cadence',
      statusBadgeClass: 'badge-muted',
      bookingWindow: {
        opens: '2027-03-25T09:00:00',
        displayOpens: '25 Mar 2027, 09:00 AM',
        closes: '2027-03-30T19:00:00',
        displayCloses: '30 Mar 2027, 07:00 PM',
        isBookingActive: false
      },
      sportsOffered: ['pickleball', 'paddle_ball', 'box_cricket'],
      description: 'Highlighting the core concept: "Don\'t ask for an April commitment in October. Collect the community now; ask for reliable commitment closer to each event."',
      totalSlots: 60,
      isDemonstration: true
    }
  ],

  // 3. REALISTIC DEMONSTRATION SLOT MATRIX (EVENT #1 PREVIEW)
  // Demonstrates the 10 courts x 6 slots = 60 court-slots model
  demoSlots: [
    { timeId: '1900', label: '07:00 PM – 07:30 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 2 },
    { timeId: '1930', label: '07:30 PM – 08:00 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 3 },
    { timeId: '2000', label: '08:00 PM – 08:30 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 4 }, // Full
    { timeId: '2030', label: '08:30 PM – 09:00 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 1 },
    { timeId: '2100', label: '09:00 PM – 09:30 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 2 },
    { timeId: '2130', label: '09:30 PM – 10:00 PM', court: 1, sport: 'pickleball', maxCapacity: 4, demoBooked: 0 }
  ]
};

// 4. CLIENT-SIDE LOCAL STORAGE REPOSITORY (PROTOTYPE STORE)
const DB = {
  PLAYERS_KEY: 'jito_sports_players_v1',
  CURRENT_USER_KEY: 'jito_sports_current_user_v1',

  init() {
    // Seed default sample players if storage empty
    if (!localStorage.getItem(this.PLAYERS_KEY)) {
      const seedPlayers = [
        {
          id: 'user_001',
          playerId: 'MP1001',
          fullName: 'Arjun Mehta',
          email: 'arjun.mehta@example.com',
          phone: '+91 98200 12345',
          gender: 'MALE',
          ageGroup: '26-35',
          sports: ['pickleball', 'box_cricket'],
          skillLevel: { pickleball: 'INTERMEDIATE', box_cricket: 'ADVANCED' },
          registeredAt: '2026-10-15T10:00:00Z',
          password: 'DemoPlayer@2026',
          role: 'PLAYER',
          status: 'ACTIVE'
        },
        {
          id: 'user_002',
          playerId: 'FP1002',
          fullName: 'Pooja Shah',
          email: 'pooja.shah@example.com',
          phone: '+91 98200 67890',
          gender: 'FEMALE',
          ageGroup: '18-25',
          sports: ['paddle_ball', 'pickleball'],
          skillLevel: { paddle_ball: 'ADVANCED', pickleball: 'BEGINNER' },
          registeredAt: '2026-10-16T11:30:00Z',
          password: 'DemoPlayer@2026',
          role: 'PLAYER',
          status: 'ACTIVE'
        },
        {
          id: 'user_admin',
          playerId: 'ADM1001',
          fullName: 'Root Administrator',
          email: 'admin@jito.org',
          phone: '+91 98200 00000',
          gender: 'OTHER',
          role: 'ADMIN',
          password: 'AdminRootSecure2026!',
          status: 'ACTIVE'
        }
      ];
      localStorage.setItem(this.PLAYERS_KEY, JSON.stringify(seedPlayers));
    }
  },

  getPlayers() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.PLAYERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  async registerPlayer(playerData) {
    // Attempt backend API call if reachable
    try {
      if (window.location.protocol.startsWith('http')) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(playerData)
        });
        const resData = await response.json();
        if (!response.ok) {
          const err = new Error(resData.error || 'Registration failed.');
          err.status = response.status;
          err.existingPlayerId = resData.existingPlayerId;
          throw err;
        }
        if (resData.token) {
          localStorage.setItem('jito_jwt_token', resData.token);
          localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
            ...resData.user,
            playerId: resData.user.player_id,
            fullName: resData.user.full_name
          }));
        }
        return {
          ...resData.user,
          playerId: resData.user.player_id,
          fullName: resData.user.full_name,
          setupToken: resData.setupToken,
          token: resData.token
        };
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('fetch')) {
        throw apiErr;
      }
      // Fallback to local storage if API is offline
    }

    const players = this.getPlayers();
    
    // Check if email or phone already registered
    const existing = players.find(p => 
      p.email.toLowerCase() === playerData.email.toLowerCase() || 
      p.phone.replace(/\D/g, '') === playerData.phone.replace(/\D/g, '')
    );
    if (existing) {
      throw new Error(`A player with email (${playerData.email}) or phone (${playerData.phone}) is already registered with Player ID: ${existing.playerId}.`);
    }

    // Generate unique Player ID (e.g. MP1003 or FP1003)
    const prefix = playerData.gender === 'FEMALE' ? 'FP' : (playerData.gender === 'MALE' ? 'MP' : 'JP');
    const nextSeq = 1000 + players.length + 1;
    const playerId = `${prefix}${nextSeq}`;

    const newPlayer = {
      id: 'user_' + Date.now(),
      playerId: playerId,
      fullName: playerData.fullName,
      email: playerData.email.toLowerCase().trim(),
      phone: playerData.phone.trim(),
      gender: playerData.gender,
      ageGroup: playerData.ageGroup || 'Not specified',
      emergencyContact: playerData.emergencyContact || '',
      sports: playerData.sports || [],
      skillLevel: playerData.skillLevel || {},
      registeredAt: new Date().toISOString(),
      password: playerData.password || null,
      status: playerData.password ? 'ACTIVE' : 'PENDING_PASSWORD'
    };

    players.push(newPlayer);
    localStorage.setItem(this.PLAYERS_KEY, JSON.stringify(players));
    return newPlayer;
  },

  getApiBaseUrl() {
    if (window.location.protocol.startsWith('http')) {
      return '';
    }
    return 'http://localhost:5000';
  },

  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Player ID/Email and password are required.');
    }

    const baseUrl = this.getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Invalid Player ID / Email or password.');
      }
      localStorage.setItem('jito_jwt_token', resData.token);
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify({
        ...resData.user,
        playerId: resData.user.player_id,
        fullName: resData.user.full_name
      }));
      return resData.user;
    } catch (apiErr) {
      // If server returned an error (401, 403, 400), RE-THROW IMMEDIATELY! Do NOT fall back!
      const msg = (apiErr.message || '').toLowerCase();
      if (!msg.includes('failed to fetch') && !msg.includes('networkerror') && !msg.includes('connection refused')) {
        throw apiErr;
      }
      // If and only if the server is offline / unreachable, verify against local repository
      return this.fallbackLocalLogin(identifier, password);
    }
  },

  fallbackLocalLogin(identifier, password) {
    if (!password) {
      throw new Error('Password is required.');
    }

    const players = this.getPlayers();
    const cleanId = identifier.trim().toLowerCase();
    const user = players.find(p => 
      (p.playerId && p.playerId.toLowerCase() === cleanId) || 
      (p.email && p.email.toLowerCase() === cleanId)
    );

    if (!user) {
      throw new Error('Invalid Player ID / Email or password.');
    }

    // STRICT PASSWORD VERIFICATION — no default/fallback passwords permitted
    if (!user.password) {
      throw new Error('Account password has not been established. Use the password setup link to activate your account.');
    }
    if (password !== user.password) {
      throw new Error('Invalid Player ID / Email or password.');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Your account has been suspended by an administrator.');
    }

    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    localStorage.removeItem('jito_jwt_token');
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.CURRENT_USER_KEY));
    } catch (e) {
      return null;
    }
  },

  getSports() {
    return CommunityData.sports;
  },

  getSportById(sportId) {
    return CommunityData.sports.find(s => s.id === sportId) || CommunityData.sports[0];
  },

  async getEvents() {
    if (window.location.protocol.startsWith('http')) {
      try {
        const token = localStorage.getItem('jito_jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/events', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            return data.events.map(ev => ({
              ...ev,
              round: `Round ${String(ev.event_number).padStart(2, '0')}`,
              displayDate: ev.event_date,
              time: `${ev.start_time.substring(0, 5)} – ${ev.end_time.substring(0, 5)}`,
              statusLabel: ev.status.replace(/_/g, ' '),
              statusBadgeClass: ev.status === 'BOOKING_OPEN' ? 'badge-cyan' : (ev.status === 'CANCELLED' ? 'badge-rose' : 'badge-purple'),
              bookingWindow: {
                displayOpens: ev.booking_open_at,
                displayCloses: ev.booking_close_at,
                isBookingActive: ev.status === 'BOOKING_OPEN'
              }
            }));
          }
        }
      } catch (e) {
        console.warn('API error in getEvents, falling back to local data:', e);
      }
    }
    return CommunityData.events;
  },

  async getEventById(id) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const token = localStorage.getItem('jito_jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`/api/events/${id}`, { headers });
        if (res.ok) {
          const ev = await res.json();
          return {
            ...ev,
            round: `Round ${String(ev.event_number).padStart(2, '0')}`,
            displayDate: ev.event_date,
            time: `${ev.start_time.substring(0, 5)} – ${ev.end_time.substring(0, 5)}`,
            statusLabel: ev.status.replace(/_/g, ' '),
            statusBadgeClass: ev.status === 'BOOKING_OPEN' ? 'badge-cyan' : (ev.status === 'CANCELLED' ? 'badge-rose' : 'badge-purple'),
            bookingWindow: {
              displayOpens: ev.booking_open_at,
              displayCloses: ev.booking_close_at,
              isBookingActive: ev.status === 'BOOKING_OPEN'
            }
          };
        }
      } catch (e) {
        console.warn('API error in getEventById, falling back to local data:', e);
      }
    }
    const numId = parseInt(id, 10);
    return CommunityData.events.find(e => e.id === numId || e.id === id) || CommunityData.events[0];
  },

  async confirmAttendance(eventId, status) {
    const token = localStorage.getItem('jito_jwt_token');
    if (!token) throw new Error('Please log in as a registered player to confirm attendance.');
    const res = await fetch(`/api/events/${eventId}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update attendance.');
    return data;
  },

  async getEventSlots(eventId, sport = null) {
    let url = `/api/events/${eventId}/slots`;
    if (sport) url += `?sport=${sport}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.slots || [];
    }
    return [];
  },

  async bookSlot(slotId) {
    const token = localStorage.getItem('jito_jwt_token');
    if (!token) throw new Error('Please log in to reserve a court slot.');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ slotId })
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to reserve slot.');
      err.code = data.code;
      throw err;
    }
    return data;
  },

  async cancelBooking(bookingId) {
    const token = localStorage.getItem('jito_jwt_token');
    if (!token) throw new Error('Please log in.');
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel booking.');
    return data;
  }
};

// Initialize DB on script load
DB.init();
