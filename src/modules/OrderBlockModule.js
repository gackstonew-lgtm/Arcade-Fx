/**
 * OrderBlockModule.js — Order Block Displacement & Mitigation Tracker.
 * Detects institutional order blocks preceding energetic market structure shifts (MSS).
 */

export class OrderBlockModule {
  static analyze(bars) {
    if (!bars || bars.length < 5) {
      return { orderBlocks: [], activeOb: null };
    }

    const orderBlocks = [];
    const len = bars.length;

    for (let i = 2; i < len - 2; i++) {
      const current = bars[i];
      const next1 = bars[i + 1];
      const next2 = bars[i + 2];

      const isUpDisplacement = (next1.close > next1.open) && (next2.close > next2.open) && (next2.close > current.high);
      const isDownDisplacement = (next1.close < next1.open) && (next2.close < next2.open) && (next2.close < current.low);

      if (isUpDisplacement && current.close < current.open) {
        // Bullish Order Block: Last down candle before strong move up
        let isMitigated = false;
        for (let j = i + 3; j < len; j++) {
          if (bars[j].low < current.low) {
            isMitigated = true;
            break;
          }
        }

        orderBlocks.push({
          id: `ob-bull-${i}`,
          type: 'BULLISH',
          high: current.high,
          low: current.low,
          time: current.time,
          isMitigated
        });
      } else if (isDownDisplacement && current.close > current.open) {
        // Bearish Order Block: Last up candle before strong move down
        let isMitigated = false;
        for (let j = i + 3; j < len; j++) {
          if (bars[j].high > current.high) {
            isMitigated = true;
            break;
          }
        }

        orderBlocks.push({
          id: `ob-bear-${i}`,
          type: 'BEARISH',
          high: current.high,
          low: current.low,
          time: current.time,
          isMitigated
        });
      }
    }

    const unmitigatedObs = orderBlocks.filter(ob => !ob.isMitigated);
    const activeOb = unmitigatedObs.length > 0 ? unmitigatedObs[unmitigatedObs.length - 1] : null;

    return {
      orderBlocks,
      unmitigatedObs,
      activeOb
    };
  }
}
