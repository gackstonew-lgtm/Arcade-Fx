import { ApiClient } from './data/apiClient.js';
import './workspaceShell.js';

const content = document.getElementById('newsContent');
const state = document.getElementById('newsSourceState');
const impactFilter = document.getElementById('newsImpactFilter');
const currencyFilter = document.getElementById('newsCurrencyFilter');
let events = [];

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '—');
  return div.innerHTML;
}

function impactOf(event) {
  return String(event.impact || event.impactTitle || 'Low').replace('Holiday', 'Low');
}

function formatEventDayDate(raw) {
  if (!raw) return 'Mon, 08:30';
  const str = String(raw).trim();

  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(str)) {
    return str;
  }

  try {
    let dObj = null;
    if (str.includes('/')) {
      const parts = str.split(/[\s/:]+/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const h = parts[3] ? parseInt(parts[3], 10) : 12;
        const min = parts[4] ? parseInt(parts[4], 10) : 0;
        dObj = new Date(Date.UTC(y, m, d, h, min));
      }
    } else if (str.includes('-')) {
      dObj = new Date(str);
    }

    if (dObj && !isNaN(dObj.getTime())) {
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dObj);
      const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dObj);
      const timePart = dObj.toTimeString().substring(0, 5);
      return `${dayName}, ${monthDay} • ${timePart}`;
    }
  } catch (e) {}

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[new Date().getDay()] || 'Mon';
  return `${dayName}, ${str}`;
}

function render() {
  const impact = (impactFilter?.value || '').toLowerCase();
  const currency = (currencyFilter?.value || '').trim().toUpperCase();

  const filtered = events.filter((event) => {
    const matchImpact = !impact || impactOf(event).toLowerCase().includes(impact);
    const matchCurr = !currency || String(event.country || event.currency || '').toUpperCase() === currency;
    return matchImpact && matchCurr;
  });

  if (!filtered.length) {
    content.className = 'news-empty';
    content.textContent = 'No economic events available for the selected period.';
    return;
  }

  content.className = 'news-table-wrap';
  content.innerHTML = `
    <table class="news-table" aria-label="Economic Calendar News Events">
      <thead>
        <tr>
          <th>Day & Time (UTC)</th>
          <th>Currency</th>
          <th>Event Description</th>
          <th>Impact</th>
          <th>Actual</th>
          <th>Forecast</th>
          <th>Previous</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((event) => {
          const imp = impactOf(event).toLowerCase();
          const impBadgeClass = imp.includes('high') ? 'impact-high' : imp.includes('med') ? 'impact-medium' : 'impact-low';
          const rawTime = event.date || event.time || 'Mon, 14:30';
          const timeStr = formatEventDayDate(rawTime);
          const countryStr = event.country || event.currency || 'USD';
          const titleStr = event.title || event.event || 'Market Event';

          return `
            <tr>
              <td style="font-family: monospace; font-weight: 600; color: #cbd5e1;">${escapeHtml(timeStr)}</td>
              <td><strong style="color: #60a5fa; font-weight: 700;">${escapeHtml(countryStr)}</strong></td>
              <td style="color: #f8fafc; font-weight: 600;">${escapeHtml(titleStr)}</td>
              <td><span class="impact-badge ${impBadgeClass}">${escapeHtml(impactOf(event))}</span></td>
              <td style="font-family: monospace; font-weight: 700; color: #38ef7d;">${escapeHtml(event.actual)}</td>
              <td style="font-family: monospace; color: #94a3b8;">${escapeHtml(event.forecast)}</td>
              <td style="font-family: monospace; color: #94a3b8;">${escapeHtml(event.previous)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

async function load() {
  if (content) {
    content.className = 'news-loading';
    content.textContent = 'Loading verified economic calendar events...';
  }

  const result = await ApiClient.fetchNewsCalendar();
  if (!result?.success || !Array.isArray(result.events)) {
    if (content) {
      content.className = 'news-empty';
      content.textContent = result?.error || 'Economic calendar source is temporarily unavailable.';
    }
    if (state) state.textContent = 'ForexFactory provider unavailable';
    return;
  }

  events = result.events;
  if (state) {
    state.textContent = `ForexFactory Live Calendar · Refreshed ${new Date(result.fetched_at || Date.now()).toLocaleTimeString()}`;
  }
  render();
}

if (impactFilter) impactFilter.addEventListener('input', render);
if (currencyFilter) currencyFilter.addEventListener('input', render);

load();
