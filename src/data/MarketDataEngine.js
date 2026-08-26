/**
 * MarketDataEngine.js — Live multi-timeframe market-data controller.
 *
 * The production path loads real OHLCV candles from the Netlify API,
 * which proxies the BM Forex VPS signal engine. It never generates
 * synthetic candles when the live feed is unavailable.
 */

import { MarketDataProvider } from './MarketDataProvider.js';

export class MarketDataEngine {
  constructor(symbol = 'EURUSD', timeframe = '15M') {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.rawBars = [];
    this.visibleBars = [];
    this.isPlaying = false;
    this.isLoading = false;
    this.error = null;
    this.timer = null;
    this.playbackIndex = 0;
    this.listeners = new Set();

    void this.initData();
  }

  setSymbol(symbol) {
    if (this.symbol === symbol) return;
    this.symbol = symbol;
    void this.initData();
  }

  setTimeframe(tf) {
    if (this.timeframe === tf) return;
    this.timeframe = tf;
    void this.initData();
  }

  getTimeframeMinutes(tf = this.timeframe) {
    switch (tf) {
      case '1M': return 1;
      case '5M': return 5;
      case '15M': return 15;
      case '30M': return 30;
      case '1H': return 60;
      case '4H': return 240;
      case '1D': return 1440;
      case '1W': return 10080;
      default: return 15;
    }
  }

  async initData() {
    this.pause();
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const tfMinutes = this.getTimeframeMinutes();
      const count = 250;
      const bars = await MarketDataProvider.fetchHistoryFromBackend(
        this.symbol,
        count,
        tfMinutes
      );

      this.rawBars = Array.isArray(bars) ? bars : [];
      this.playbackIndex = this.rawBars.length;
      this.visibleBars = [...this.rawBars];

      if (!this.visibleBars.length) {
        throw new Error(`No live OHLCV data returned for ${this.symbol}`);
      }
    } catch (error) {
      this.rawBars = [];
      this.visibleBars = [];
      this.playbackIndex = 0;
      this.error = error instanceof Error ? error.message : String(error);
      console.warn('[MarketDataEngine] Live feed unavailable:', this.error);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  play() {
    if (this.isPlaying || !this.rawBars.length) return;

    this.isPlaying = true;
    this.timer = setInterval(() => {
      this.step();
    }, 1200);
    this.notify();
  }

  pause() {
    this.isPlaying = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.notify();
  }

  step() {
    if (this.playbackIndex < this.rawBars.length) {
      this.playbackIndex++;
      this.visibleBars = this.rawBars.slice(0, this.playbackIndex);
      this.notify();
      return;
    }

    // Never fabricate a candle. Refresh the live feed instead.
    this.pause();
    void this.initData();
  }

  reset() {
    void this.initData();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const latestBar = this.visibleBars[this.visibleBars.length - 1];

    for (const listener of this.listeners) {
      try {
        listener({
          symbol: this.symbol,
          timeframe: this.timeframe,
          bars: this.visibleBars,
          isPlaying: this.isPlaying,
          isLoading: this.isLoading,
          error: this.error,
          latestBar
        });
      } catch (err) {
        console.error('Error in market data engine listener:', err);
      }
    }
  }
}
