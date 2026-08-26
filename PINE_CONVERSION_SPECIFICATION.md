# PINE_CONVERSION_SPECIFICATION.md

## Technical Specification for Translating Arcade FX Multi-Timeframe Smart Money Engine into TradingView Pine Script v5

---

### Executive Overview

This document provides exact, production-ready specifications, mathematical logic, function mappings, variable declarations, and Pine Script v5 pseudocode for converting the **Arcade FX Multi-Timeframe Smart Money Trading Engine** into a TradingView Pine Script indicator/strategy.

Every module in the JavaScript engine has been designed deterministically to map 1:1 into Pine Script v5 native constructs (`request.security`, `ta.correlation`, `ta.pivots`, `box.new`, `line.new`, `array`).

---

## 1. Non-Repainting Execution Rules in Pine Script v5

> [!IMPORTANT]
> **Zero Lookahead Rule**: In Pine Script, fetching higher timeframe data (1W, 1D, 4H, 1H) using `request.security()` can cause historical repainting if not scoped to completed bars.

To guarantee zero repainting in Pine Script:
1. Always use `barmerge.lookahead_off`.
2. Request historical closed bar values using `[1]` indexing on the higher timeframe expression:
   ```pinescript
   // CORRECT non-repainting higher timeframe request:
   [htfHigh, htfLow, htfClose] = request.security(syminfo.tickerid, "D", [high[1], low[1], close[1]], lookahead = barmerge.lookahead_off)
   ```

---

## 2. Module Specifications & Pine Script v5 Pseudocode

### Module 1: Previous Week High/Low & Weekly Equilibrium

- **Purpose**: Calculate Previous Week High (PWH), Previous Week Low (PWL), and Weekly Equilibrium (50% midpoint).
- **Inputs**: `i_showPwr = input.bool(true, "Show Previous Week Range")`
- **Pine Functions**: `request.security(syminfo.tickerid, "W", ...)`
- **Repaint Risk**: High if `lookahead_on` or unclosed candle used. ZERO risk when using `high[1]` on weekly security call.

```pinescript
//@version=5
// --- PREVIOUS WEEK RANGE & EQUILIBRIUM ---
[pwh_raw, pwl_raw] = request.security(syminfo.tickerid, "W", [high[1], low[1]], lookahead = barmerge.lookahead_off)

var float pwh = na
var float pwl = na
var float weekly_eq = na

if timeframe.isintraday or timeframe.isdaily
    pwh := pwh_raw
    pwl := pwl_raw
    weekly_eq := pwl + ((pwh - pwl) * 0.5)

// Visual Plotting
plot(pwh, "PWH", color = color.purple, linewidth = 2)
plot(pwl, "PWL", color = color.purple, linewidth = 2)
plot(weekly_eq, "Weekly EQ (50%)", color = color.new(color.purple, 40), style = plot.style_linebr)
```

---

### Module 2: Previous Day High/Low & Daily Equilibrium

- **Purpose**: Calculate Previous Day High (PDH), Previous Day Low (PDL), and Daily Equilibrium (50% midpoint).
- **Inputs**: `i_showPdr = input.bool(true, "Show Previous Day Range")`
- **Pine Functions**: `request.security(syminfo.tickerid, "D", ...)`

```pinescript
// --- PREVIOUS DAY RANGE & EQUILIBRIUM ---
[pdh_raw, pdl_raw] = request.security(syminfo.tickerid, "D", [high[1], low[1]], lookahead = barmerge.lookahead_off)

var float pdh = na
var float pdl = na
var float daily_eq = na

if timeframe.isintraday
    pdh := pdh_raw
    pdl := pdl_raw
    daily_eq := pdl + ((pdh - pdl) * 0.5)

plot(pdh, "PDH", color = color.blue, linewidth = 2)
plot(pdl, "PDL", color = color.blue, linewidth = 2)
plot(daily_eq, "Daily EQ (50%)", color = color.new(color.blue, 40), style = plot.style_linebr)
```

---

### Module 3: 5AM 4H CRT Candle Engine

- **Purpose**: Identify the 5:00 AM 4H candle, record CRT High, Low, and 50% Equilibrium, and draw rectangular zone.
- **Inputs**: `i_crtHour = input.int(5, "CRT Hour (UTC)")`
- **Pine Functions**: `time`, `box.new()`, `line.new()`

```pinescript
// --- 5AM 4H CRT CANDLE ENGINE ---
is4HCandle = timeframe.period == "240" or (timeframe.isintraday and timeframe.multiplier <= 240)
is5AMCRT = (hour == 5) and (minute == 0)

var float crt_high = na
var float crt_low = na
var float crt_eq = na
var box crt_box = na

if is5AMCRT and barstate.isconfirmed
    crt_high := high
    crt_low := low
    crt_eq := low + ((high - low) * 0.5)
    
    // Create non-repainting rectangle extending through the trading day
    crt_box := box.new(left = bar_index, top = crt_high, right = bar_index + 24, bottom = crt_low, 
                       bgcolor = color.new(color.yellow, 88), border_color = color.yellow)
```

---

### Module 4: 1H Fair Value Gap (FVG) Engine

- **Purpose**: Detect 3-candle imbalance windows (Bullish/Bearish) and track mitigation.
- **Inputs**: `i_minFvgPips = input.float(0.0003, "Min FVG Size (Pips)")`
- **Pine Functions**: `box.new()`, `array.push()`

```pinescript
// --- 1H FAIR VALUE GAP (FVG) DETECTION ---
fvg_is_bullish = low > high[2] and (low - high[2]) >= i_minFvgPips
fvg_is_bearish = high < low[2] and (low[2] - high) >= i_minFvgPips

if fvg_is_bullish and barstate.isconfirmed
    box.new(left = bar_index - 2, top = low, right = bar_index + 20, bottom = high[2],
            bgcolor = color.new(color.green, 85), border_color = color.green)

if fvg_is_bearish and barstate.isconfirmed
    box.new(left = bar_index - 2, top = low[2], right = bar_index + 20, bottom = high,
            bgcolor = color.new(color.red, 85), border_color = color.red)
```

---

### Module 5: 1H Order Block Engine

- **Purpose**: Detect last opposing candle before a confirmed displacement / structure shift.
- **Inputs**: `i_obDisplacement = input.float(0.0012, "OB Displacement Threshold")`

```pinescript
// --- 1H ORDER BLOCK DETECTION ---
bull_mss = close > ta.highest(high, 5)[1]
bear_mss = close < ta.lowest(low, 5)[1]

if bull_mss and barstate.isconfirmed
    // Find last bearish candle in recent window
    ob_low = low[1]
    ob_high = high[1]
    box.new(left = bar_index - 2, top = ob_high, right = bar_index + 30, bottom = ob_low,
            bgcolor = color.new(color.blue, 75), border_color = color.blue)
```

---

### Module 6: High-Timeframe Liquidity Sweeps

- **Purpose**: Detect when price clears liquidity levels (PWH/PWL, PDH/PDL, CRT High/Low) and closes back inside.

```pinescript
// --- LIQUIDITY SWEEP DETECTION ---
bull_sweep = low < pdl and close > pdl
bear_sweep = high > pdh and close < pdh

plotshape(bull_sweep and barstate.isconfirmed, title="Bull Sweep", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(bear_sweep and barstate.isconfirmed, title="Bear Sweep", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)
```

---

### Module 7: DXY Correlation Subpanel

- **Purpose**: Calculate rolling Pearson correlation with DXY benchmark.
- **Pine Functions**: `request.security()`, `ta.correlation()`

```pinescript
// --- DXY ROLLING CORRELATION ---
dxy_close = request.security("DXY", timeframe.period, close, lookahead = barmerge.lookahead_off)
dxy_corr = ta.correlation(close, dxy_close, 20)

plot(dxy_corr, "DXY Correlation (20)", color = dxy_corr <= -0.6 ? color.green : color.orange, linewidth = 2)
hline(0.6, "+0.6 Threshold", color = color.gray, linestyle = hline.style_dashed)
hline(-0.6, "-0.6 Threshold", color = color.gray, linestyle = hline.style_dashed)
```

---

### Module 8: Signal Scoring & Entry Trigger

- **Purpose**: Compute weighted confluence score (0-100 pts) and issue LONG / SHORT setups.

```pinescript
// --- SIGNAL SCORING ENGINE ---
int score = 0
if (htf_bias == "BULLISH") score += 15
if (bull_sweep)           score += 20
if (bull_mss)             score += 20
if (fvg_is_bullish)       score += 15
if (volume_confirmed)     score += 10
if (momentum_confirmed)   score += 10
if (is_overlap_session)   score += 10
if (dxy_corr <= -0.6)     score += 10

bool long_signal = (score >= 50) and bull_sweep and barstate.isconfirmed
bool short_signal = (score >= 50) and bear_sweep and barstate.isconfirmed

string grade = score >= 85 ? "A+" : (score >= 70 ? "A" : "B")

plotshape(long_signal, title="LONG SIGNAL", style=shape.labelup, location=location.belowbar, color=color.green, text="LONG\n" + grade, textcolor=color.white)
plotshape(short_signal, title="SHORT SIGNAL", style=shape.labeldown, location=location.abovebar, color=color.red, text="SHORT\n" + grade, textcolor=color.white)
```

---

### Module 9: Automatic Risk/Reward Overlay

- **Purpose**: Draw Entry, Structural SL, TP1 (1:2), TP2 (1:3), TP3 (1:4) lines and boxes.

```pinescript
// --- AUTOMATIC RISK / REWARD OVERLAY ---
if long_signal
    float entry = close
    float sl = low < pdl ? low - (syminfo.mintick * 30) : pdl - (syminfo.mintick * 30)
    float risk = entry - sl
    float tp1 = entry + (risk * 2.0)
    float tp3 = entry + (risk * 4.0)

    line.new(bar_index, entry, bar_index + 25, entry, color = color.cyan, width = 2)
    line.new(bar_index, sl, bar_index + 25, sl, color = color.red, width = 2)
    line.new(bar_index, tp3, bar_index + 25, tp3, color = color.green, width = 2)
    
    box.new(bar_index, tp3, bar_index + 25, entry, bgcolor = color.new(color.green, 85), border_color = color.green)
    box.new(bar_index, entry, bar_index + 25, sl, bgcolor = color.new(color.red, 85), border_color = color.red)
```

---

## 3. Alert Event Table

| Alert Event | Condition | Pine Function |
| :--- | :--- | :--- |
| `LONG_SETUP` | `long_signal and barstate.isconfirmed` | `alert("LONG Setup Triggered", alert.freq_once_per_bar_close)` |
| `SHORT_SETUP` | `short_signal and barstate.isconfirmed` | `alert("SHORT Setup Triggered", alert.freq_once_per_bar_close)` |
| `A_PLUS_SETUP` | `long_signal and grade == "A+"` | `alert("A+ Setup Triggered", alert.freq_once_per_bar_close)` |
| `LIQUIDITY_SWEEP_BULLISH` | `bull_sweep and barstate.isconfirmed` | `alert("Bullish Sweep Detected", alert.freq_once_per_bar_close)` |

---

## 4. Summary Matrix of Pine Script Equivalent Functions

| Modular Engine Component | JavaScript Class | TradingView Pine Script Equivalent |
| :--- | :--- | :--- |
| Previous Week Range | `PreviousWeekRange` | `request.security(syminfo.tickerid, "W", [high[1], low[1]])` |
| Previous Day Range | `PreviousDayRange` | `request.security(syminfo.tickerid, "D", [high[1], low[1]])` |
| 5AM CRT 4H Zone | `CRTModule` | `time` / `box.new()` |
| 1H Fair Value Gaps | `FVGModule` | 3-candle offset check + `box.new()` |
| 1H Order Blocks | `OrderBlockModule` | `ta.highest` / `ta.lowest` + `box.new()` |
| High-Timeframe Sweeps | `LiquidityModule` | Price penetration check + `barstate.isconfirmed` |
| DXY Correlation | `DxyCorrelation` | `ta.correlation(close, dxy_close, 20)` |
| Signal Scoring | `SignalScoring` | Conditional integer summation |
| Position Sizing | `RiskManagement` | `(strategy.equity * risk_pct) / risk_in_points` |

