/**
 * LiquidityModule.js — HTF Liquidity Sweep & Rejection Engine.
 * Detects liquidity sweeps above PDH/PWH or below PDL/PWL where price wicks beyond a level but closes back inside.
 */

export class LiquidityModule {
  static analyze(bars, pdh, pdl) {
    if (!bars || bars.length === 0 || !pdh || !pdl) {
      return { sweep: null, description: 'No liquidity sweep detected' };
    }

    const current = bars[bars.length - 1];

    // Bullish Liquidity Sweep (Swept PDL/PWL): Low < PDL but Close > PDL
    if (current.low < pdl && current.close > pdl) {
      return {
        sweep: {
          type: 'BULLISH',
          level: pdl,
          levelName: 'PDL',
          wickLow: current.low,
          rejectionClose: current.close
        },
        description: `Bullish Sweep of PDL (${pdl}) with close rejection`
      };
    }

    // Bearish Liquidity Sweep (Swept PDH/PWH): High > PDH but Close < PDH
    if (current.high > pdh && current.close < pdh) {
      return {
        sweep: {
          type: 'BEARISH',
          level: pdh,
          levelName: 'PDH',
          wickHigh: current.high,
          rejectionClose: current.close
        },
        description: `Bearish Sweep of PDH (${pdh}) with close rejection`
      };
    }

    return { sweep: null, description: 'Price oscillating within liquidity levels' };
  }
}
