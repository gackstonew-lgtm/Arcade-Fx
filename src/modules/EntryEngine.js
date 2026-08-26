/**
 * EntryEngine.js — Entry Trigger & Execution Setup Validator.
 * Validates Long and Short entry criteria, entry price, SL level, and TP levels.
 */

export class EntryEngine {
  static validate(bars, scoring, pdh, pdl, crt) {
    if (!bars || bars.length === 0 || !scoring.isTradeable) {
      return { isValid: false, reason: 'Confluence score below minimum threshold' };
    }

    const current = bars[bars.length - 1];
    const entryPrice = current.close;

    let direction = scoring.direction;
    let stopLoss = 0;
    let takeProfit1 = 0;
    let takeProfit2 = 0;
    let takeProfit3 = 0;

    const pipBuffer = 0.0003; // 3 pips buffer for forex

    if (direction === 'LONG') {
      stopLoss = Number((Math.min(current.low, pdl || current.low, crt ? crt.crtLow : current.low) - pipBuffer).toFixed(5));
      const riskPips = entryPrice - stopLoss;
      takeProfit1 = Number((entryPrice + riskPips * 2.0).toFixed(5)); // 1:2
      takeProfit2 = Number((entryPrice + riskPips * 3.2).toFixed(5)); // 1:3.2
      takeProfit3 = Number((entryPrice + riskPips * 4.0).toFixed(5)); // 1:4
    } else {
      stopLoss = Number((Math.max(current.high, pdh || current.high, crt ? crt.crtHigh : current.high) + pipBuffer).toFixed(5));
      const riskPips = stopLoss - entryPrice;
      takeProfit1 = Number((entryPrice - riskPips * 2.0).toFixed(5));
      takeProfit2 = Number((entryPrice - riskPips * 3.2).toFixed(5));
      takeProfit3 = Number((entryPrice - riskPips * 4.0).toFixed(5));
    }

    const riskRewardRatio = '1 : 3.2';

    return {
      isValid: true,
      direction,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      riskRewardRatio,
      grade: scoring.grade,
      score: scoring.score
    };
  }
}
