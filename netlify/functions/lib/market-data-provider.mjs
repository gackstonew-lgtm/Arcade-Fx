/**
 * ArcadeFX — Production Market Data Provider Abstraction Layer
 *
 * Implements a pluggable multi-provider abstraction for real-time market data:
 *   MarketDataProvider
 *     ├── ForexProvider   (Primary: VPS Signal Engine / Twelve Data; Secondary: ECB)
 *     ├── GoldProvider    (Primary: GoldAPI.io / GoldPrice.org; Secondary: Metals.dev)
 *     ├── MetalsProvider  (Primary: GoldAPI.io / Metals.dev; Secondary: Twelve Data)
 *     └── ECBProvider     (European Central Bank 90-day XML feed & cross rates)
 *
 * NON-NEGOTIABLE RULE: No synthetic, random, or mock market data is generated.
 * If all real-data providers fail, endpoints return a truthful unavailable state.
 */

import { fetchBmPrices, fetchBmOhlcv, fetchLiveGoldPrice } from './bm-live-engine.mjs';
import { fetchGoldApiSnapshot } from './goldapi-data.mjs';
import { fetchPriceSnapshot as fetchTwelveDataSnapshot, SUPPORTED_SYMBOLS } from './twelve-data.mjs';
import { fetchEcbWatchlist } from './ecb-data.mjs';

const SYMBOL_METADATA = [
  { code: 'EURUSD', name: 'Euro / US Dollar', basePrice: 1.0850, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'GBPUSD', name: 'British Pound / US Dollar', basePrice: 1.2720, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'USDJPY', name: 'US Dollar / Japanese Yen', basePrice: 154.50, pipSize: 0.01, assetClass: 'forex', dec: 3 },
  { code: 'USDCHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8980, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'USDCAD', name: 'US Dollar / Canadian Dollar', basePrice: 1.3650, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'AUDUSD', name: 'Australian Dollar / US Dollar', basePrice: 0.6620, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', basePrice: 0.6120, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'EURGBP', name: 'Euro / British Pound', basePrice: 0.8530, pipSize: 0.0001, assetClass: 'forex', dec: 5 },
  { code: 'EURJPY', name: 'Euro / Japanese Yen', basePrice: 167.60, pipSize: 0.01, assetClass: 'forex', dec: 3 },
  { code: 'GBPJPY', name: 'British Pound / Japanese Yen', basePrice: 196.50, pipSize: 0.01, assetClass: 'forex', dec: 3 },
  { code: 'XAUUSD', name: 'Gold / US Dollar', basePrice: 2485.50, pipSize: 0.1, assetClass: 'metals', dec: 2 },
  { code: 'XAGUSD', name: 'Silver / US Dollar', basePrice: 28.50, pipSize: 0.01, assetClass: 'metals', dec: 2 }
];

export class ForexProvider {
  static async getPrices() {
    try {
      const bm = await fetchBmPrices();
      if (bm?.prices && typeof bm.prices === 'object' && Object.keys(bm.prices).length > 0) {
        return { prices: bm.prices, source: 'Real-Time VPS Signal Engine', status: 'LIVE' };
      }
    } catch (err) {
      console.warn('[ForexProvider] Primary VPS engine price fetch failed:', err.message);
    }

    // Secondary Provider: Twelve Data or ECB reference rates
    const fallbackPrices = {};
    for (const info of SYMBOL_METADATA.filter(s => s.assetClass === 'forex')) {
      try {
        const td = await fetchTwelveDataSnapshot({ code: info.code, tdSymbol: `${info.code.slice(0, 3)}/${info.code.slice(3)}`, pipSize: info.pipSize, basePrice: info.basePrice });
        if (td?.price && Number.isFinite(td.price)) {
          fallbackPrices[info.code] = td.price;
        }
      } catch (e) {
        // Continue fallback scan
      }
    }

    if (Object.keys(fallbackPrices).length > 0) {
      return { prices: fallbackPrices, source: 'Twelve Data Secondary Feed', status: 'LIVE_SECONDARY' };
    }

    throw new Error('Forex market data sources currently unavailable');
  }

  static async getHistory(symbol = 'EURUSD', timeframe = 15, limit = 250) {
    try {
      const data = await fetchBmOhlcv(symbol, timeframe, limit);
      const candles = Array.isArray(data?.candles) ? data.candles : (Array.isArray(data?.bars) ? data.bars : []);
      const bars = candles.map((c, index) => {
        const time = c.time ?? c.timestamp ?? c.ts ?? Date.now();
        const tsMs = typeof time === 'number' ? (time < 10_000_000_000 ? time * 1000 : time) : new Date(time).getTime();
        return {
          time: tsMs,
          isoTime: new Date(tsMs).toISOString(),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume ?? 0),
          index
        };
      }).filter(b => [b.open, b.high, b.low, b.close].every(Number.isFinite));

      if (bars.length > 0) {
        return { bars, source: 'Real-Time VPS Signal Engine', status: 'LIVE' };
      }
    } catch (err) {
      console.warn(`[ForexProvider] History fetch failed for ${symbol}:`, err.message);
    }

    throw new Error(`Real market history unavailable for ${symbol}. Production mode does not generate synthetic candles.`);
  }
}

export class GoldProvider {
  static async getLivePrice() {
    const gold = await fetchLiveGoldPrice();
    if (gold && Number.isFinite(gold.price) && gold.price > 0) {
      return gold;
    }
    throw new Error('Gold market data feeds (GoldAPI / GoldPrice.org / Metals.dev) currently unavailable');
  }
}

export class MetalsProvider {
  static async getSnapshot(symbolCode = 'XAUUSD') {
    const snapshot = await fetchGoldApiSnapshot(symbolCode);
    if (snapshot && snapshot.status !== 'REFERENCE') {
      return snapshot;
    }
    if (symbolCode === 'XAUUSD') {
      const gold = await fetchLiveGoldPrice();
      if (gold) {
        return {
          symbol: 'XAUUSD',
          name: 'Gold / US Dollar',
          price: gold.price,
          bid: gold.bid,
          ask: gold.ask,
          timestamp: gold.timestamp,
          provider: gold.source,
          status: gold.status
        };
      }
    }
    return snapshot;
  }
}

export class ECBProvider {
  static async getWatchlist() {
    return await fetchEcbWatchlist();
  }
}

export class MarketDataProvider {
  static getSymbols() {
    return SYMBOL_METADATA.map(s => ({
      code: s.code,
      name: s.name,
      basePrice: s.basePrice,
      pipSize: s.pipSize,
      type: s.assetClass === 'metals' ? 'commodity' : 'forex'
    }));
  }

  static async getLivePrices() {
    try {
      return await ForexProvider.getPrices();
    } catch (err) {
      const gold = await GoldProvider.getLivePrice().catch(() => null);
      if (gold) {
        return {
          prices: { XAUUSD: gold.price },
          source: gold.source,
          status: gold.status
        };
      }
      throw err;
    }
  }

  static async getHistory(symbol = 'EURUSD', timeframe = 15, count = 120) {
    return await ForexProvider.getHistory(symbol, timeframe, count);
  }
}
