/**
 * liveClock.js — ArcadeFX Sidebar Live Clock & Global Timezone Controller.
 * Renders real-time H, M, S clock and current date with global financial timezone selection.
 */

export function initSidebarLiveClock() {
  const timeEl = document.getElementById('sidebarLiveTime');
  const dateEl = document.getElementById('sidebarLiveDate');
  const tzSelect = document.getElementById('sidebarTzSelect');

  if (!timeEl && !dateEl && !tzSelect) return;

  const savedTz = localStorage.getItem('arcadefx_timezone') || 'UTC';
  if (tzSelect) {
    tzSelect.value = savedTz;
    tzSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      localStorage.setItem('arcadefx_timezone', selected);
      updateClock();
    });
  }

  function updateClock() {
    const tz = tzSelect ? tzSelect.value : (localStorage.getItem('arcadefx_timezone') || 'UTC');
    const now = new Date();

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dateOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    };

    if (tz !== 'SYSTEM') {
      timeOptions.timeZone = tz;
      dateOptions.timeZone = tz;
    }

    try {
      if (timeEl) {
        const timeStr = new Intl.DateTimeFormat('en-US', timeOptions).format(now);
        const tzAbbr = tz === 'SYSTEM' ? 'LOCAL' : (tz.split('/')[1] || tz).toUpperCase();
        timeEl.textContent = `${timeStr} ${tzAbbr}`;
      }
      if (dateEl) {
        dateEl.textContent = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
      }
    } catch (err) {
      if (timeEl) timeEl.textContent = now.toUTCString().split(' ')[4] + ' UTC';
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
}
