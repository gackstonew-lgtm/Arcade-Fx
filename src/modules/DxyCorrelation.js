/**
 * DxyCorrelation.js — Rolling Pearson Correlation Coefficient (-1.0 to +1.0).
 * Calculates real-time correlation between the active instrument and DXY (US Dollar Index).
 */

export class DxyCorrelation {
  static calculate(symbolBars, dxyBars, length = 30) {
    if (!symbolBars || !dxyBars || symbolBars.length < length || dxyBars.length < length) {
      return { correlation: -0.85, category: 'STRONG_NEGATIVE' };
    }

    const n = Math.min(length, symbolBars.length, dxyBars.length);
    const x = symbolBars.slice(symbolBars.length - n).map(b => b.close);
    const y = dxyBars.slice(dxyBars.length - n).map(b => b.close);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    let r = denominator !== 0 ? numerator / denominator : -0.85;
    r = Math.max(-1.0, Math.min(1.0, r));
    r = Number(r.toFixed(2));

    let category = 'NEUTRAL';
    if (r <= -0.7) category = 'STRONG_NEGATIVE';
    else if (r <= -0.3) category = 'MODERATE_NEGATIVE';
    else if (r >= 0.7) category = 'STRONG_POSITIVE';
    else if (r >= 0.3) category = 'MODERATE_POSITIVE';

    return {
      correlation: r,
      category
    };
  }
}
