/**
 * REUSABLE UI COMPONENTS
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const UI = {
  /**
   * Renders the shared navigation header into an element with id="site-header"
   * @param {string} activePage - 'home', 'sports', 'events', 'event-detail', 'register', 'login', 'help'
   */
  renderNavbar(activePage = 'home') {
    const headerContainer = document.getElementById('site-header');
    if (!headerContainer) return;

    const currentUser = DB.getCurrentUser();
    const isStaff = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'COORDINATOR');

    headerContainer.className = 'site-header';
    headerContainer.innerHTML = `
      <div class="container nav-container">
        <a href="index.html" class="brand-logo" aria-label="Community Multisports Home">
          <div class="brand-icon">🏆</div>
          <div class="brand-title">
            COMMUNITY SPORTS
            <span>Jito Series 2026–2027</span>
          </div>
        </a>

        <nav class="nav-menu" aria-label="Main Navigation">
          <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
          <a href="sports.html" class="nav-link ${activePage === 'sports' ? 'active' : ''}">Sports</a>
          <a href="events.html" class="nav-link ${activePage === 'events' ? 'active' : ''}">Events Calendar</a>
          <a href="help.html" class="nav-link ${activePage === 'help' ? 'active' : ''}">Help & Rules</a>
          ${isStaff ? `
            <a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}" style="color: var(--accent-amber); font-weight: 700;">
              🛡️ Admin Control Panel
            </a>
          ` : ''}
        </nav>

        <div class="nav-actions">
          ${currentUser ? `
            <div class="user-badge-nav">
              <span class="player-id-chip" style="${isStaff ? 'background: var(--accent-amber-dim); color: var(--accent-amber);' : ''}">
                ${currentUser.playerId || currentUser.player_id}
              </span>
              <span class="user-name">${(currentUser.fullName || currentUser.full_name || 'Player').split(' ')[0]}</span>
            </div>
            ${isStaff ? `
              <a href="admin.html" class="btn btn-accent btn-sm" title="Open Organiser Control Panel">
                Admin Panel
              </a>
            ` : ''}
            <button id="nav-logout-btn" class="btn btn-secondary btn-sm" title="Sign out of session">
              Log Out
            </button>
          ` : `
            <a href="login.html" class="btn btn-secondary btn-sm">Player Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register Now</a>
          `}
          <button id="mobile-toggle" class="mobile-menu-btn" aria-label="Open Navigation Menu">
            ☰
          </button>
        </div>
      </div>

      <!-- Mobile Slide-Down Drawer -->
      <div id="mobile-drawer" class="mobile-drawer">
        <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
        <a href="sports.html" class="nav-link ${activePage === 'sports' ? 'active' : ''}">Sports</a>
        <a href="events.html" class="nav-link ${activePage === 'events' ? 'active' : ''}">Events Calendar</a>
        <a href="help.html" class="nav-link ${activePage === 'help' ? 'active' : ''}">Help & Rules</a>
        ${isStaff ? `
          <a href="admin.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}" style="color: var(--accent-amber); font-weight: 700;">
            🛡️ Admin Control Panel
          </a>
        ` : ''}
        <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 8px 0;" />
        ${currentUser ? `
          <div style="padding: 8px 0; color: ${isStaff ? 'var(--accent-amber)' : 'var(--accent-cyan)'}; font-weight: 600;">
            Logged in: ${currentUser.fullName || currentUser.full_name} (${currentUser.playerId || currentUser.player_id})
          </div>
          <button id="mobile-logout-btn" class="btn btn-secondary btn-block">Log Out</button>
        ` : `
          <a href="login.html" class="btn btn-secondary btn-block">Player Login</a>
          <a href="register.html" class="btn btn-primary btn-block">Register Now</a>
        `}
      </div>
    `;

    // Attach Header Interactions
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        headerContainer.classList.add('scrolled');
      } else {
        headerContainer.classList.remove('scrolled');
      }
    });

    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener('click', () => {
        const isOpen = mobileDrawer.classList.toggle('open');
        mobileToggle.innerHTML = isOpen ? '✕' : '☰';
      });
    }

    // Logout handling
    const logoutBtn = document.getElementById('nav-logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const handleLogout = () => {
      DB.logout();
      UI.showToast('You have been signed out.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
  },

  /**
   * Renders the shared footer with prototype notice
   */
  renderFooter() {
    const footerContainer = document.getElementById('site-footer');
    if (!footerContainer) return;

    footerContainer.className = 'site-footer-wrapper';
    footerContainer.innerHTML = `
      <!-- Prototype Notice Bar -->
      <aside class="prototype-notice-bar" aria-label="Prototype Notice">
        <div class="container notice-content">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="notice-tag">Prototype Verification</span>
            <span>Demonstration portal for the approved 2026–2027 sports series architecture.</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-dim);">
            Phase 1: Permanent Registration Active • Phase 2: Booking Engine Activates at T-7 Days
          </div>
        </div>
      </aside>

      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col">
              <div class="brand-logo" style="margin-bottom: 16px;">
                <div class="brand-icon">🏆</div>
                <div class="brand-title">
                  COMMUNITY SPORTS
                  <span>Year-Long Series 2026–2027</span>
                </div>
              </div>
              <p style="font-size: 0.9rem; margin-bottom: 16px;">
                "One registration. Many events." A dedicated community multi-sport scheduling framework supporting Pickleball, Paddle Ball, and Box Cricket with guaranteed overbooking prevention and real-time court capacity.
              </p>
              <div style="display: flex; gap: 8px;">
                <span class="badge badge-cyan"><span class="badge-dot"></span> 10 Courts</span>
                <span class="badge badge-amber"><span class="badge-dot"></span> 15-Day Cadence</span>
              </div>
            </div>

            <div class="footer-col">
              <h4>Series Navigation</h4>
              <ul class="footer-links">
                <li><a href="index.html">Portal Homepage</a></li>
                <li><a href="sports.html">Supported Sports</a></li>
                <li><a href="events.html">Events Calendar</a></li>
                <li><a href="event-detail.html?id=1">Opening Event (29 Oct)</a></li>
                <li><a href="help.html">Booking Rules & FAQ</a></li>
                <li><a href="admin.html" style="color: var(--accent-amber); font-weight: 600;">Organiser Control Panel (Admin)</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Player Subsystem</h4>
              <ul class="footer-links">
                <li><a href="register.html">Permanent Registration</a></li>
                <li><a href="login.html">Player Login</a></li>
                <li><a href="help.html#two-slot-rule">Two-Slot Quota Policy</a></li>
                <li><a href="help.html#capacity-model">Court Capacity Breakdown</a></li>
                <li><a href="help.html#security">Security & Password Policy</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Series Headquarters</h4>
              <p style="font-size: 0.9rem; margin-bottom: 8px; color: var(--text-muted);">
                <strong>Venue:</strong> Jito Multisports Complex Arena<br>
                <strong>Cadence:</strong> Every 15 days, 7:00 PM – 10:00 PM<br>
                <strong>Capacity:</strong> Up to 240 appearances/night
              </p>
              <div style="margin-top: 12px;">
                <a href="register.html" class="btn btn-outline btn-sm btn-block">Join Player Roster</a>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div>
              © 2026 Community Multisports Series. Built in accordance with the Community Multisports Booking Framework.
            </div>
            <div style="display: flex; gap: 16px;">
              <span>Zero Overbooking Guarantee</span>
              <span>•</span>
              <span>ACID Row-Lock Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    `;
  },

  /**
   * Generates a reusable Sport Card HTML string
   */
  createSportCard(sport) {
    return `
      <article class="sport-card" id="sport-card-${sport.id}">
        <div class="sport-card-img-wrapper">
          <img src="${sport.image}" alt="${sport.name} at Jito Sports Arena" class="sport-card-img" loading="lazy">
          <div class="sport-badge-overlay">
            <span class="badge ${sport.badgeColor}"><span class="badge-dot"></span> ${sport.defaultFormat}</span>
          </div>
        </div>
        <div class="sport-card-body">
          <h3 class="sport-card-title">${sport.name}</h3>
          <p class="sport-card-desc">${sport.tagline}</p>
          
          <div class="sport-specs-grid">
            <div class="sport-spec-item">
              <span class="sport-spec-label">Capacity / Court</span>
              <span class="sport-spec-val">${sport.capacityPerCourt} Players</span>
            </div>
            <div class="sport-spec-item">
              <span class="sport-spec-label">Slot Duration</span>
              <span class="sport-spec-val">${sport.slotDurationMin} Minutes</span>
            </div>
            <div class="sport-spec-item">
              <span class="sport-spec-label">Dedicated Courts</span>
              <span class="sport-spec-val">${sport.totalCourts} Available</span>
            </div>
            <div class="sport-spec-item">
              <span class="sport-spec-label">Booking Mode</span>
              <span class="sport-spec-val">Individual Spot</span>
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: auto;">
            <a href="sports.html#${sport.id}" class="btn btn-secondary btn-sm" style="flex: 1;">Sport Specs</a>
            <a href="event-detail.html?id=1" class="btn btn-outline btn-sm" style="flex: 1;">View Slots</a>
          </div>
        </div>
      </article>
    `;
  },

  /**
   * Generates a reusable Event Card HTML string
   */
  createEventCard(event) {
    return `
      <article class="event-card" id="event-card-${event.id}">
        <div class="event-card-header">
          <span class="event-round-pill">${event.round}</span>
          <span class="badge ${event.statusBadgeClass}"><span class="badge-dot"></span> ${event.statusLabel}</span>
        </div>

        <div class="event-card-date">
          <span class="event-date-text">${event.displayDate.split(',')[1] || event.displayDate}</span>
          <span class="event-time-pill">${event.time}</span>
        </div>

        <div class="event-venue">
          📍 ${event.venue}
        </div>

        <div class="event-sports-tags">
          <span class="sport-tag-pill">🏓 Pickleball (10 Courts)</span>
          <span class="sport-tag-pill">🎾 Paddle Ball</span>
          <span class="sport-tag-pill">🏏 Box Cricket Arena</span>
        </div>

        <div class="event-card-footer">
          <div style="font-size: 0.8rem; color: var(--text-dim);">
            <strong>Booking Window:</strong><br>
            Opens: ${event.bookingWindow.displayOpens.split('(')[0]}
          </div>
          <a href="event-detail.html?id=${event.id}" class="btn btn-primary btn-sm">
            Event Details →
          </a>
        </div>
      </article>
    `;
  },

  /**
   * Global modal trigger helper
   */
  showModal({ title, content, ctaText = 'Understood', ctaHref = null, ctaAction = null }) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title" style="margin: 0; font-size: 1.35rem;">${title}</h3>
          <button id="modal-close-x" class="modal-close" aria-label="Close dialog">✕</button>
        </div>
        <div class="modal-body" style="margin-bottom: 24px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
          ${content}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          ${ctaHref ? `
            <a href="${ctaHref}" id="modal-cta-btn" class="btn btn-primary">${ctaText}</a>
          ` : `
            <button id="modal-cta-btn" class="btn btn-primary">${ctaText}</button>
          `}
        </div>
      </div>
    `;

    overlay.classList.add('active');

    const closeModal = () => {
      overlay.classList.remove('active');
    };

    const closeBtn = document.getElementById('modal-close-x');
    const ctaBtn = document.getElementById('modal-cta-btn');

    if (closeBtn) closeBtn.onclick = closeModal;
    if (ctaBtn) {
      ctaBtn.onclick = (e) => {
        if (ctaAction) ctaAction(e);
        if (!ctaHref) closeModal();
      };
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  },

  /**
   * Toast notification helper
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '🚫';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
