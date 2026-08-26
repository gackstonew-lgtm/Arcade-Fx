/**
 * FVGModule.js — 3-Candle Fair Value Gap (FVG) Detection & Mitigation Tracking.
 * Identifies Bullish FVGs (Bar 1 High < Bar 3 Low) and Bearish FVGs (Bar 1 Low > Bar 3 High),
 * and tracks mitigation state (UNMITIGATED, PARTIALLY_MITIGATED, FULLY_MITIGATED).
 */

export class FVGModule {
  static analyze(bars) {
    if (!bars || bars.length < 3) {
      return { fvgs: [], activeCount: 0 };
    }

    const fvgs = [];
    const len = bars.length;

    for (let i = 2; i < len; i++) {
      const b1 = bars[i - 2];
      const b2 = bars[i - 1];
      const b3 = bars[i];

      // Bullish FVG: Gap between b1.high and b3.low
      if (b3.low > b1.high) {
        const top = b3.low;
        const bottom = b1.high;
        const gapSize = top - bottom;

        let status = 'UNMITIGATED';
        // Check subsequent bars for mitigation
        for (let j = i + 1; j < len; j++) {
          if (bars[j].low <= bottom) {
            status = 'FULLY_MITIGATED';
            break;
          } else if (bars[j].low < top) {
            status = 'PARTIALLY_MITIGATED';
          }
        }

        fvgs.push({
          id: `fvg-bull-${i}`,
          type: 'BULLISH',
          startIndex: i - 2,
          endIndex: i,
          top,
          bottom,
          gapSize: Number(gapSize.toFixed(5)),
          status
        });
      }
      // Bearish FVG: Gap between b1.low and b3.high
      else if (b3.high < b1.low) {
        const top = b1.low;
        const bottom = b3.high;
        const gapSize = top - bottom;

        let status = 'UNMITIGATED';
        for (let j = i + 1; j < len; j++) {
          if (bars[j].high >= top) {
            status = 'FULLY_MITIGATED';
            break;
          } else if (bars[j].high > bottom) {
            status = 'PARTIALLY_MITIGATED';
          }
        }

        fvgs.push({
          id: `fvg-bear-${i}`,
          type: 'BEARISH',
          startIndex: i - 2,
          endIndex: i,
          top,
          bottom,
          gapSize: Number(gapSize.toFixed(5)),
          status
        });
      }
    }

    const activeFvgs = fvgs.filter(f => f.status !== 'FULLY_MITIGATED');

    return {
      fvgs,
      activeFvgs,
      activeCount: activeFvgs.length
    };
  }
}
