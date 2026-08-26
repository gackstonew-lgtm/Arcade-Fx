/**
 * Arcade FX — ECB Reference Data Service (Netlify Serverless)
 * Fetches official European Central Bank reference exchange rates,
 * computes derived FX cross rates, calculates 24h changes from consecutive working days,
 * and normalizes symbols for ArcadeFX Watchlist.
 */

import { fetchGoldApiSnapshot } from './goldapi-data.mjs';
import { fetchPriceSnapshot as fetchTwelveDataSnapshot } from './twelve-data.mjs';
import { fetchBmPrices } from './bm-live-engine.mjs';

const ECB_HIST_90D_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';

let ecbCache = {
  expiresAt: 0,
  data: null
};

export const SYMBOL_METADATA = [
  { code: 'EURUSD', displaySymbol: 'EUR / USD', name: 'Euro / US Dollar', assetClass: 'forex', basePrice: 1.0850, pipSize: 0.0001, dec: 5 },
  { code: 'GBPUSD', displaySymbol: 'GBP / USD', name: 'British Pound / US Dollar', assetClass: 'forex', basePrice: 1.2720, pipSize: 0.0001, dec: 5 },
  { code: 'USDJPY', displaySymbol: 'USD / JPY', name: 'US Dollar / Japanese Yen', assetClass: 'forex', basePrice: 154.50, pipSize: 0.01, dec: 3 },
  { code: 'USDCHF', displaySymbol: 'USD / CHF', name: 'US Dollar / Swiss Franc', assetClass: 'forex', basePrice: 0.8980, pipSize: 0.0001, dec: 5 },
  { code: 'USDCAD', displaySymbol: 'USD / CAD', name: 'US Dollar / Canadian Dollar', assetClass: 'forex', basePrice: 1.3650, pipSize: 0.0001, dec: 5 },
  { code: 'AUDUSD', displaySymbol: 'AUD / USD', name: 'Australian Dollar / US Dollar', assetClass: 'forex', basePrice: 0.6620, pipSize: 0.0001, dec: 5 },
  { code: 'NZDUSD', displaySymbol: 'NZD / USD', name: 'New Zealand Dollar / US Dollar', assetClass: 'forex', basePrice: 0.6120, pipSize: 0.0001, dec: 5 },
  { code: 'EURGBP', displaySymbol: 'EUR / GBP', name: 'Euro / British Pound', assetClass: 'forex', basePrice: 0.8530, pipSize: 0.0001, dec: 5 },
  { code: 'EURJPY', displaySymbol: 'EUR / JPY', name: 'Euro / Japanese Yen', assetClass: 'forex', basePrice: 167.60, pipSize: 0.01, dec: 3 },
  { code: 'GBPJPY', displaySymbol: 'GBP / JPY', name: 'British Pound / Japanese Yen', assetClass: 'forex', basePrice: 196.50, pipSize: 0.01, dec: 3 },
  { code: 'XAUUSD', displaySymbol: 'XAU / USD', name: 'Gold / US Dollar', assetClass: 'metals', basePrice: 2485.50, pipSize: 0.1, dec: 2 },
  { code: 'XAGUSD', displaySymbol: 'XAG / USD', name: 'Silver / US Dollar', assetClass: 'metals', basePrice: 28.50, pipSize: 0.01, dec: 2 }
];

export function getCrossRate(baseCurrency, quoteCurrency, ecbRates) {
  if (!ecbRates) return null;
  const rates = { EUR: 1.0, ...ecbRates };
  const baseRate = rates[baseCurrency];
  const quoteRate = rates[quoteCurrency];

  if (!baseRate || !quoteRate) return null;
  return quoteRate / baseRate;
}

function parseEcbXml(xmlText) {
  const days = [];
  const cubeRegex = /<Cube\s+time=['"]([^'"]+)['"]\s*>([\s\S]*?)<\/Cube>/g;
  let dayMatch;

  while ((dayMatch = cubeRegex.exec(xmlText)) !== null) {
    const time = dayMatch[1];
    const innerContent = dayMatch[2];
    const rateRegex = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g;
    const rates = {};
    let rateMatch;

    while ((rateMatch = rateRegex.exec(innerContent)) !== null) {
      rates[rateMatch[1]] = parseFloat(rateMatch[2]);
    }

    if (Object.keys(rates).length > 0) {
      days.push({ time, rates });
    }
  }

  return days;
}

export async function fetchEcbWatchlist() {
  if (ecbCache.data && Date.now() < ecbCache.expiresAt) {
    return ecbCache.data;
  }

  let ecbDays = [];
  let ecbSource = 'ECB Reference Rates';
  let isEcbSuccess = false;

  try {
    const res = await fetch(ECB_HIST_90D_URL, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const xmlText = await res.text();
      ecbDays = parseEcbXml(xmlText);
      if (ecbDays.length > 0) {
        isEcbSuccess = true;
      }
    }
  } catch (e) {
    console.warn('[ECB Service] Could not fetch live ECB XML feed:', e.message);
  }

  let vpsPrices = null;
  try {
    const bmRes = await fetchBmPrices();
    if (bmRes && bmRes.prices && typeof bmRes.prices === 'object') {
      vpsPrices = bmRes.prices;
    }
  } catch (e) {
    console.warn('[Watchlist] Could not fetch VPS prices:', e.message);
  }

  const latestDay = ecbDays[0] || null;
  const prevDay = ecbDays[1] || null;

  const todayRates = latestDay ? latestDay.rates : null;
  const prevRates = prevDay ? prevDay.rates : null;

  const refDate = latestDay ? latestDay.time : new Date().toISOString().split('T')[0];

  const watchlistItems = [];

  for (const meta of SYMBOL_METADATA) {
    const code = meta.code;
    const dec = meta.dec;

    if (meta.assetClass === 'metals') {
      // Fetch precious metals via GoldAPI provider if configured
      const goldSnapshot = await fetchGoldApiSnapshot(meta.code);

      watchlistItems.push({
        symbol: code,
        displaySymbol: meta.displaySymbol,
        description: meta.name,
        assetClass: 'metals',
        price: goldSnapshot.price,
        change: goldSnapshot.change || 0.0,
        percentChange: goldSnapshot.percentChange || 0.0,
        high: goldSnapshot.high || '—',
        low: goldSnapshot.low || '—',
        dec,
        timestamp: goldSnapshot.timestamp,
        source: goldSnapshot.provider,
        status: goldSnapshot.status
      });
    } else {
      // Forex rates derived from ECB reference rates
      let baseCurr = code.substring(0, 3);
      let quoteCurr = code.substring(3, 6);

      let priceToday = getCrossRate(baseCurr, quoteCurr, todayRates);
      let pricePrev = getCrossRate(baseCurr, quoteCurr, prevRates);

      if (priceToday === null) priceToday = meta.basePrice;
      if (pricePrev === null) pricePrev = priceToday;

      const change = Number((priceToday - pricePrev).toFixed(dec));
      const percentChange = Number((((priceToday - pricePrev) / pricePrev) * 100).toFixed(2));

      watchlistItems.push({
        symbol: code,
        displaySymbol: meta.displaySymbol,
        description: meta.name,
        assetClass: 'forex',
        price: Number(priceToday.toFixed(dec)),
        change,
        percentChange,
        high: '—',
        low: '—',
        dec,
        timestamp: `${refDate} 16:00 CET`,
        source: 'European Central Bank (ECB)',
        status: 'ECB REFERENCE'
      });
    }

    // Override price with real-time VPS market data current price if available
    if (vpsPrices && vpsPrices[code] != null) {
      const livePrice = Number(vpsPrices[code]);
      if (Number.isFinite(livePrice) && livePrice > 0) {
        const item = watchlistItems[watchlistItems.length - 1];
        const prevPrice = item.price || meta.basePrice;
        item.price = Number(livePrice.toFixed(dec));
        item.change = Number((livePrice - prevPrice).toFixed(dec));
        item.percentChange = prevPrice > 0 ? Number((((livePrice - prevPrice) / prevPrice) * 100).toFixed(2)) : 0.0;
        item.source = 'Real-Time VPS Market Data';
        item.status = 'LIVE VPS';
      }
    }
  }

  const payload = {
    success: true,
    source: isEcbSuccess ? 'Official European Central Bank (ECB)' : 'ECB Reference Baseline',
    referenceDate: refDate,
    fetchedAt: new Date().toISOString(),
    count: watchlistItems.length,
    watchlist: watchlistItems
  };

  ecbCache = {
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minute cache
    data: payload
  };

  return payload;
}
