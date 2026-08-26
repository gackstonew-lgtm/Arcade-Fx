/**
 * StructureModule.js — Market Structure Shift (MSS) and Break of Structure (BOS) Detector.
 * Analyzes swing highs and swing lows across timeframes to determine directional market structure.
 */

export class StructureModule {
  static analyze(bars) {
    if (!bars || bars.length < 10) {
      return { bias: 'NEUTRAL', mss: null, swingHighs: [], swingLows: [] };
    }

    const swingHighs = [];
    const swingLows = [];

    // Find swing points (5-bar fractal)
    for (let i = 2; i < bars.length - 2; i++) {
      if (
        bars[i].high > bars[i - 1].high &&
        bars[i].high > bars[i - 2].high &&
        bars[i].high > bars[i + 1].high &&
        bars[i].high > bars[i + 2].high
      ) {
        swingHighs.push({ index: i, price: bars[i].high, time: bars[i].time });
      }

      if (
        bars[i].low < bars[i - 1].low &&
        bars[i].low < bars[i - 2].low &&
        bars[i].low < bars[i + 1].low &&
        bars[i].low < bars[i + 2].low
      ) {
        swingLows.push({ index: i, price: bars[i].price || bars[i].low, time: bars[i].time });
      }
    }

    let bias = 'BULLISH';
    let mss = null;

    const latestClose = bars[bars.length - 1].close;

    if (swingHighs.length > 0 && swingLows.length > 0) {
      const lastHigh = swingHighs[swingHighs.length - 1];
      const lastLow = swingLows[swingLows.length - 1];

      if (latestClose > lastHigh.price) {
        bias = 'BULLISH';
        mss = { type: 'BULLISH_MSS', brokenLevel: lastHigh.price, time: bars[bars.length - 1].time };
      } else if (latestClose < lastLow.price) {
        bias = 'BEARISH';
        mss = { type: 'BEARISH_MSS', brokenLevel: lastLow.price, time: bars[bars.length - 1].time };
      }
    }

    return {
      bias,
      mss,
      swingHighs,
      swingLows
    };
  }
}
