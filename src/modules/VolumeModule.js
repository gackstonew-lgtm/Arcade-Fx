/**
 * VolumeModule.js — Volume SMA Expansion Filter.
 * Verifies institutional participation when volume exceeds the n-period simple moving average.
 */

export class VolumeModule {
  static analyze(bars, period = 20) {
    if (!bars || bars.length < period) {
      return { volumeSma: 0, isExpanded: false, ratio: 1.0 };
    }

    const recentBars = bars.slice(bars.length - period);
    const sum = recentBars.reduce((acc, bar) => acc + (bar.volume || 0), 0);
    const volumeSma = Math.round(sum / period);

    const currentVolume = bars[bars.length - 1].volume || 0;
    const ratio = volumeSma > 0 ? Number((currentVolume / volumeSma).toFixed(2)) : 1.0;
    const isExpanded = ratio >= 1.2;

    return {
      volumeSma,
      currentVolume,
      ratio,
      isExpanded
    };
  }
}
