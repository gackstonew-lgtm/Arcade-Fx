/**
 * MomentumModule.js — ATR & Candle Body Momentum Expansion Filter.
 * Measures candle body size ratio against Average True Range (ATR) to confirm institutional displacement.
 */

export class MomentumModule {
  static analyze(bars, period = 14) {
    if (!bars || bars.length < period) {
      return { atr: 0, bodyRatio: 1.0, isExpanded: false };
    }

    let trSum = 0;
    for (let i = bars.length - period; i < bars.length; i++) {
      const high = bars[i].high;
      const low = bars[i].low;
      const prevClose = bars[i - 1] ? bars[i - 1].close : bars[i].open;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }

    const atr = Number((trSum / period).toFixed(5));
    const current = bars[bars.length - 1];
    const body = Math.abs(current.close - current.open);
    const bodyRatio = atr > 0 ? Number((body / atr).toFixed(2)) : 1.0;
    const isExpanded = bodyRatio >= 1.1;

    return {
      atr,
      body,
      bodyRatio,
      isExpanded
    };
  }
}
