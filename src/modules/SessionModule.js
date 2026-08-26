/**
 * SessionModule.js — Real-World Trading Sessions, 24/5 Forex & 24/7 Crypto Market Engine.
 * Calculates exact UTC session bounds for Sydney, Tokyo, London, and New York.
 * Provides continuous live countdown timers (UNTIL CLOSE / UNTIL OPEN) and dynamic market open/closed status.
 */

export class SessionModule {
  /**
   * Session definitions in UTC hours:
   * - Sydney: 22:00 - 07:00 UTC
   * - Tokyo: 00:00 - 09:00 UTC
   * - London: 08:00 - 17:00 UTC
   * - New York: 13:00 - 22:00 UTC
   */
  static SESSIONS = {
    SYDNEY: { name: 'Sydney', openHour: 22, closeHour: 7 },
    TOKYO: { name: 'Tokyo', openHour: 0, closeHour: 9 },
    LONDON: { name: 'London', openHour: 8, closeHour: 17 },
    NEW_YORK: { name: 'New York', openHour: 13, closeHour: 22 }
  };

  /**
   * Evaluates dynamic market status (24/5 for Forex/Commodities/Indices, 24/7 for Crypto).
   */
  static getMarketStatus(symbolType = 'forex', time = Date.now()) {
    if (symbolType === 'crypto') {
      return { isOpen: true, status: 'OPEN', label: 'MARKET OPEN (24/7)' };
    }

    const date = new Date(time);
    const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const hour = date.getUTCHours();

    // Forex market opens Sunday 22:00 UTC and closes Friday 22:00 UTC
    const isWeekend = (day === 6) || (day === 0 && hour < 22) || (day === 5 && hour >= 22);
    const isOpen = !isWeekend;

    return {
      isOpen,
      status: isOpen ? 'OPEN' : 'CLOSED',
      label: isOpen ? 'MARKET OPEN (24/5)' : 'MARKET CLOSED (WEEKEND)'
    };
  }

  /**
   * Calculates live status and exact countdown timer for a given session.
   */
  static getSessionStatus(sessionKey, now = Date.now()) {
    const config = this.SESSIONS[sessionKey.toUpperCase()] || this.SESSIONS.LONDON;
    const date = new Date(now);

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Construct session open and close timestamps for today
    let openTime = Date.UTC(year, month, day, config.openHour, 0, 0);
    let closeTime = Date.UTC(year, month, day, config.closeHour, 0, 0);

    // Overnight sessions (e.g. Sydney 22:00 - 07:00)
    if (config.closeHour < config.openHour) {
      if (date.getUTCHours() >= config.openHour) {
        closeTime += 24 * 3600 * 1000;
      } else {
        openTime -= 24 * 3600 * 1000;
      }
    }

    const isOpen = now >= openTime && now < closeTime;
    let targetTime;

    if (isOpen) {
      targetTime = closeTime;
    } else {
      if (now >= closeTime) {
        targetTime = openTime + 24 * 3600 * 1000;
      } else {
        targetTime = openTime;
      }
    }

    const diffMs = Math.max(0, targetTime - now);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const countdown = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      name: config.name,
      isOpen,
      statusText: isOpen ? 'OPEN' : 'CLOSED',
      countdown,
      countdownLabel: isOpen ? 'UNTIL CLOSE' : 'UNTIL OPEN'
    };
  }

  /**
   * Returns current active sessions summary for a specific timestamp.
   */
  static getSession(now = Date.now()) {
    const time = typeof now === 'number' ? now : (now ? new Date(now).getTime() : Date.now());

    const london = this.getSessionStatus('LONDON', time);
    const ny = this.getSessionStatus('NEW_YORK', time);
    const tokyo = this.getSessionStatus('TOKYO', time);
    const sydney = this.getSessionStatus('SYDNEY', time);

    const isLondon = london.isOpen;
    const isNY = ny.isOpen;
    const isOverlap = isLondon && isNY;

    let activeSessionName = 'OFF_HOURS';
    if (isOverlap) activeSessionName = 'LONDON_NY_OVERLAP';
    else if (isLondon) activeSessionName = 'LONDON';
    else if (isNY) activeSessionName = 'NEW_YORK';
    else if (tokyo.isOpen) activeSessionName = 'TOKYO';
    else if (sydney.isOpen) activeSessionName = 'SYDNEY';

    return {
      isLondon,
      isNY,
      isOverlap,
      isTokyo: tokyo.isOpen,
      isSydney: sydney.isOpen,
      activeSessionName,
      london,
      ny,
      tokyo,
      sydney
    };
  }

  /**
   * Alias method for engine pipelines requiring analyze().
   */
  static analyze(now = Date.now()) {
    return this.getSession(now);
  }

  /**
   * Returns current active sessions summary.
   */
  static getAllSessions(now = Date.now()) {
    return {
      sydney: this.getSessionStatus('SYDNEY', now),
      tokyo: this.getSessionStatus('TOKYO', now),
      london: this.getSessionStatus('LONDON', now),
      newyork: this.getSessionStatus('NEW_YORK', now)
    };
  }

  /**
   * Real-time DOM renderer for trading session landmark cards (markets.html).
   * Dynamically calculates UTC session states (ACTIVE / CLOSED / OVERLAP) and progress bar fills.
   */
  static updateSessionCards() {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    const utcSecs = now.getUTCSeconds();
    const currentFractionalHour = utcHours + utcMins / 60 + utcSecs / 3600;

    // Forex market weekend closure: Friday 22:00 UTC to Sunday 22:00 UTC
    const isWeekend = (day === 6) || (day === 0 && utcHours < 22) || (day === 5 && utcHours >= 22);

    const sessionConfigs = [
      {
        id: 'sydney',
        openHour: 22,
        closeHour: 7,
        isOvernight: true,
        activeColor: '#3B82F6',
        activeText: 'ACTIVE',
        badgeId: 'sydneyStatusBadge',
        progressId: 'sydneyProgressFill'
      },
      {
        id: 'tokyo',
        openHour: 0,
        closeHour: 9,
        isOvernight: false,
        activeColor: '#10B981',
        activeText: 'ACTIVE',
        badgeId: 'tokyoStatusBadge',
        progressId: 'tokyoProgressFill'
      },
      {
        id: 'london',
        openHour: 8,
        closeHour: 17,
        isOvernight: false,
        activeColor: '#F59E0B',
        activeText: 'ACTIVE',
        badgeId: 'londonStatusBadge',
        progressId: 'londonProgressFill'
      },
      {
        id: 'ny_overlap',
        openHour: 13,
        closeHour: 17,
        isOvernight: false,
        activeColor: '#8B5CF6',
        activeText: 'OVERLAP',
        badgeId: 'nyOverlapStatusBadge',
        progressId: 'nyOverlapProgressFill'
      }
    ];

    sessionConfigs.forEach(sess => {
      const badgeEl = document.getElementById(sess.badgeId);
      const progressEl = document.getElementById(sess.progressId);
      if (!badgeEl || !progressEl) return;

      let isActive = false;
      let progressPct = 0;

      if (!isWeekend) {
        if (sess.isOvernight) {
          const totalDuration = (24 - sess.openHour) + sess.closeHour;
          if (currentFractionalHour >= sess.openHour || currentFractionalHour < sess.closeHour) {
            isActive = true;
            let elapsed = 0;
            if (currentFractionalHour >= sess.openHour) {
              elapsed = currentFractionalHour - sess.openHour;
            } else {
              elapsed = (24 - sess.openHour) + currentFractionalHour;
            }
            progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          }
        } else {
          const totalDuration = sess.closeHour - sess.openHour;
          if (currentFractionalHour >= sess.openHour && currentFractionalHour < sess.closeHour) {
            isActive = true;
            const elapsed = currentFractionalHour - sess.openHour;
            progressPct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
          }
        }
      }

      if (isActive) {
        badgeEl.textContent = sess.activeText || 'ACTIVE';
        badgeEl.style.color = sess.activeColor;
        progressEl.style.width = `${progressPct.toFixed(1)}%`;
        progressEl.style.background = sess.activeColor;
        progressEl.style.opacity = '1';
      } else {
        badgeEl.textContent = 'CLOSED';
        badgeEl.style.color = 'var(--text-dark)';
        progressEl.style.width = '0%';
        progressEl.style.opacity = '0.3';
      }
    });
  }
}
