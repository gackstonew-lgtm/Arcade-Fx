/**
 * Arcade FX — GoldAPI Provider Helper (Netlify Serverless)
 * Fetches real market data for precious metals (XAUUSD, XAGUSD, XPTUSD, XPDUSD)
 * using the GoldAPI.io REST service and GOLDAPI_API_KEY environment variable.
 */

const GOLDAPI_BASE_URL = 'https://www.goldapi.io/api';

const METALS_MAP = {
  XAUUSD: { metal: 'XAU', currency: 'USD', name: 'Gold / US Dollar', basePrice: 2485.50, pipSize: 0.1, dec: 2 },
  XAGUSD: { metal: 'XAG', currency: 'USD', name: 'Silver / US Dollar', basePrice: 28.50, pipSize: 0.01, dec: 2 },
  XPTUSD: { metal: 'XPT', currency: 'USD', name: 'Platinum / US Dollar', basePrice: 960.00, pipSize: 0.1, dec: 2 },
  XPDUSD: { metal: 'XPD', currency: 'USD', name: 'Palladium / US Dollar', basePrice: 920.00, pipSize: 0.1, dec: 2 }
};

let goldApiCache = {};

export async function fetchGoldApiSnapshot(symbolCode) {
  const apiKey = process.env.GOLDAPI_API_KEY || '';
  const meta = METALS_MAP[symbolCode];

  if (!meta) {
    return null;
  }

  // Return cached result if valid (cache TTL: 5 minutes)
  const cached = goldApiCache[symbolCode];
  if (cached && Date.now() < cached.expiresAt) {
    return cached.snapshot;
  }

  if (apiKey) {
    try {
      const url = `${GOLDAPI_BASE_URL}/${meta.metal}/${meta.currency}`;
      const res = await fetch(url, {
        headers: {
          'x-access-token': apiKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.price && Number.isFinite(parseFloat(json.price))) {
          const price = parseFloat(json.price);
          const pip = meta.pipSize;
          const spread = Number((pip * 1.5).toFixed(meta.dec));

          const snapshot = {
            symbol: symbolCode,
            name: meta.name,
            price,
            bid: parseFloat(json.bid || (price - spread / 2)),
            ask: parseFloat(json.ask || (price + spread / 2)),
            high: json.high_price ? parseFloat(json.high_price) : '—',
            low: json.low_price ? parseFloat(json.low_price) : '—',
            change: json.ch ? parseFloat(json.ch) : 0.0,
            percentChange: json.chp ? parseFloat(json.chp) : 0.0,
            timestamp: json.timestamp ? new Date(json.timestamp * 1000).toISOString() : new Date().toISOString(),
            provider: 'GoldAPI',
            status: 'LIVE'
          };

          goldApiCache[symbolCode] = {
            expiresAt: Date.now() + 5 * 60 * 1000,
            snapshot
          };

          return snapshot;
        }
      } else {
        console.warn(`[GoldAPI] API returned HTTP ${res.status} for ${symbolCode}`);
      }
    } catch (e) {
      console.warn(`[GoldAPI] Network error fetching ${symbolCode}:`, e.message);
    }
  }

  // Reference Rate / Market Unconfigured State (NO synthetic Math.random() prices)
  const base = meta.basePrice;
  const pip = meta.pipSize;
  const spread = Number((pip * 1.2).toFixed(meta.dec));

  const snapshot = {
    symbol: symbolCode,
    name: meta.name,
    price: base,
    bid: Number((base - spread / 2).toFixed(meta.dec)),
    ask: Number((base + spread / 2).toFixed(meta.dec)),
    high: '—',
    low: '—',
    change: 0.0,
    percentChange: 0.0,
    timestamp: new Date().toISOString(),
    provider: apiKey ? 'GoldAPI (Stale)' : 'GoldAPI (Configure GOLDAPI_API_KEY)',
    status: apiKey ? 'STALE' : 'REFERENCE'
  };

  return snapshot;
}
