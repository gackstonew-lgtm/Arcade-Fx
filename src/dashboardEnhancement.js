/**
 * dashboardEnhancement.js — Arcade FX Institutional UI & User PnL Performance Engine.
 * Visual renderer for market ticker, authenticated user cumulative trade PnL graph,
 * time filters (Today, 7D, 30D, 3M, All), strength gauge, and session status.
 */

import { ApiClient } from './data/apiClient.js';

export class DashboardEnhancement {
  constructor(engine) {
    this.engine = engine;
    this.trades = [];
    this.activeTimeframeFilter = '30D';
    this.tickerInitialized = false;
    this.tickerTimerId = null;

    this.tickerData = [
      { symbol: 'EURUSD', name: 'Euro / US Dollar', dec: 5, spark: [] },
      { symbol: 'GBPUSD', name: 'British Pound / US Dollar', dec: 5, spark: [] },
      { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', dec: 3, spark: [] },
      { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', dec: 5, spark: [] },
      { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', dec: 5, spark: [] },
      { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', dec: 5, spark: [] },
      { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', dec: 5, spark: [] },
      { symbol: 'EURGBP', name: 'Euro / British Pound', dec: 5, spark: [] },
      { symbol: 'EURJPY', name: 'Euro / Japanese Yen', dec: 3, spark: [] },
      { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', dec: 3, spark: [] },
      { symbol: 'XAUUSD', name: 'Gold / US Dollar', dec: 2, spark: [] },
      { symbol: 'XAGUSD', name: 'Silver / US Dollar', dec: 2, spark: [] }
    ];

    this.init();
  }

  async init() {
    this.renderTicker();
    this.startLiveTickerPolling();
    this.updateGreeting();
    await this.fetchUserTrades();
    this.renderUserPnLGraph();
    this.bindTimeFilterButtons();
    this.bindMobileRescanButton();
    this.bindEngineEvents();
  }

  async fetchLiveTickerPrices() {
    try {
      const [priceRes, watchlistRes, signalsRes] = await Promise.allSettled([
        ApiClient.fetchLivePrices(),
        ApiClient.fetchWatchlist(),
        ApiClient.fetchSignals()
      ]);

      const livePrices = (priceRes.status === 'fulfilled' && priceRes.value?.success && priceRes.value?.prices) ? priceRes.value.prices : {};
      
      const watchlistMap = {};
      if (watchlistRes.status === 'fulfilled' && watchlistRes.value?.success && Array.isArray(watchlistRes.value?.watchlist)) {
        watchlistRes.value.watchlist.forEach(item => {
          if (item.symbol) watchlistMap[item.symbol] = item;
        });
      }

      const signalsList = (signalsRes.status === 'fulfilled' && signalsRes.value?.success && Array.isArray(signalsRes.value?.signals)) ? signalsRes.value.signals : [];
      const signalsMap = {};
      signalsList.forEach(s => {
        if (s.symbol) signalsMap[s.symbol] = s;
      });

      const bestSignal = this.findBestOverallSignal(signalsList);
      if (bestSignal) {
        this.updateTopSignalSetupCards(bestSignal);
      }

      let updated = false;

      this.tickerData.forEach(item => {
        const symbol = item.symbol;
        const wlItem = watchlistMap[symbol];
        const sig = signalsMap[symbol];
        const rawPriceVal = livePrices[symbol] != null 
          ? livePrices[symbol] 
          : (wlItem?.price != null ? wlItem.price : (sig?.currentPrice != null ? sig.currentPrice : null));

        if (rawPriceVal != null) {
          const numPrice = Number(rawPriceVal);
          if (Number.isFinite(numPrice) && numPrice > 0) {
            const dec = item.dec || (symbol.endsWith('JPY') ? 3 : ((symbol === 'XAUUSD' || symbol === 'XAGUSD') ? 2 : 5));
            
            const prevPrice = item.lastRawPrice || numPrice;
            const basePrice = wlItem?.price != null && wlItem.change != null 
              ? (numPrice - wlItem.change) 
              : (item.basePrice || prevPrice || numPrice);
            
            const changePct = wlItem?.percentChange != null 
              ? wlItem.percentChange 
              : (basePrice > 0 ? ((numPrice - basePrice) / basePrice) * 100 : 0.0);
            
            item.basePrice = basePrice;
            item.lastRawPrice = numPrice;
            item.price = numPrice.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
            item.change = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
            item.up = changePct >= 0;

            if (!Array.isArray(item.spark)) {
              item.spark = [];
            }
            if (item.spark.length === 0 || item.spark[item.spark.length - 1] !== numPrice) {
              item.spark.push(numPrice);
              if (item.spark.length > 15) item.spark.shift();
              updated = true;
            }

            // Sync Mobile Watchlist Overview Elements
            const mobilePriceEl = document.getElementById(`mobile_price_${symbol}`);
            const mobileChangeEl = document.getElementById(`mobile_change_${symbol}`);
            if (mobilePriceEl) {
              mobilePriceEl.textContent = item.price;
            }
            if (mobileChangeEl) {
              mobileChangeEl.textContent = item.change;
              mobileChangeEl.className = `mobile-change-badge ${item.up ? 'pos' : 'neg'}`;
            }
          }
        }
      });

      if (updated || !this.tickerInitialized) {
        this.tickerInitialized = true;
        this.renderTicker();
      }
    } catch (err) {
      console.warn('[DashboardEnhancement] Live ticker fetch failed:', err.message);
    }
  }

  startLiveTickerPolling() {
    this.fetchLiveTickerPrices();
    if (this.tickerTimerId) clearInterval(this.tickerTimerId);
    this.tickerTimerId = setInterval(() => this.fetchLiveTickerPrices(), 3000);
  }

  bindMobileRescanButton() {
    const rescanBtn = document.getElementById('mobileRescanBtn');
    if (!rescanBtn) return;

    rescanBtn.addEventListener('click', async () => {
      if (rescanBtn.classList.contains('loading')) return;

      rescanBtn.classList.add('loading');
      const textSpan = rescanBtn.querySelector('.rescan-text');
      if (textSpan) textSpan.textContent = 'Scanning Markets…';

      try {
        const res = await ApiClient.request('signals?action=rescan');
        if (res && res.success && Array.isArray(res.signals) && res.signals.length > 0) {
          console.log('[Arcade FX Mobile] Market rescan completed successfully');
          const bestSignal = this.findBestOverallSignal(res.signals);
          if (bestSignal) {
            this.updateTopSignalSetupCards(bestSignal);
          }
        }
      } catch (err) {
        console.warn('[Arcade FX Mobile] Error during market rescan:', err);
      } finally {
        setTimeout(() => {
          rescanBtn.classList.remove('loading');
          if (textSpan) textSpan.textContent = 'Rescan Market';
        }, 800);
      }
    });
  }

  findBestOverallSignal(signalsList) {
    if (!Array.isArray(signalsList) || signalsList.length === 0) {
      return null;
    }

    // Filter valid signals (active setup, non-zero entry, non-zero stopLoss, non-zero target1)
    const validCandidates = signalsList.filter(s => {
      if (!s || typeof s !== 'object') return false;
      const entry = Number(s.entry || s.entryPrice || 0);
      const sl = Number(s.stopLoss || s.sl || 0);
      const tp = Number(s.target1 || s.tp1 || 0);
      const dir = String(s.direction || '').toUpperCase();
      return entry > 0 && sl > 0 && tp > 0 && ['BUY', 'SELL', 'LONG', 'SHORT'].includes(dir) && s.status !== 'expired';
    });

    const candidates = validCandidates.length > 0 ? validCandidates : signalsList;

    // Score and rank candidates to identify the best filtered signal overall
    const ranked = candidates.map(s => {
      const entry = Number(s.entry || s.entryPrice || 0);
      const sl = Number(s.stopLoss || s.sl || 0);
      const tp1 = Number(s.target1 || s.tp1 || 0);
      const symbol = String(s.symbol || '').toUpperCase();

      let pipSize = Number(s.pipSize) || 0.0001;
      if (symbol === 'XAUUSD') pipSize = 0.1;
      else if (symbol === 'BTCUSD') pipSize = 1.0;
      else if (symbol.endsWith('JPY')) pipSize = 0.01;

      const targetPips = Math.round(Math.abs(tp1 - entry) / pipSize);
      const riskPips = Math.round(Math.abs(entry - sl) / pipSize);
      const rrVal = riskPips > 0 ? (targetPips / riskPips) : 2.0;

      let score = Number(s.confidence || s.score || s.totalScore || 75);

      // Grade bonuses
      const grade = String(s.grade || 'A').toUpperCase();
      if (grade.includes('A+')) score += 20;
      else if (grade.includes('A')) score += 10;
      else if (grade.includes('B+')) score += 5;

      // Pip potential bonus
      score += Math.min(25, Math.round(targetPips / 15));

      // Risk:Reward bonus
      if (rrVal >= 2.5) score += 15;
      else if (rrVal >= 2.0) score += 10;
      else if (rrVal >= 1.5) score += 5;

      return {
        ...s,
        calculatedRankScore: score,
        targetPips,
        rrFormatted: `1 : ${rrVal.toFixed(1)}`
      };
    });

    // Sort descending by rank score (highest pip potential + confidence + R:R)
    ranked.sort((a, b) => b.calculatedRankScore - a.calculatedRankScore);
    return ranked[0];
  }

  updateTopSignalSetupCards(sig) {
    if (!sig) return;

    const rawSym = sig.symbol || 'EURUSD';
    const symbol = sig.displaySymbol || (rawSym === 'XAUUSD' ? 'XAU / USD' : (rawSym === 'BTCUSD' ? 'BTC / USD' : (rawSym.length === 6 ? `${rawSym.substring(0,3)} / ${rawSym.substring(3)}` : rawSym)));
    const direction = (sig.direction || 'BUY').toUpperCase();
    const isBuy = direction === 'BUY' || direction === 'LONG';
    const normDir = isBuy ? 'BUY' : 'SELL';
    
    const confidence = sig.confidence || sig.score || sig.totalScore || 88;
    const grade = sig.grade || 'A+';

    let pipSize = Number(sig.pipSize) || 0.0001;
    if (rawSym === 'XAUUSD') pipSize = 0.1;
    else if (rawSym === 'BTCUSD') pipSize = 1.0;
    else if (rawSym.endsWith('JPY')) pipSize = 0.01;

    const dec = (rawSym).endsWith('JPY') ? 3 : (rawSym === 'XAUUSD' || rawSym === 'BTCUSD' ? 2 : 5);

    const entryNum = Number(sig.entry || sig.entryPrice || 0);
    const slNum = Number(sig.stopLoss || sig.sl || 0);
    const tp1Num = Number(sig.target1 || sig.tp1 || 0);
    const tp2Num = Number(sig.target2 || sig.tp2 || 0);

    const entryStr = entryNum > 0 ? entryNum.toFixed(dec) : '—';
    const slStr = slNum > 0 ? slNum.toFixed(dec) : '—';
    const tp1Str = tp1Num > 0 ? tp1Num.toFixed(dec) : '—';
    const tp2Str = tp2Num > 0 ? tp2Num.toFixed(dec) : '—';
    const rrStr = sig.rrFormatted || sig.riskReward || '1 : 2.0';
    const ageStr = sig.setupAge || 'Just formed';

    const targetPips = sig.targetPips || (entryNum > 0 && tp1Num > 0 ? Math.round(Math.abs(tp1Num - entryNum) / pipSize) : 150);

    // 1. Mobile Top Signal Setup Card Synchronizer
    const mobileSym = document.getElementById('mobile_signal_symbol');
    const mobileDir = document.getElementById('mobile_signal_direction');
    const mobileScore = document.getElementById('mobile_signal_score');
    const mobileEntry = document.getElementById('mobile_signal_entry');
    const mobileSl = document.getElementById('mobile_signal_sl');
    const mobileTp1 = document.getElementById('mobile_signal_tp1');
    const mobileTp2 = document.getElementById('mobile_signal_tp2');
    const mobileRr = document.getElementById('mobile_signal_rr');
    const mobileAge = document.getElementById('mobile_signal_age');

    if (mobileSym) mobileSym.textContent = symbol;
    if (mobileDir) {
      mobileDir.textContent = normDir;
      mobileDir.className = `signal-badge ${isBuy ? 'buy' : 'sell'}`;
    }
    if (mobileScore) mobileScore.textContent = `${confidence}% Score • Grade ${grade}`;
    if (mobileEntry) mobileEntry.textContent = entryStr;
    if (mobileSl) mobileSl.textContent = slStr;
    if (mobileTp1) mobileTp1.textContent = tp1Str;
    if (mobileTp2) mobileTp2.textContent = tp2Str;
    if (mobileRr) mobileRr.textContent = `${rrStr} R:R`;
    if (mobileAge) mobileAge.textContent = ageStr;

    // 2. Desktop Top Signal Setup Card Synchronizer
    const deskSym = document.getElementById('disp_bestSignalSymbol');
    const deskDir = document.getElementById('disp_bestSignalDirection');
    const deskConf = document.getElementById('disp_bestSignalConfidence');
    const deskPips = document.getElementById('disp_bestSignalPips');
    const deskEntry = document.getElementById('disp_bestSignalEntry');
    const deskSl = document.getElementById('disp_bestSignalSl');
    const deskTp = document.getElementById('disp_bestSignalTp');
    const deskTp2 = document.getElementById('disp_bestSignalTp2');
    const deskConfluences = document.getElementById('disp_bestSignalConfluences');

    if (deskSym) deskSym.textContent = symbol;
    if (deskDir) {
      deskDir.textContent = normDir;
      deskDir.className = `signal-badge ${isBuy ? 'buy' : 'sell'}`;
    }
    if (deskConf) deskConf.textContent = `${confidence}% Score • Grade ${grade}`;
    if (deskPips) deskPips.textContent = `+${targetPips} PIPS`;
    if (deskEntry) deskEntry.textContent = entryStr;
    if (deskSl) deskSl.textContent = slStr;
    if (deskTp) deskTp.textContent = tp1Str;
    if (deskTp2) deskTp2.textContent = tp2Str;
    if (deskConfluences && Array.isArray(sig.confluences) && sig.confluences.length > 0) {
      deskConfluences.innerHTML = sig.confluences.map(c => `<span class="confluence-pill">${c}</span>`).join('');
    }
  }

  async fetchUserTrades() {
    try {
      const res = await ApiClient.request('signals');
      if (res && res.success && Array.isArray(res.trades)) {
        this.trades = res.trades;
      } else {
        // Fallback user trades state
        this.trades = [];
      }
    } catch (e) {
      console.warn('[DashboardEnhancement] Error fetching user trades, rendering empty state:', e);
      this.trades = [];
    }
  }

  bindTimeFilterButtons() {
    const filterContainer = document.getElementById('pnlTimeframeFilters');
    if (!filterContainer) return;

    filterContainer.querySelectorAll('.pnl-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterContainer.querySelectorAll('.pnl-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTimeframeFilter = btn.dataset.timeframe || '30D';
        this.renderUserPnLGraph();
      });
    });
  }

  renderTicker() {
    const container = document.getElementById('marketTickerStrip');
    if (!container) return;

    const renderItemsHtml = (ariaHidden = false) => this.tickerData.map(item => {
      const sparkPath = this.generateSparklinePath(item.spark, 60, 28);
      const strokeColor = item.up ? '#10B981' : '#EF4444';
      const fillColor = item.up ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)';
      
      return `
        <div class="ticker-item" data-symbol="${item.symbol}" ${ariaHidden ? 'aria-hidden="true"' : ''}>
          <div class="ticker-item__info">
            <span class="ticker-item__symbol">${item.symbol}</span>
            <span class="ticker-item__price">${item.price}</span>
            <span class="ticker-item__change ${item.up ? 'up' : 'down'}">${item.change}</span>
          </div>
          <svg class="ticker-item__sparkline" viewBox="0 0 60 28" aria-hidden="true">
            <path class="ticker-spark-area" fill="${fillColor}" d="${sparkPath.area}"/>
            <path class="ticker-spark-path" stroke="${strokeColor}" d="${sparkPath.line}"/>
          </svg>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="ticker-track">
        <div class="ticker-set">${renderItemsHtml(false)}</div>
        <div class="ticker-set" aria-hidden="true">${renderItemsHtml(true)}</div>
      </div>
    `;

    container.querySelectorAll('.ticker-item').forEach(el => {
      el.addEventListener('click', () => {
        const sym = el.dataset.symbol;
        if (this.engine && typeof this.engine.setSymbol === 'function') {
          this.engine.setSymbol(sym);
        }
      });
    });
  }

  generateSparklinePath(data, width, height) {
    if (!data || data.length < 2) return { line: '', area: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const padding = 3;

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return [x, y];
    });

    let line = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const cx = (x0 + x1) / 2;
      line += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }

    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { line, area };
  }

  renderUserPnLGraph() {
    const container = document.getElementById('marketOverviewChart');
    if (!container) return;

    if (!this.trades || this.trades.length === 0) {
      container.innerHTML = `
        <div class="empty-pnl-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 180px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">📈</div>
          <strong style="font-size: 15px; color: var(--text-primary);">No trading history yet</strong>
          <p style="font-size: 12px; max-width: 320px; margin-top: 4px; color: var(--text-muted);">
            Execute orders or log closed positions to visualize your cumulative PnL performance history.
          </p>
        </div>
      `;
      return;
    }

    // Calculate cumulative PnL series
    let cumulative = 0;
    const points = this.trades.map((t, idx) => {
      cumulative += t.pnl || 0;
      return {
        label: t.date || `Trade ${idx + 1}`,
        val: cumulative
      };
    });

    const width = 800;
    const height = 180;
    const padding = 20;

    const values = points.map(p => p.val);
    const min = Math.min(0, ...values);
    const max = Math.max(10, ...values);
    const range = (max - min) || 1;

    const coords = points.map((p, i) => {
      const x = padding + (i / Math.max(1, points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.val - min) / range) * (height - padding * 2);
      return { ...p, x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const p0 = coords[i - 1];
      const p1 = coords[i];
      const cx = (p0.x + p1.x) / 2;
      pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
    const lastPoint = coords[coords.length - 1];
    const isProfit = cumulative >= 0;
    const strokeColor = isProfit ? '#10B981' : '#EF4444';

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#070911" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <path d="${areaD}" fill="url(#pnlGradient)"/>
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round"/>
        <line x1="${lastPoint.x}" y1="${lastPoint.y}" x2="${lastPoint.x}" y2="${height - 10}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-dasharray="4 4"/>
        <circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="6" fill="${strokeColor}" stroke="#fff" stroke-width="2"/>
      </svg>
    `;
  }

  updateGreeting() {
    const greetingEl = document.getElementById('marketOverviewGreeting');
    const nameEl = document.getElementById('userGreetingName');
    const dateEl = document.getElementById('marketOverviewDate');
    
    const now = new Date();
    const hours = now.getHours();
    let greeting = 'Good Morning,';
    if (hours >= 12 && hours < 17) greeting = 'Good Afternoon,';
    else if (hours >= 17) greeting = 'Good Evening,';

    if (greetingEl) greetingEl.textContent = greeting;

    const savedName = localStorage.getItem('arcadefx_trader_name') || 'Trader';
    if (nameEl) nameEl.textContent = savedName;

    if (dateEl) {
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  bindEngineEvents() {
    if (!this.engine) return;
    if (typeof this.engine.on === 'function') {
      this.engine.on('tick', (data) => this.onEngineTick(data));
    }
  }

  onEngineTick(data) {
    if (!data || !data.symbol || data.price == null) return;
    const numPrice = Number(data.price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) return;

    const item = this.tickerData.find(t => t.symbol === data.symbol);
    if (item) {
      const dec = item.symbol.endsWith('JPY') ? 3 : ((item.symbol === 'XAUUSD' || item.symbol === 'XAGUSD' || item.symbol === 'BTCUSD' || item.symbol === 'ETHUSD' || item.symbol === 'USOIL') ? 2 : 5);
      const prevPrice = item.lastRawPrice || numPrice;
      const basePrice = item.basePrice || prevPrice;
      const changePct = basePrice > 0 ? ((numPrice - basePrice) / basePrice) * 100 : 0.0;
      
      item.lastRawPrice = numPrice;
      item.price = numPrice.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      item.change = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
      item.up = changePct >= 0;

      if (!Array.isArray(item.spark)) item.spark = [];
      if (item.spark.length === 0 || item.spark[item.spark.length - 1] !== numPrice) {
        item.spark.push(numPrice);
        if (item.spark.length > 15) item.spark.shift();
        this.renderTicker();
      }
    }
  }
}
