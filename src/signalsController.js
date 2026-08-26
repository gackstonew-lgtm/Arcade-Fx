/**
 * signalsController.js — ArcadeFX Live Multi-Asset Signal Grid Controller
 * Manages signal grid rendering, multi-asset filtering, sorting, auto-scan countdown,
 * manual market rescan triggers, and live market data timestamps.
 */

import { ApiClient } from './data/apiClient.js';
import { entitlementManager } from './data/EntitlementManager.js';

export class SignalsController {
  constructor() {
    this.signals = [];
    this.filteredSignals = [];

    // Filter states
    this.activeAssetFilter = 'ALL'; // 'ALL', 'FOREX', 'METALS', 'CRYPTO'
    this.bestOnlyFilter = false;
    this.directionFilter = 'ALL'; // 'ALL', 'BUY', 'SELL'
    this.sortBy = 'confidence'; // 'confidence' | 'pair' | 'newest'

    // Auto-scan timer (5 minutes countdown = 300 seconds)
    this.scanIntervalSeconds = 300;
    this.countdownSeconds = 300;
    this.timerId = null;

    this.init();
  }

  async init() {
    this.bindUIEvents();
    this.startCountdownTimer();
    this.startLivePricePolling();

    entitlementManager.subscribe((entitlement) => {
      this.updateEntitlementBanner(entitlement);
      this.applyFiltersAndRender();
    });

    await entitlementManager.checkEntitlement();
    await this.fetchLiveSignals();
  }

  bindUIEvents() {
    // Rescan Market Button
    const rescanBtn = document.getElementById('rescanMarketBtn');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => this.handleManualRescan());
    }

    // Filter Pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const filterType = pill.getAttribute('data-filter');
        const filterVal = pill.getAttribute('data-value');

        if (filterType === 'asset') {
          document.querySelectorAll('.filter-pill[data-filter="asset"]').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.activeAssetFilter = filterVal;
        } else if (filterType === 'best') {
          pill.classList.toggle('active');
          this.bestOnlyFilter = pill.classList.contains('active');
        } else if (filterType === 'direction') {
          document.querySelectorAll('.filter-pill[data-filter="direction"]').forEach(p => p.classList.remove('active'));
          if (this.directionFilter === filterVal) {
            // Toggle off direction filter if clicked again
            this.directionFilter = 'ALL';
          } else {
            pill.classList.add('active');
            this.directionFilter = filterVal;
          }
        }

        this.applyFiltersAndRender();
      });
    });

    // Sort controls
    const sortConfBtn = document.getElementById('sortConfidenceBtn');
    const sortPairBtn = document.getElementById('sortPairBtn');

    if (sortConfBtn) {
      sortConfBtn.addEventListener('click', () => {
        this.sortBy = 'confidence';
        if (sortConfBtn) sortConfBtn.classList.add('active');
        if (sortPairBtn) sortPairBtn.classList.remove('active');
        this.applyFiltersAndRender();
      });
    }

    if (sortPairBtn) {
      sortPairBtn.addEventListener('click', () => {
        this.sortBy = 'pair';
        if (sortPairBtn) sortPairBtn.classList.add('active');
        if (sortConfBtn) sortConfBtn.classList.remove('active');
        this.applyFiltersAndRender();
      });
    }
  }

  startCountdownTimer() {
    if (this.timerId) clearInterval(this.timerId);

    const timerEl = document.getElementById('scanCountdownTimer');
    const updateCountdownDisplay = () => {
      const minutes = Math.floor(this.countdownSeconds / 60);
      const seconds = this.countdownSeconds % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      if (timerEl) timerEl.innerText = formatted;

      if (this.countdownSeconds <= 0) {
        this.handleManualRescan();
      } else {
        this.countdownSeconds--;
      }
    };

    updateCountdownDisplay();
    this.timerId = setInterval(updateCountdownDisplay, 1000);
  }

  resetCountdownTimer() {
    this.countdownSeconds = this.scanIntervalSeconds;
  }

  async handleManualRescan() {
    const rescanBtn = document.getElementById('rescanMarketBtn');
    const iconEl = rescanBtn?.querySelector('.rescan-icon');
    const titleEl = rescanBtn?.querySelector('.rescan-title');
    const subEl = rescanBtn?.querySelector('.rescan-sub');

    if (rescanBtn) {
      rescanBtn.disabled = true;
      rescanBtn.classList.add('is-scanning');
      if (iconEl) iconEl.classList.add('spinner-icon');
      if (titleEl) titleEl.textContent = 'Rescanning...';
      if (subEl) subEl.textContent = 'Recalculating market signals...';
    }

    this.updateLastScanStatus('scanning...');

    try {
      const res = await ApiClient.rescanSignals();
      if (res && res.success && Array.isArray(res.signals)) {
        this.signals = res.signals;
      } else {
        await this.fetchLiveSignals();
      }
    } catch (err) {
      console.warn('[SignalsController] Rescan API error:', err);
      await this.fetchLiveSignals();
    } finally {
      this.resetCountdownTimer();
      this.updateLastScanStatus('just now');
      try { this.updateTimestamps(); } catch (e) { console.warn('[SignalsController] updateTimestamps (rescan) error (non-fatal):', e.message); }

      if (rescanBtn) {
        rescanBtn.disabled = false;
        rescanBtn.classList.remove('is-scanning');
        if (iconEl) iconEl.classList.remove('spinner-icon');
        if (titleEl) titleEl.textContent = 'Rescan Market';
        if (subEl) subEl.textContent = 'Update all signals & market data';
      }

      this.applyFiltersAndRender();
    }
  }

  async fetchLiveSignals() {
    try {
      const res = await ApiClient.fetchSignals();

      if (res && res.success && Array.isArray(res.signals)) {
        this.signals = res.signals;
        this.updateLastScanStatus('live');
      } else {
        this.signals = [];
        this.updateLastScanStatus('engine offline');
      }
    } catch (e) {
      console.warn('[SignalsController] Live signal engine unavailable:', e);
      this.signals = [];
      this.updateLastScanStatus('engine offline');
    }


    try { this.updateTimestamps(); } catch (e) { console.warn('[SignalsController] updateTimestamps error (non-fatal):', e.message); }
    try { this.applyFiltersAndRender(); } catch (e) { console.warn('[SignalsController] applyFiltersAndRender error (non-fatal):', e.message); }
  }

  startLivePricePolling() {
    if (this.priceTimerId) clearInterval(this.priceTimerId);

    const poll = async () => {
      try {
        const res = await ApiClient.fetchLivePrices();
        if (!res?.success || !res?.prices) return;

        this.livePrices = res.prices;

        this.signals = this.signals.map(signal => {
          const price = this.livePrices[signal.symbol];
          if (price == null) return signal;
          return { ...signal, currentPrice: Number(price) };
        });

        document.querySelectorAll('[data-live-price]').forEach(el => {
          const symbol = el.getAttribute('data-live-price');
          const value = this.livePrices[symbol];
          if (value == null) return;

          const signal = this.signals.find(item => item.symbol === symbol);
          const dec = signal?.symbol?.endsWith('JPY') ? 3 : ((signal?.pipSize && signal.pipSize < 0.01) || value < 10 ? 5 : 2);
          const next = Number(value).toFixed(dec);

          if (el.textContent !== next) {
            el.textContent = next;
            el.classList.add('price-flash');
            setTimeout(() => el.classList.remove('price-flash'), 800);
          }
        });

        try { this.updateTimestamps(); } catch (e) { console.warn('[SignalsController] updateTimestamps (poll) error (non-fatal):', e.message); }
      } catch (error) {
        console.warn('[SignalsController] Live price poll failed:', error.message);
      }
    };

    void poll();
    this.priceTimerId = setInterval(poll, 5000);
  }

  updateLastScanStatus(text = 'just now') {
    const statusDots = document.querySelectorAll('.last-scan-status');
    statusDots.forEach(el => {
      el.innerText = text;
    });
  }

  updateEntitlementBanner(entitlement) {
    const subtitleEl = document.querySelector('.signals-page-subtitle');
    if (!subtitleEl) return;

    const countdownText = entitlementManager.getCountdownText();
    const existingBadge = document.getElementById('signalsEntitlementBadge');

    if (!countdownText) {
      if (existingBadge) existingBadge.remove();
      return;
    }

    let bannerHtml = '';
    if (entitlement.status === 'SUBSCRIPTION_ACTIVE') {
      bannerHtml = `<span class="pwa-badge" style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 6px; display: inline-block;">${countdownText}</span>`;
    } else if (entitlementManager.isUnlocked()) {
      bannerHtml = `<span class="pwa-badge" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 6px; display: inline-block;">${countdownText}</span>`;
    } else {
      bannerHtml = `<span class="pwa-badge" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 6px; display: inline-block;">${countdownText}</span>`;
    }

    if (existingBadge) {
      existingBadge.outerHTML = `<div id="signalsEntitlementBadge">${bannerHtml}</div>`;
    } else {
      subtitleEl.insertAdjacentHTML('beforebegin', `<div id="signalsEntitlementBadge">${bannerHtml}</div>`);
    }
  }

  applyFiltersAndRender() {
    let list = [...this.signals];

    // For Essential ($15) plan, ensure locked indicators for non-included pairs (XAUUSD, XAGUSD, GBPUSD, USDJPY)
    if (entitlementManager.getPlanId() === 'essential' && entitlementManager.isUnlocked()) {
      const lockedDefaults = ['XAUUSD', 'XAGUSD', 'GBPUSD', 'USDJPY'];
      lockedDefaults.forEach(sym => {
        if (!list.some(s => s.symbol === sym)) {
          list.push({
            symbol: sym,
            assetClass: sym.startsWith('XA') ? 'metals' : 'forex',
            direction: 'WAIT',
            confidence: 0,
            isLocked: true
          });
        }
      });
    }

    // Filter by asset class
    if (this.activeAssetFilter && this.activeAssetFilter !== 'ALL') {
      const asset = this.activeAssetFilter.toLowerCase();
      list = list.filter(sig => {
        const cls = String(sig.assetClass || '').toLowerCase();
        if (asset === 'metals') return cls === 'metals' || cls === 'commodity' || sig.symbol === 'XAUUSD' || sig.symbol === 'XAGUSD';
        if (asset === 'crypto') return cls === 'crypto' || sig.symbol === 'BTCUSD' || sig.symbol === 'ETHUSD';
        if (asset === 'forex') return cls === 'forex' || (!cls.includes('metal') && !cls.includes('crypto'));
        return cls === asset;
      });
    }

    // Filter by direction
    if (this.directionFilter && this.directionFilter !== 'ALL') {
      list = list.filter(sig => String(sig.direction || '').toUpperCase() === this.directionFilter.toUpperCase());
    }

    // Filter best setups (confidence >= 75 and valid direction)
    if (this.bestOnlyFilter) {
      list = list.filter(sig => Number(sig.confidence || 0) >= 75 && sig.direction !== 'WAIT');
    }

    // Sort
    if (this.sortBy === 'confidence') {
      list.sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0));
    } else if (this.sortBy === 'pair') {
      list.sort((a, b) => String(a.symbol || '').localeCompare(String(b.symbol || '')));
    }

    this.filteredSignals = list;
    this.renderGrid();
  }

  renderGrid() {
    const container = document.getElementById('signalsGridContainer');
    if (!container) return;

    if (this.filteredSignals.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 20px;">
          <div style="font-size: 36px; margin-bottom: 12px;">🚫</div>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--text-dark); margin-bottom: 8px;">NO VALID SETUPS</h3>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 480px; margin: 0 auto 16px;">
            No calculated setups currently meet the selected criteria.
          </p>
          <button class="btn-secondary" onclick="document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active')); document.querySelector('.filter-pill[data-value=ALL]').classList.add('active'); window.signalsController.activeAssetFilter='ALL'; window.signalsController.bestOnlyFilter=false; window.signalsController.directionFilter='ALL'; window.signalsController.applyFiltersAndRender();">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredSignals.map(sig => this.renderSignalCard(sig)).join('');
  }

  formatPairSymbol(sym) {
    if (!sym) return '';
    const clean = String(sym).toUpperCase().trim();
    if (clean.includes('/')) return clean;
    if (clean.endsWith('USD')) return `${clean.slice(0, -3)}/USD`;
    if (clean.endsWith('JPY')) return `${clean.slice(0, -3)}/JPY`;
    if (clean.endsWith('EUR')) return `${clean.slice(0, -3)}/EUR`;
    if (clean.endsWith('GBP')) return `${clean.slice(0, -3)}/GBP`;
    if (clean.endsWith('CAD')) return `${clean.slice(0, -3)}/CAD`;
    if (clean.endsWith('CHF')) return `${clean.slice(0, -3)}/CHF`;
    return clean;
  }

  renderSignalCard(sig) {
    const isSignalLocked = sig.isLocked || !entitlementManager.canAccessSignal(sig.symbol);

    if (isSignalLocked) {
      const symbolCode = sig.symbol || 'PAIR';
      const formattedDisplay = this.formatPairSymbol(symbolCode);
      return `
        <div class="signal-card-v2 signal-card-locked" style="position: relative; opacity: 0.9; border: 1px dashed rgba(245, 158, 11, 0.4); background: rgba(15, 23, 42, 0.6);">
          <div class="signal-card-header">
            <div>
              <div class="signal-pair-symbol">${formattedDisplay}</div>
              <div style="font-size: 11px; color: #94A3B8; font-weight: 500;">${formattedDisplay}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="signal-badge" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 10px; font-weight: 800;">🔒 PRO PLAN</span>
            </div>
          </div>

          <div class="signal-card-desc" style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">
            This signal requires the <strong>Professional ($49/mo)</strong> plan. Upgrade to access all market signal pairs.
          </div>

          <div style="filter: blur(4px); user-select: none; pointer-events: none; margin: 16px 0;">
            <div class="signal-ref-levels">
              <div><span class="ref-label">R</span> <span class="ref-val">1.XXXX</span></div>
              <div><span class="ref-label">S</span> <span class="ref-val">1.XXXX</span></div>
              <div><span class="ref-label">R:R 1 : 2.5</span></div>
            </div>
            <div class="signal-stats-grid" style="margin-top: 10px;">
              <div class="stat-box"><span class="stat-label">ENTRY</span><span class="stat-val entry">🔒.Locked</span></div>
              <div class="stat-box"><span class="stat-label">STOP LOSS</span><span class="stat-val sl">🔒.Locked</span></div>
            </div>
          </div>

          <button class="arcadefx-btn-primary btn-trigger-payhero-sub" data-plan="professional" style="width: 100%; margin-top: 4px; font-size: 12px; padding: 10px; justify-content: center;">
            <span>Upgrade to Professional ($49)</span> <span>→</span>
          </button>
        </div>
      `;
    }
    const isWait = !sig.direction || sig.direction === 'WAIT' || sig.direction === 'HOLD' || sig.direction === 'NEUTRAL';
    const isBuy = sig.direction === 'BUY';
    const isSell = sig.direction === 'SELL';

    const badgeClass = isBuy ? 'buy' : (isSell ? 'sell' : 'wait');
    const badgeText = isWait ? 'WAIT' : sig.direction;

    const symbolCode = sig.symbol || '';
    const rawDisplay = sig.displaySymbol || sig.name || symbolCode;
    const formattedDisplay = this.formatPairSymbol(rawDisplay);

    const dec = symbolCode.endsWith('JPY') ? 3 : ((sig.pipSize && sig.pipSize < 0.01) || (sig.currentPrice && sig.currentPrice < 10) ? 5 : (sig.currentPrice > 1000 ? 2 : 5));

    const refRes = sig.referenceResistance != null ? sig.referenceResistance : (isBuy ? (sig.target1 || sig.target2) : (isSell ? (sig.stopLoss || sig.entry) : sig.currentPrice));
    const refSup = sig.referenceSupport != null ? sig.referenceSupport : (isBuy ? (sig.stopLoss || sig.entry) : (isSell ? (sig.target1 || sig.target2) : sig.currentPrice));

    const formattedR = refRes != null ? Number(refRes).toFixed(dec) : '—';
    const formattedS = refSup != null ? Number(refSup).toFixed(dec) : '—';
    const rrStr = isWait ? 'R:R -' : (typeof sig.riskReward === 'string' ? `R:R ${sig.riskReward}` : `R:R 1 : ${sig.riskReward || '2'}`);

    const currentPriceStr = sig.currentPrice != null ? Number(sig.currentPrice).toFixed(dec) : '—';

    const entryPriceStr = sig.entry != null ? Number(sig.entry).toFixed(dec) : '—';
    const stopLossStr = sig.stopLoss != null ? Number(sig.stopLoss).toFixed(dec) : '—';
    const target1Str = sig.target1 != null ? Number(sig.target1).toFixed(dec) : '—';
    const target2Str = sig.target2 != null ? Number(sig.target2).toFixed(dec) : '—';

    const setupType = sig.setup?.type || sig.confluence?.[0] || 'OB';
    const entryLabel = isWait ? 'ENTRY' : `ENTRY (${String(setupType).toUpperCase()})`;

    const descText = isWait
      ? 'SMC monitoring • neutral'
      : (sig.description || `SMC Day-Trade • ${setupType}`);

    const biasText = isWait
      ? '▼ Neutral bias'
      : (isBuy ? `▲ Bullish bias` : `▼ Bearish bias`);

    const biasClass = isWait ? 'neutral' : (isBuy ? 'bullish' : 'bearish');

    const tags = Array.isArray(sig.confluence) && sig.confluence.length > 0
      ? sig.confluence
      : (sig.tag ? [sig.tag] : (isWait ? [] : [setupType]));

    const confidenceVal = sig.confidence != null && sig.confidence > 0 ? Number(sig.confidence) : (isWait ? 0 : (sig.setup?.confidence || 50));

    return `
      <div class="signal-card-v2 ${isWait ? 'signal-card-wait' : ''}">
        <div class="signal-card-header">
          <div>
            <div class="signal-pair-symbol">${formattedDisplay}</div>
            <div style="font-size: 11px; color: #94A3B8; font-weight: 500;">${formattedDisplay}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="signal-badge ${badgeClass}">${badgeText}</span>
            ${sig.status && sig.status !== 'MONITORING' ? `<span class="signal-badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); font-size: 10px; font-weight: 700;">${sig.status}</span>` : ''}
          </div>
        </div>

        <div class="signal-card-desc">${descText}</div>

        <div class="signal-bias-wrapper" style="justify-content: space-between;">
          <span class="signal-bias-pill ${biasClass}">
            ${biasText}
          </span>
          <span style="font-size: 11px; font-family: monospace; color: #F8FAFC; font-weight: 700;">
            Current: <span data-live-price="${sig.symbol}">${currentPriceStr}</span>
          </span>
        </div>

        <div class="signal-ref-levels">
          <div><span class="ref-label">R</span> <span class="ref-val">${formattedR}</span></div>
          <div><span class="ref-label">S</span> <span class="ref-val">${formattedS}</span></div>
          <div><span class="ref-label">${rrStr}</span></div>
        </div>

        ${!isWait ? `
        <div class="signal-stats-grid">
          <div class="stat-box">
            <span class="stat-label">${entryLabel}</span>
            <span class="stat-val entry">${entryPriceStr}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">STOP LOSS</span>
            <span class="stat-val sl">${stopLossStr}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">TARGET 1</span>
            <span class="stat-val tp">${target1Str}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">TARGET 2</span>
            <span class="stat-val tp">${target2Str}</span>
          </div>
        </div>
        ` : ''}

        <div class="signal-source-pill">Live Market Signal Engine</div>

        ${tags.length > 0 ? `
        <div class="confluence-pill-container" style="margin-top: 10px;">
          ${tags.map(t => `<span class="confluence-pill">${String(t).toUpperCase()}</span>`).join('')}
        </div>
        ` : ''}

        <div class="signal-card-footer" style="margin-top: 12px;">
          <div class="confidence-container">
            <span class="confidence-score">${confidenceVal}%</span>
            <div class="confidence-bar-bg">
              <div class="confidence-bar-fill" style="width: ${confidenceVal}%;"></div>
            </div>
          </div>
          <div class="setup-age">${sig.setupAge || 'Live engine setup'}</div>
        </div>
      </div>
    `;
  }

  getFallbackSignals() {
    // Intentionally disabled. Live market data must come from the BM Forex
    // VPS engine through Netlify; fabricated prices/signals are not allowed.
    return [];
  }

  /**
   * updateTimestamps — Refreshes any time-ago or "last updated" display
   * elements on the Signals page so users see a live data indicator.
   *
   * Called after every signal fetch and every live-price poll cycle.
   * This is a non-critical UI operation; failures here must never interrupt
   * the signal engine or the polling loop.
   */
  updateTimestamps() {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // Update any "last updated at HH:MM:SS" indicators on the page
      document.querySelectorAll('.signals-last-updated, [data-signal-timestamp]').forEach(el => {
        el.textContent = `Updated ${timeStr} UTC`;
      });

      // Update scan age labels if present
      document.querySelectorAll('.signal-age, .last-scan-age').forEach(el => {
        el.textContent = 'just now';
      });
    } catch (e) {
      // Non-critical UI update; log but do not rethrow
      console.warn('[SignalsController] updateTimestamps UI update failed (non-fatal):', e.message);
    }
  }
}
