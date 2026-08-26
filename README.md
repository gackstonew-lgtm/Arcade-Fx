# ARCADE FX — MULTI-TIMEFRAME SMART MONEY & 5AM CRT TRADING SYSTEM

A professional quantitative trading analysis engine, TradingView-style interactive charting workspace, and native Settings Center built according to Institutional Smart Money Concepts (SMC) and 5AM Candle Range Theory (CRT).

Designed with zero-repainting guarantees and strict deterministic calculations ready for translation into TradingView Pine Script v5.

---

## 🌟 Key Features

1. **Native Settings Center & Theme Engine (Phase 3)**:
   - **Full Theme Engine**: Light Workspace (`#f8fafc`), Dark Fintech (`#090d16`), and System Default theme switching with `localStorage` persistence under `arcadefx_user_settings`.
   - **Settings Search Bar**: Live query filter searching settings cards by keywords (e.g. `theme`, `crt`, `fvg`, `risk`, `sound`).
   - **Comprehensive Categories**: General (Timezone, Date/Time formats, Currency), Appearance, Chart Display, Strategy Overlays, Risk Management, Strategy Parameters, Notifications, Audio Alerts, and Privacy & Data.
   - **Overlay Control Engine**: Independent ON/OFF toggles for PWH/PWL, PDH/PDL, CRT zones, FVGs, Order Blocks, Liquidity Sweeps, Signals, and Risk/Reward overlays.
   - **Reset Modal & Toast System**: Reset to defaults modal confirmation and `✓ Changes saved` subtle toast notifications.

2. **TradingView-Style Professional Charting Workspace**:
   - **4 Chart Types**: Switch seamlessly between **Candlesticks**, **OHLC Bars**, **Line Chart**, and **Area Chart**.
   - **Crosshair HUD**: Displays precise `Time`, `Open`, `High`, `Low`, `Close`, `Volume` for hovered candles.
   - **Symbol / Instrument Selector & Watchlist**: Live price ticker and watchlist for **EURUSD**, **GBPUSD**, **USDJPY**, **USDCHF**, **USDCAD**, **AUDUSD**, **NZDUSD**, **XAUUSD**, **XAGUSD**, **BTCUSD**, **ETHUSD**, and **DXY**.
   - **Interactive Technical Drawing Tools**: Manual Horizontal Lines, Trendlines, Rays, Rectangles, Fibonacci Retracements, and Text labels operating independently of the strategy engine.

3. **Multi-Timeframe Architecture (1W, 1D, 4H, 1H, 15M)**:
   - **1W**: Macro High/Low, Previous Week Range (PWH/PWL), Weekly 50% Equilibrium.
   - **1D**: Directional Bias, Previous Day Range (PDH/PDL), Daily 50% Equilibrium.
   - **4H**: 5AM CRT Candle Range, CRT High/Low/Equilibrium rectangular zones.
   - **1H**: 3-candle Fair Value Gap (FVG) detection, Order Block (OB) displacement & mitigation tracking.
   - **15M**: Execution timing, volume expansion, ATR body momentum, session overlap filter.

4. **Strict Non-Repainting Guarantee**:
   - Higher timeframe levels (PWH, PWL, PDH, PDL, CRT) are updated **only** upon complete candle closure.
   - Zero lookahead bias in historical signal generation or backtesting replay.

5. **Weighted Signal Scoring Engine**:
   - Evaluates 10 distinct confluence factors (HTF context, liquidity sweep, structure shift, 1H FVG, 1H OB, CRT alignment, volume, momentum, session overlap, DXY correlation).
   - Classifies signals into **A+ Setup** (>=85 pts), **A Setup** (>=70 pts), **B Setup** (>=50 pts), or **No Trade** (<50 pts).

6. **DXY Rolling Pearson Correlation Subpanel**:
   - Real-time rolling Pearson correlation coefficient (-1.0 to +1.0) with configurable benchmark (default DXY).

7. **Pine Script v5 Ready**:
   - Includes complete [PINE_CONVERSION_SPECIFICATION.md](file:///c:/xampp/htdocs/Arcade%20FX/PINE_CONVERSION_SPECIFICATION.md) mapping every module to Pine Script v5 constructs.

---

## 📁 System Architecture

```text
Arcade FX/
├── index.html                  # Interactive SaaS workspace & Settings Center shell
├── css/
│   └── styles.css              # Light & Dark design tokens and CSS stylesheet
├── src/
│   ├── data/
│   │   ├── SettingsStore.js    # Centralized Settings Store & localStorage persistence
│   │   ├── MarketDataProvider.js # Pluggable market data abstraction & symbol resolver
│   │   └── MarketDataEngine.js   # Multi-timeframe bar aggregator & data stream generator
│   ├── modules/
│   │   ├── PreviousWeekRange.js # PWH, PWL, Weekly EQ
│   │   ├── PreviousDayRange.js  # PDH, PDL, Daily EQ
│   │   ├── CRTModule.js         # 5AM 4H CRT candle detector & zone generator
│   │   ├── FVGModule.js         # 1H 3-candle Fair Value Gap detection & mitigation
│   │   ├── OrderBlockModule.js  # 1H Order Block displacement & structure shift detector
│   │   ├── StructureModule.js   # MSS & BOS detection across timeframes
│   │   ├── LiquidityModule.js   # HTF Liquidity Sweep & close rejection engine
│   │   ├── VolumeModule.js      # Volume SMA expansion filter
│   │   ├── MomentumModule.js    # ATR & candle body ratio expansion
│   │   ├── DxyCorrelation.js    # Rolling Pearson correlation coefficient
│   │   ├── SessionModule.js     # Asian, London, NY, Overlap session filter
│   │   ├── SignalScoring.js     # Weighted confluence point engine (A+/A/B)
│   │   ├── EntryEngine.js       # Long & Short setup trigger validator
│   │   ├── RiskManagement.js    # Structural SL, 1:2/1:3/1:4 TPs, lot sizing
│   │   └── AlertEngine.js       # Non-repainting event alert system
│   ├── visualizer/
│   │   ├── SettingsCenter.js    # Two-column Settings Center UI component
│   │   ├── ChartEngine.js       # Canvas chart renderer (Candle, Bar, Line, Area styles)
│   │   ├── DrawingTools.js      # Interactive manual drawing tools manager
│   │   ├── WatchlistPanel.js    # Instrument watchlist ticker sidebar
│   │   ├── OverlayRenderer.js   # PWH/PDH/CRT/FVG/OB/R:R overlay renderer
│   │   ├── SubpanelRenderer.js  # Volume histogram & DXY correlation renderer
│   │   └── DebugPanel.js        # Validation & Backtest debug inspector
│   ├── engine.js                # Central Orchestrator Pipeline
│   └── main.js                  # Application entry point & web UI controller
├── tests/
│   └── test-suite.js            # Automated unit & integration test runner
├── README.md                    # System documentation
└── PINE_CONVERSION_SPECIFICATION.md # Complete Pine Script v5 conversion specification
```

---

## 🧪 Test Suite Results

```text
====================================================
🧪 RUNNING ARCADE FX SMC SYSTEM AUTOMATED TEST SUITE
====================================================

  ✅ PASS: PreviousWeekRange correctly identifies PWH
  ✅ PASS: PreviousWeekRange correctly identifies PWL
  ✅ PASS: Weekly Equilibrium equals (PWH + PWL) * 0.5
  ✅ PASS: PreviousDayRange correctly identifies PDH
  ✅ PASS: PreviousDayRange correctly identifies PDL
  ✅ PASS: Daily Equilibrium equals (PDH + PDL) * 0.5
  ✅ PASS: CRTModule detects 5AM 4H candle
  ✅ PASS: CRT High extracted correctly
  ✅ PASS: CRT Low extracted correctly
  ✅ PASS: CRT 50% Equilibrium calculated correctly
  ✅ PASS: FVGModule detects 3-candle Bullish FVG
  ✅ PASS: FVG High bound verified
  ✅ PASS: FVG Low bound verified
  ✅ PASS: FVG mitigation status updates to FULLY_MITIGATED
  ✅ PASS: LiquidityModule detects Bullish Liquidity Sweep
  ✅ PASS: Sweep classified as BULLISH
  ✅ PASS: Rejection verified by close back above level
  ✅ PASS: DxyCorrelation calculates inverse Pearson coefficient
  ✅ PASS: Categorized as STRONG_NEGATIVE
  ✅ PASS: EURUSD inverse alignment verified
  ✅ PASS: High confluence setup scores >= 85
  ✅ PASS: High confluence setup awarded A+ Grade
  ✅ PASS: Long SL placed below structural low with 3 pip buffer
  ✅ PASS: TP1 corresponds to 1:2 Risk/Reward
  ✅ PASS: TP3 corresponds to 1:4 Risk/Reward
  ✅ PASS: Risk Amount is exactly 1% of $10,000 ($100)
  ✅ PASS: MarketDataProvider supports 12+ symbols
  ✅ PASS: MarketDataProvider fetches OHLCV series correctly
  ✅ PASS: OHLCV bar timeframe verified
  ✅ PASS: SettingsStore initializes with default theme=system
  ✅ PASS: SettingsStore updates setting value
  ✅ PASS: SettingsStore resolves dark theme
  ✅ PASS: SettingsStore updates strategy overlay toggle
  ✅ PASS: SettingsStore resets preferences to defaults
  ✅ PASS: SettingsStore restores overlay default toggles

====================================================
TEST SUMMARY: 35 PASSED | 0 FAILED
====================================================
```
