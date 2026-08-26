/**
 * PreviousDayRange.js — Calculates Previous Day High (PDH), Previous Day Low (PDL), and Daily 50% Equilibrium.
 * Non-repainting: Updates only on completed daily candle closes.
 */

export class PreviousDayRange {
  static calculate(bars) {
    if (!bars || bars.length === 0) {
      return { pdh: 0, pdl: 0, dailyEq: 0 };
    }

    let pdh = -Infinity;
    let pdl = Infinity;

    // Scan recent daily/intraday bars (excluding currently forming bar)
    const startIndex = Math.max(0, bars.length - 1 - 40);
    for (let i = startIndex; i < bars.length - 1; i++) {
      if (bars[i].high > pdh) pdh = bars[i].high;
      if (bars[i].low < pdl) pdl = bars[i].low;
    }

    if (pdh === -Infinity) pdh = bars[0].high;
    if (pdl === Infinity) pdl = bars[0].low;

    const dailyEq = Number(((pdh + pdl) * 0.5).toFixed(5));

    return { pdh, pdl, dailyEq };
  }
}
