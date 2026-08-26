/**
 * WatchlistPanel.js — Interactive Market Watchlist Ticker Sidebar & Real-Time Session Engine.
 * Displays live instrument prices, bid/ask, 24h changes %, and continuous session countdown timers.
 */

import { SYMBOLS } from '../data/MarketDataProvider.js';
import { SessionModule } from '../modules/SessionModule.js';
import { ApiClient } from '../data/apiClient.js';

export class WatchlistPanel {
  constructor(containerElement, onSelectSymbol) {
    this.container = containerElement;
    this.onSelectSymbol = onSelectSymbol;
    this.activeSymbol = 'EURUSD';
    this.prices = {};
    this.sessionTimerInterval = null;
    this.pricePollingInterval = null;

    this.initPrices();
    this.render();
    this.startSessionTimer();
    this.startLivePricePolling();
  }

  initPrices() {
    SYMBOLS.forEach(s => {
      this.prices[s.code] = {
        price: s.basePrice,
        change: 0.15,
        isUp: true,
        bid: (s.basePrice - s.pipSize).toFixed(s.pipSize < 0.01 ? 5 : 2),
        ask: (s.basePrice + s.pipSize).toFixed(s.pipSize < 0.01 ? 5 : 2)
      };
    });
  }

  async fetchLivePrices() {
    try {
      const res = await ApiClient.fetchLivePrices();
      if (res && res.success && res.prices) {
        Object.entries(res.prices).forEach(([code, rawPrice]) => {
          const numPrice = Number(rawPrice);
          if (!Number.isFinite(numPrice) || numPrice <= 0) return;
          if (this.prices[code]) {
            const oldPrice = this.prices[code].price;
            const diff = numPrice - oldPrice;
            const isUp = diff >= 0;
            const changePct = oldPrice > 0 ? (Math.abs(diff) / oldPrice) * 100 : 0.12;
            const dec = code.endsWith('JPY') ? 3 : (numPrice < 10 ? 5 : 2);
            this.prices[code] = {
              price: numPrice,
              change: changePct,
              isUp,
              bid: (numPrice - 0.0001).toFixed(dec),
              ask: (numPrice + 0.0001).toFixed(dec)
            };
          }
        });
        this.render();
      }
    } catch (e) {
      console.warn('[WatchlistPanel] Live market data fetch failed (showing cached prices):', e);
    }
  }

  startLivePricePolling() {
    this.fetchLivePrices();
    if (this.pricePollingInterval) clearInterval(this.pricePollingInterval);
    this.pricePollingInterval = setInterval(() => this.fetchLivePrices(), 4000);
  }

  startSessionTimer() {
    if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
    this.sessionTimerInterval = setInterval(() => {
      this.renderSessionCards();
    }, 1000);
  }

  setActiveSymbol(symbol) {
    this.activeSymbol = symbol;
    this.render();
  }

  updatePrice(symbol, newPrice) {
    if (this.prices[symbol]) {
      const oldPrice = this.prices[symbol].price;
      const diff = newPrice - oldPrice;
      this.prices[symbol].price = newPrice;
      if (diff !== 0) {
        this.prices[symbol].isUp = diff > 0;
      }
      this.render();
    }
  }

  renderSessionCards() {
    const sessionContainer = document.getElementById('tradingSessionsContainer');
    if (!sessionContainer) return;

    const sessions = SessionModule.getAllSessions();
    const sessionKeys = ['sydney', 'tokyo', 'london', 'newyork'];

    sessionContainer.innerHTML = sessionKeys.map(key => {
      const s = sessions[key];
      const statusClass = s.isOpen ? 'open' : 'closed';
      const badgeText = s.isOpen ? 'OPEN' : 'CLOSED';

      return `
        <div class="session-card ${statusClass}" id="${key}SessionCard">
          <div class="session-card-header">
            <span class="session-name">${s.name.toUpperCase()}</span>
            <span class="session-status-badge ${statusClass}">${badgeText}</span>
          </div>
          <div class="session-timer-display">
            <span class="timer-countdown">${s.countdown}</span>
            <span class="timer-label">${s.countdownLabel}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = SYMBOLS.map(s => {
      const p = this.prices[s.code] || { price: s.basePrice, change: 0.15, isUp: true };
      const isActive = s.code === this.activeSymbol ? 'active' : '';
      const changeClass = p.isUp ? 'up' : 'down';
      const changeSign = p.isUp ? '+' : '';
      const arrow = p.isUp ? '▲' : '▼';
      const dec = s.code.endsWith('JPY') ? 3 : (s.pipSize < 0.01 ? 5 : 2);

      return `
        <div class="watchlist-item ${isActive}" data-symbol="${s.code}" title="${s.name}">
          <div>
            <div class="wl-code">${s.code}</div>
            <span class="wl-name">${s.name}</span>
          </div>
          <div style="text-align: right;">
            <div class="wl-price tabular-nums" style="font-family: monospace; font-weight: 700;">${Number(p.price).toFixed(dec)}</div>
            <div class="wl-change ${changeClass}" style="font-size: 11px; font-weight: 700;">${arrow} ${changeSign}${Number(p.change).toFixed(2)}%</div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners
    const items = this.container.querySelectorAll('.watchlist-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const symbol = item.getAttribute('data-symbol');
        if (symbol && this.onSelectSymbol) {
          this.setActiveSymbol(symbol);
          this.onSelectSymbol(symbol);
        }
      });
    });

    this.renderSessionCards();
  }

  destroy() {
    if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
    if (this.pricePollingInterval) clearInterval(this.pricePollingInterval);
  }
}
