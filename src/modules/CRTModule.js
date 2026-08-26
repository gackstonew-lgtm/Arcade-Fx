/**
 * CRTModule.js — 5AM Candle Range Theory (CRT) 4H Candle Detector & Range Module.
 * Detects 5 AM UTC 4H candle boundaries, calculates CRT High, CRT Low, CRT Equilibrium (50%),
 * and tracks liquidity sweep status.
 */

export class CRTModule {
  static analyze(bars, crtHourUTC = 5) {
    if (!bars || bars.length === 0) {
      return { crtHigh: 0, crtLow: 0, crtEq: 0, status: 'NO_DATA', activeBar: null };
    }

    let targetBar = null;

    // Search backwards for the 5AM UTC candle
    for (let i = bars.length - 1; i >= 0; i--) {
      const date = new Date(bars[i].time);
      const hour = date.getUTCHours();
      if (hour === crtHourUTC || (hour >= crtHourUTC && hour < crtHourUTC + 4)) {
        targetBar = bars[i];
        break;
      }
    }

    if (!targetBar) {
      targetBar = bars[Math.max(0, bars.length - 15)];
    }

    const crtHigh = targetBar.high;
    const crtLow = targetBar.low;
    const crtEq = Number(((crtHigh + crtLow) * 0.5).toFixed(5));

    // Determine current price position relative to CRT range
    const currentClose = bars[bars.length - 1].close;
    let status = 'IN_RANGE';

    if (currentClose > crtHigh) {
      status = 'BULLISH_EXPANSION';
    } else if (currentClose < crtLow) {
      status = 'BEARISH_EXPANSION';
    } else if (bars[bars.length - 1].low < crtLow && currentClose > crtLow) {
      status = 'LIQUIDITY_SWEPT_BULLISH';
    } else if (bars[bars.length - 1].high > crtHigh && currentClose < crtHigh) {
      status = 'LIQUIDITY_SWEPT_BEARISH';
    }

    return {
      crtHigh,
      crtLow,
      crtEq,
      status,
      activeBar: targetBar
    };
  }
}
