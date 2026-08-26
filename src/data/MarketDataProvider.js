/**
 * MarketDataProvider.js — Real-market data adapter for Arcade FX.
 *
 * Historical OHLCV data is fetched from the BM Forex VPS signal engine
 * through the Netlify /api/market-data function. Synthetic candles are
 * intentionally NOT used as a production fallback.
 */

import { ApiClient } from './apiClient.js';

export const SYMBOLS = [
  { code: 'EURUSD', name: 'Euro / US Dollar', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'GBPUSD', name: 'British Pound / US Dollar', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'USDJPY', name: 'US Dollar / Japanese Yen', basePrice: 0, pipSize: 0.01, type: 'forex' },
  { code: 'USDCHF', name: 'US Dollar / Swiss Franc', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'USDCAD', name: 'US Dollar / Canadian Dollar', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'AUDUSD', name: 'Australian Dollar / US Dollar', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'EURGBP', name: 'Euro / British Pound', basePrice: 0, pipSize: 0.0001, type: 'forex' },
  { code: 'EURJPY', name: 'Euro / Japanese Yen', basePrice: 0, pipSize: 0.01, type: 'forex' },
  { code: 'GBPJPY', name: 'British Pound / Japanese Yen', basePrice: 0, pipSize: 0.01, type: 'forex' },
  { code: 'XAUUSD', name: 'Gold / US Dollar', basePrice: 0, pipSize: 0.1, type: 'commodity' },
  { code: 'XAGUSD', name: 'Silver / US Dollar', basePrice: 0, pipSize: 0.01, type: 'commodity' }
];

export class MarketDataProvider {
  static getSymbolInfo(code) {
    return SYMBOLS.find(symbol => symbol.code === code) || SYMBOLS[0];
  }

  static async fetchSymbolsFromBackend() {
    const result = await ApiClient.fetchSymbols();
    if (result?.success && Array.isArray(result.symbols) && result.symbols.length) {
      return result.symbols.map(symbol => ({
        code: symbol.code,
        name: symbol.name || symbol.code,
        basePrice: Number(symbol.basePrice || 0),
        pipSize: Number(symbol.pipSize || (String(symbol.code).includes('JPY') ? 0.01 : 0.0001)),
        type: symbol.type || 'forex'
      }));
    }

    throw new Error(result?.error || 'Live symbol feed unavailable');
  }

  static async fetchHistoryFromBackend(symbolCode = 'EURUSD', count = 120, tfMinutes = 15) {
    const result = await ApiClient.fetchHistory(symbolCode, tfMinutes, count);

    if (result?.success && Array.isArray(result.bars) && result.bars.length > 0) {
      return result.bars;
    }

    throw new Error(
      result?.error ||
      `Live OHLCV feed unavailable for ${symbolCode}`
    );
  }

  /**
   * Kept as an explicit test utility for unit/integration testing.
   */
  static generateHistory(symbolCode = 'EURUSD', count = 120, tfMinutes = 15) {
    const info = this.getSymbolInfo(symbolCode);
    const basePrice = info.basePrice || 1.0850;
    const now = Date.now();
    const intervalMs = tfMinutes * 60 * 1000;
    const bars = [];

    let currentPrice = basePrice;
    for (let i = count - 1; i >= 0; i--) {
      const time = now - (i * intervalMs);
      const open = currentPrice;
      const change = (Math.sin(i * 0.5) + 0.05) * (info.pipSize || 0.0001) * 10;
      const close = Number((open + change).toFixed(5));
      const high = Number((Math.max(open, close) + Math.abs(change) * 0.5).toFixed(5));
      const low = Number((Math.min(open, close) - Math.abs(change) * 0.5).toFixed(5));
      const volume = Math.floor(500 + i * 10);

      bars.push({ time, open, high, low, close, volume });
      currentPrice = close;
    }
    return bars;
  }
}
