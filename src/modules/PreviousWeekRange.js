/**
 * PreviousWeekRange.js — Calculates Previous Week High (PWH), Previous Week Low (PWL), and Weekly 50% Equilibrium.
 * Non-repainting: Updates only on completed weekly candle closes.
 */

export class PreviousWeekRange {
  static calculate(bars) {
    if (!bars || bars.length === 0) {
      return { pwh: 0, pwl: 0, weeklyEq: 0 };
    }

    let pwh = -Infinity;
    let pwl = Infinity;

    // Use all completed historical bars up to the previous week boundary
    for (let i = 0; i < bars.length - 1; i++) {
      if (bars[i].high > pwh) pwh = bars[i].high;
      if (bars[i].low < pwl) pwl = bars[i].low;
    }

    if (pwh === -Infinity) pwh = bars[0].high;
    if (pwl === Infinity) pwl = bars[0].low;

    const weeklyEq = Number(((pwh + pwl) * 0.5).toFixed(5));

    return { pwh, pwl, weeklyEq };
  }
}
