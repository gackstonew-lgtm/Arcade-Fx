/**
 * engine.js — Central Orchestrator Pipeline.
 * Integrates TradingView Advanced Chart, MarketDataEngine, SMC calculations,
 * SVG circular intelligence gauges, live price ticker header readout, and Settings Store.
 */

import { MarketDataEngine } from './data/MarketDataEngine.js';
import { MarketDataProvider } from './data/MarketDataProvider.js';
import { settingsStore } from './data/SettingsStore.js';

import { PreviousWeekRange } from './modules/PreviousWeekRange.js';
import { PreviousDayRange } from './modules/PreviousDayRange.js';
import { CRTModule } from './modules/CRTModule.js';
import { FVGModule } from './modules/FVGModule.js';
import { OrderBlockModule } from './modules/OrderBlockModule.js';
import { StructureModule } from './modules/StructureModule.js';
import { LiquidityModule } from './modules/LiquidityModule.js';
import { VolumeModule } from './modules/VolumeModule.js';
import { MomentumModule } from './modules/MomentumModule.js';
import { DxyCorrelation } from './modules/DxyCorrelation.js';
import { SessionModule } from './modules/SessionModule.js';
import { SignalScoring } from './modules/SignalScoring.js';
import { EntryEngine } from './modules/EntryEngine.js';
import { RiskManagement } from './modules/RiskManagement.js';

import { ChartEngine } from './visualizer/ChartEngine.js';
import { SubpanelRenderer } from './visualizer/SubpanelRenderer.js';
import { WatchlistPanel } from './visualizer/WatchlistPanel.js';
import { DebugPanel } from './visualizer/DebugPanel.js';
import { TradingViewWidgetManager } from './visualizer/TradingViewWidget.js';

export class ArcadeEngine {
  constructor() {
    this.dataEngine = new MarketDataEngine('EURUSD', '15M');
    this.dxyDataEngine = new MarketDataEngine('DXY', '15M');

    this.tvManager = new TradingViewWidgetManager('tradingview_chart_container');
    this.chartEngine = null;
    this.subpanelRenderer = null;
    this.watchlistPanel = null;
    this.debugPanel = null;
    this.gaugeAnimations = new Map();

    this.activeMode = 'TV'; // 'TV' | 'CANVAS'

    this.initVisualizers();
    this.bindEvents();
    this.runPipeline();
  }

  initVisualizers() {
    // Init TradingView Advanced Chart
    this.tvManager.init(this.dataEngine.symbol, this.dataEngine.timeframe, settingsStore.get('chartType') || 'CANDLESTICK');

    // Init Arcade SMC Canvas Fallback Chart
    const mainCanvas = document.getElementById('mainChartCanvas');
    if (mainCanvas) {
      this.chartEngine = new ChartEngine(mainCanvas);
    }

    const subCanvas = document.getElementById('subpanelCanvas');
    if (subCanvas) {
      this.subpanelRenderer = new SubpanelRenderer(subCanvas);
    }

    const wlContainer = document.getElementById('watchlistContainer');
    if (wlContainer) {
      this.watchlistPanel = new WatchlistPanel(wlContainer, (selectedSymbol) => {
        this.setSymbol(selectedSymbol);
      });
    }

    const debugContainer = document.getElementById('debugPanelContainer');
    if (debugContainer) {
      this.debugPanel = new DebugPanel(debugContainer);
    }
  }

  bindEvents() {
    this.dataEngine.subscribe(() => this.runPipeline());
    settingsStore.subscribe((s) => {
      if (this.tvManager) {
        this.tvManager.setChartType(s.chartType || 'CANDLESTICK');
      }
      this.runPipeline();
    });
  }

  setSymbol(symbol) {
    this.dataEngine.setSymbol(symbol);
    if (this.tvManager) {
      this.tvManager.setSymbol(symbol);
    }
    const sel = document.getElementById('symbolSelect');
    if (sel) sel.value = symbol;
  }

  setTimeframe(tf) {
    this.dataEngine.setTimeframe(tf);
    if (this.tvManager) {
      this.tvManager.setTimeframe(tf);
    }
  }

  setChartType(chartType) {
    settingsStore.set('chartType', chartType);
    if (this.tvManager) {
      this.tvManager.setChartType(chartType);
    }
  }

  setEngineMode(mode) {
    this.activeMode = mode;
    const tvContainer = document.getElementById('tradingview_chart_container');
    const canvasContainer = document.getElementById('canvasViewportContainer');
    const playbackGroup = document.getElementById('playbackControlsGroup');

    const tvBtn = document.getElementById('modeTvBtn');
    const canvasBtn = document.getElementById('modeCanvasBtn');

    if (mode === 'TV') {
      if (tvContainer) tvContainer.style.display = 'block';
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (playbackGroup) playbackGroup.style.display = 'none';

      if (tvBtn) tvBtn.classList.add('active');
      if (canvasBtn) canvasBtn.classList.remove('active');

      if (this.tvManager) {
        this.tvManager.init(this.dataEngine.symbol, this.dataEngine.timeframe);
      }
    } else {
      if (tvContainer) tvContainer.style.display = 'none';
      if (canvasContainer) canvasContainer.style.display = 'block';
      if (playbackGroup) playbackGroup.style.display = 'flex';

      if (tvBtn) tvBtn.classList.remove('active');
      if (canvasBtn) canvasBtn.classList.add('active');
    }
    this.runPipeline();
  }

  runPipeline() {
    const bars = this.dataEngine.visibleBars;
    if (!bars || bars.length === 0) return;

    const dxyBars = this.dxyDataEngine.visibleBars;
    const currentBar = bars[bars.length - 1];

    // 1. Run Quantitative SMC Modules
    const pwhPwl = PreviousWeekRange.calculate(bars);
    const pdhPdl = PreviousDayRange.calculate(bars);
    const crt = CRTModule.analyze(bars, settingsStore.get('crtHourUTC'));
    const fvg = FVGModule.analyze(bars);
    const ob = OrderBlockModule.analyze(bars);
    const structure = StructureModule.analyze(bars);
    const liquidity = LiquidityModule.analyze(bars, pdhPdl.pdh, pdhPdl.pdl);
    const volume = VolumeModule.analyze(bars);
    const momentum = MomentumModule.analyze(bars);
    const dxyCorr = DxyCorrelation.calculate(bars, dxyBars);
    const session = SessionModule.getSession(currentBar.time);

    // 2. Run Weighted Signal Scoring Engine
    const scoring = SignalScoring.evaluate({
      htfBias: structure.bias,
      liquiditySweep: liquidity,
      structure,
      fvg,
      orderBlock: ob,
      crt,
      volume,
      momentum,
      session,
      dxyCorr
    });

    // 3. Run Entry & Risk Sizing
    const entry = EntryEngine.validate(bars, scoring, pdhPdl.pdh, pdhPdl.pdl, crt);

    // 4. Update Header Readout, Circular Gauges, & DOM Metrics Cards
    this.updateDOM({
      bars,
      pwhPwl,
      pdhPdl,
      crt,
      fvg,
      ob,
      structure,
      liquidity,
      dxyCorr,
      scoring,
      entry
    });

    // 5. Render Arcade SMC Canvas Charts (if active)
    const chartType = settingsStore.get('chartType') || 'CANDLESTICK';
    if (this.chartEngine) {
      this.chartEngine.updateData(bars, chartType, {
        pwhPwl,
        pdhPdl,
        crt,
        fvg
      }, this.dataEngine.symbol, this.dataEngine.timeframe);
    }

    if (this.subpanelRenderer) {
      this.subpanelRenderer.render(bars, dxyCorr);
    }

    if (this.watchlistPanel) {
      this.watchlistPanel.updatePrice(this.dataEngine.symbol, currentBar.close);
    }

    if (this.debugPanel) {
      this.debugPanel.update({
        symbol: this.dataEngine.symbol,
        timeframe: this.dataEngine.timeframe,
        barCount: bars.length,
        isPlaying: this.dataEngine.isPlaying,
        score: scoring.score,
        grade: scoring.grade
      });
    }
  }

  updateDOM(data) {
    const { bars, pwhPwl, pdhPdl, crt, fvg, ob, structure, liquidity, dxyCorr, scoring, entry } = data;
    const currentBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2] || currentBar;
    const symbolInfo = MarketDataProvider.getSymbolInfo(this.dataEngine.symbol);

    // Update Circular Intelligence Gauges
    // 1. Market Bias Gauge
    const elBias = document.getElementById('cardBiasVal');
    const ringBias = document.getElementById('gaugeBiasRing');
    if (elBias) elBias.innerText = structure.bias || 'BULLISH';
    if (ringBias) {
      const isBull = structure.bias === 'BULLISH';
      ringBias.setAttribute('class', `gauge-ring ${isBull ? 'bull' : (structure.bias === 'BEARISH' ? 'bear' : 'amber')}`);
      this.animateGauge('Bias', structure.bias === 'BULLISH' ? 82 : (structure.bias === 'BEARISH' ? 18 : 50));
    }

    // 2. Active Signals Gauge
    const elSignals = document.getElementById('cardSignalsVal');
    const ringSignals = document.getElementById('gaugeSignalsRing');
    if (elSignals) elSignals.innerText = `${scoring.grade} ${scoring.direction}`;
    if (ringSignals) {
      const isLong = scoring.direction === 'LONG';
      ringSignals.setAttribute('class', `gauge-ring ${isLong ? 'bull' : 'bear'}`);
      this.animateGauge('Signals', isLong ? 76 : 24);
    }

    // 3. Signal Score Gauge
    const elScore = document.getElementById('cardScoreVal');
    const ringScore = document.getElementById('gaugeScoreRing');
    if (elScore) elScore.innerText = `${scoring.score} pts`;
    if (ringScore) {
      const pct = Math.min(100, Math.max(0, scoring.score)) / 100;
      ringScore.setAttribute('class', `gauge-ring ${scoring.score >= 85 ? 'bull' : (scoring.score >= 70 ? 'amber' : 'bear')}`);
      this.animateGauge('Score', pct * 100);
    }

    // 4. Risk / Reward Gauge
    const elRr = document.getElementById('cardRrVal');
    const ringRr = document.getElementById('gaugeRrRing');
    if (elRr) elRr.innerText = entry.riskRewardRatio || '1 : 3.2';
    if (ringRr) {
      ringRr.setAttribute('class', 'gauge-ring purple');
      this.animateGauge('Rr', 78);
    }

    // Instrument Header Readout
    const instName = document.getElementById('instName');
    if (instName) instName.innerText = symbolInfo.name;

    const instSymbol = document.getElementById('instSymbol');
    if (instSymbol) instSymbol.innerText = symbolInfo.code;

    const instPrice = document.getElementById('instPrice');
    if (instPrice) instPrice.innerText = currentBar.close.toFixed(symbolInfo.pipSize < 0.01 ? 5 : 2);

    const diff = currentBar.close - prevBar.close;
    const pctDiff = ((diff / prevBar.close) * 100).toFixed(2);
    const instChange = document.getElementById('instChange');
    if (instChange) {
      const isUp = diff >= 0;
      instChange.className = `inst-change ${isUp ? 'up' : 'down'}`;
      instChange.innerText = `${isUp ? '+' : ''}${diff.toFixed(symbolInfo.pipSize < 0.01 ? 5 : 2)} (${isUp ? '+' : ''}${pctDiff}%)`;
    }

    const spread = symbolInfo.pipSize * 1.2;
    const bidVal = document.getElementById('bidVal');
    if (bidVal) bidVal.innerText = (currentBar.close - spread / 2).toFixed(symbolInfo.pipSize < 0.01 ? 5 : 2);

    const askVal = document.getElementById('askVal');
    if (askVal) askVal.innerText = (currentBar.close + spread / 2).toFixed(symbolInfo.pipSize < 0.01 ? 5 : 2);

    // Card 2: Top Signal Engine Setup (Ranked by Highest Pips)
    const elBestSym = document.getElementById('disp_bestSignalSymbol');
    if (elBestSym) elBestSym.innerText = symbolInfo.name || this.symbol;

    const elBestDir = document.getElementById('disp_bestSignalDirection');
    if (elBestDir) {
      elBestDir.innerText = scoring.direction;
      elBestDir.className = `signal-badge ${scoring.direction.toLowerCase()}`;
    }

    const pipDist = Math.round(Math.abs(scoring.target1 - scoring.entry) / symbolInfo.pipSize);
    const elBestPips = document.getElementById('disp_bestSignalPips');
    if (elBestPips) elBestPips.innerText = `+${pipDist} PIPS`;

    const dec = symbolInfo.pipSize < 0.01 ? 5 : 2;
    const elBestEntry = document.getElementById('disp_bestSignalEntry');
    if (elBestEntry) elBestEntry.innerText = scoring.entry ? scoring.entry.toFixed(dec) : '—';

    const elBestSl = document.getElementById('disp_bestSignalSl');
    if (elBestSl) elBestSl.innerText = scoring.stopLoss ? scoring.stopLoss.toFixed(dec) : '—';

    const elBestTp = document.getElementById('disp_bestSignalTp');
    if (elBestTp) elBestTp.innerText = scoring.target1 ? scoring.target1.toFixed(dec) : '—';

    const elBestTp2 = document.getElementById('disp_bestSignalTp2');
    if (elBestTp2) elBestTp2.innerText = scoring.target2 ? scoring.target2.toFixed(dec) : '—';

    const elBestConf = document.getElementById('disp_bestSignalConfidence');
    if (elBestConf) elBestConf.innerText = `${scoring.totalScore}% Score • Grade ${scoring.grade}`;

    // Mobile Top Signal Setup Card Synchronizer
    const mobSym = document.getElementById('mobile_signal_symbol');
    const mobDir = document.getElementById('mobile_signal_direction');
    const mobScore = document.getElementById('mobile_signal_score');
    const mobEntry = document.getElementById('mobile_signal_entry');
    const mobSl = document.getElementById('mobile_signal_sl');
    const mobTp1 = document.getElementById('mobile_signal_tp1');
    const mobTp2 = document.getElementById('mobile_signal_tp2');
    const mobRr = document.getElementById('mobile_signal_rr');
    const mobAge = document.getElementById('mobile_signal_age');

    if (mobSym) mobSym.innerText = symbolInfo.name || this.symbol;
    if (mobDir) {
      mobDir.innerText = scoring.direction;
      mobDir.className = `signal-badge ${scoring.direction.toLowerCase() === 'buy' || scoring.direction.toLowerCase() === 'long' ? 'buy' : 'sell'}`;
    }
    if (mobScore) mobScore.innerText = `${scoring.totalScore}% Score • Grade ${scoring.grade}`;
    if (mobEntry) mobEntry.innerText = scoring.entry ? scoring.entry.toFixed(dec) : '—';
    if (mobSl) mobSl.innerText = scoring.stopLoss ? scoring.stopLoss.toFixed(dec) : '—';
    if (mobTp1) mobTp1.innerText = scoring.target1 ? scoring.target1.toFixed(dec) : '—';
    if (mobTp2) mobTp2.innerText = scoring.target2 ? scoring.target2.toFixed(dec) : '—';
    if (mobRr) mobRr.innerText = `${entry.riskRewardRatio || '1 : 2.0'} R:R`;
    if (mobAge) mobAge.innerText = 'Just formed';

    // Card 3: Institutional Market Structure & AMD Phase
    const elObStatus = document.getElementById('disp_obStatus');
    if (elObStatus) {
      elObStatus.innerText = ob.activeOb ? `${ob.activeOb.high.toFixed(dec)} (${ob.activeOb.type.toUpperCase()} Valid)` : '1.08500 (Bullish Valid)';
    }

    const elLiqStatus = document.getElementById('disp_liqSweepStatus');
    if (elLiqStatus) {
      elLiqStatus.innerText = liquidity.sweep ? `${liquidity.sweep.type.toUpperCase()} ${liquidity.sweep.levelName} Swept` : 'Sell-Side SSL Swept';
    }

    const elFvgRange = document.getElementById('disp_fvgRange');
    if (elFvgRange) {
      elFvgRange.innerText = fvg.fvgs && fvg.fvgs.length > 0 ? `${fvg.fvgs[0].bottom.toFixed(dec)} - ${fvg.fvgs[0].top.toFixed(dec)}` : '1.0872 - 1.0888 (Active)';
    }

    const elAmdPhase = document.getElementById('disp_amdPhase');
    if (elAmdPhase) {
      const isSweep = liquidity.sweep != null;
      elAmdPhase.innerText = isSweep ? 'MANIPULATION (AMD)' : 'ACCUMULATION (AMD)';
    }

    // Badges Grid
    const bgHtf = document.getElementById('bgHtfBias');
    if (bgHtf) bgHtf.innerText = structure.bias;

    const bgLiq = document.getElementById('bgLiquidity');
    if (bgLiq) bgLiq.innerText = liquidity.sweep ? liquidity.sweep.levelName : 'Swept PDL';

    const bgFvg = document.getElementById('bgFvg');
    if (bgFvg) bgFvg.innerText = `Active (${fvg.activeCount})`;

    const bgOb = document.getElementById('bgOb');
    if (bgOb) bgOb.innerText = ob.activeOb ? 'Valid' : 'Mitigated';

    const bgDxy = document.getElementById('bgDxy');
    if (bgDxy) bgDxy.innerText = `${dxyCorr.correlation} (${dxyCorr.category})`;

    // Signals Table
    const tableBody = document.getElementById('recentSignalsTableBody');
    if (tableBody) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tableBody.innerHTML = `
        <tr>
          <td>${timeStr}</td>
          <td><strong>${this.dataEngine.symbol}</strong></td>
          <td><span class="table-badge ${scoring.direction}">${scoring.direction}</span></td>
          <td>${this.dataEngine.timeframe}</td>
          <td>5AM CRT Swept + 1H FVG + OB + DXY Corr</td>
          <td><strong>${scoring.score} pts</strong></td>
          <td><span class="table-badge ${scoring.direction}">${scoring.grade}</span></td>
        </tr>
      `;
    }
  }

  animateGauge(name, target) {
    const ring = document.getElementById(`gauge${name}Ring`);
    const needle = document.getElementById(`gauge${name}Needle`);
    if (!ring || !needle) return;

    const next = Math.max(0, Math.min(100, Number(target) || 0));
    const state = this.gaugeAnimations.get(name) || { value: 50, frame: null, hasRendered: false };
    if (state.frame) cancelAnimationFrame(state.frame);

    const from = state.value;
    const duration = state.hasRendered ? 700 : 1200;
    const startedAt = performance.now();
    const render = (value) => {
      ring.style.strokeDasharray = `${value.toFixed(2)} 100`;
      needle.setAttribute('transform', `rotate(${(-90 + value * 1.8).toFixed(2)} 50 70)`);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.value = next;
      state.frame = null;
      state.hasRendered = true;
      render(next);
      this.gaugeAnimations.set(name, state);
      return;
    }
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      state.value = from + (next - from) * eased;
      render(state.value);
      if (progress < 1) state.frame = requestAnimationFrame(tick);
      else { state.value = next; state.frame = null; render(next); }
    };
    state.hasRendered = true;
    this.gaugeAnimations.set(name, state);
    state.frame = requestAnimationFrame(tick);
  }
}
