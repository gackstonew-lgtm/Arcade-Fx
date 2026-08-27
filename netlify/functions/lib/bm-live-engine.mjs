/**
 * BM Forex Live Market Engine adapter for Arcade FX / Netlify.
 *
 * This is a JavaScript/Node port of the PHP proxy logic used by
 * BM Forex Hub. The actual SMC signal calculations remain on the
 * BM Forex VPS engine; Netlify acts as a secure server-side proxy.
 *
 * Required Netlify environment variable:
 *   SIGNAL_ENGINE_URL   e.g. http://157.173.193.93:5000
 *
 * Optional:
 *   GOLD_API_KEY         GoldAPI.io x-access-token
 *   GOLDAPI_API_KEY      legacy Arcade FX name (supported as fallback)
 *
 * Never expose these values in VITE_* variables or browser code.
 */

const DEFAULT_SIGNAL_ENGINE_URL = 'http://157.173.193.93:5000';
const GOLD_PRIMARY_URL = 'https://api.gold-api.com/price/XAU';
const GOLD_SECONDARY_URL = 'https://data-asg.goldprice.org/dbXRates/USD';
const GOLD_TERTIARY_URL = 'https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz';

const goldCache = {
  value: null,
  fetchedAt: 0
};

const GOLD_CACHE_TTL_MS = 15_000;
const GOLD_MAX_STALE_MS = 120_000;

export function getSignalEngineUrl() {
  return (process.env.SIGNAL_ENGINE_URL || DEFAULT_SIGNAL_ENGINE_URL).replace(/\/+$/, '');
}

function jsonHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'User-Agent': 'ArcadeFX-BMForex-Proxy/1.0',
    ...extra
  };
}

async function fetchJson(url, { timeoutMs = 10_000, headers = {} } = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: jsonHeaders(headers),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Upstream returned non-JSON (${response.status})`);
  }

  if (!response.ok) {
    const detail = payload?.error || payload?.message || response.statusText;
    throw new Error(`Upstream HTTP ${response.status}: ${detail}`);
  }

  return payload;
}

export async function fetchBmEngineRoute(route, query = {}, { timeoutMs } = {}) {
  const base = getSignalEngineUrl();
  const url = new URL(`/api/${route}`, `${base}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return fetchJson(url.toString(), {
    timeoutMs: timeoutMs ?? (route === 'signals' ? 30_000 : 10_000)
  });
}

export async function fetchBmOhlcv(symbol = 'EURUSD', tf = '15', limit = 250) {
  const base = getSignalEngineUrl();
  const url = new URL('/ohlcv', `${base}/`);
  url.searchParams.set('symbol', String(symbol).toUpperCase());
  url.searchParams.set('tf', String(tf));
  url.searchParams.set('limit', String(limit));
  return fetchJson(url.toString(), { timeoutMs: 10_000 });
}

function getPipSize(pairCode, decimals = 4) {
  const code = String(pairCode || '').toUpperCase();
  if (code === 'XAUUSD') return 0.10;
  if (code === 'BTCUSD') return 10.0;
  if (code === 'ETHUSD') return 1.0;
  if (code === 'SOLUSD') return 0.10;
  if (['NAS100', 'US30', 'SPX500', 'GER30'].includes(code)) return 1.0;
  if (code.includes('JPY') || [2, 3].includes(Number(decimals))) return 0.01;
  return 0.0001;
}

function checkHtfAlignment(direction, structure = {}) {
  const dailyBias = String(structure.daily_bias || 'neutral').trim().toLowerCase();
  const trend = String(structure.trend || 'neutral').trim().toLowerCase();
  const lastChoch = String(structure.last_choch?.dir || '').trim().toLowerCase();
  const lastBos = String(structure.last_bos?.dir || '').trim().toLowerCase();

  if (direction === 'buy') {
    const htfBullish = [dailyBias, trend, lastChoch, lastBos].includes('bullish');
    const stronglyBearish = dailyBias === 'bearish' && trend === 'bearish';
    return htfBullish && !stronglyBearish;
  }

  if (direction === 'sell') {
    const htfBearish = [dailyBias, trend, lastChoch, lastBos].includes('bearish');
    const stronglyBullish = dailyBias === 'bullish' && trend === 'bullish';
    return htfBearish && !stronglyBullish;
  }

  return false;
}

function calculateDayTradingScore(setup, structure, actualSlPips, actualTpPips, rrRatio) {
  let score = 0;
  const dir = String(setup.direction || '').trim().toLowerCase();
  const dailyBias = String(structure.daily_bias || 'neutral').trim().toLowerCase();
  const trend = String(structure.trend || 'neutral').trim().toLowerCase();

  if (dir === 'buy' && dailyBias === 'bullish') score += 20;
  if (dir === 'sell' && dailyBias === 'bearish') score += 20;
  if (dir === 'buy' && trend === 'bullish') score += 15;
  if (dir === 'sell' && trend === 'bearish') score += 15;

  const hasH1Confirm = Boolean(setup.h1_confirm);
  const hasM15Trigger = Boolean(setup.m15_trigger);
  const isSniper = Boolean(setup.sniper);
  const confidence = Number(setup.confidence || 0);

  if (hasH1Confirm || hasM15Trigger || isSniper) score += 25;
  else if (confidence >= 50) score += 15;

  const strategy = String(setup.type || setup.strategy || '').trim().toUpperCase();
  if (strategy.includes('OB') || strategy.includes('FVG')) score += 20;
  else if (strategy.includes('RANGE')) score += 10;
  else score += 5;

  if (actualTpPips >= 80 && rrRatio >= 2.4) score += 15;
  else if (actualTpPips >= 60 && rrRatio >= 2.0) score += 10;

  return Math.min(100, score);
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Port of BM Forex Hub's PHP day-trading validation/optimization layer.
 * It deliberately rejects low-quality/scalp setups instead of fabricating
 * a replacement signal.
 */
export function optimizeAndValidateSignals(data) {
  if (!data || !Array.isArray(data.signals)) return data;

  for (const signal of data.signals) {
    if (!signal || !signal.setup || typeof signal.setup !== 'object') continue;

    const setup = signal.setup;
    const structure = signal.structure && typeof signal.structure === 'object'
      ? signal.structure
      : {};
    const pairCode = signal.pair?.code || signal.pair?.symbol || signal.code || 'UNKNOWN';
    const decimals = Number(signal.pair?.decimals ?? 4);
    const pipSize = getPipSize(pairCode, decimals);

    const direction = String(setup.direction || '').trim().toLowerCase();
    const entry = Number(setup.entry || 0);
    const rawSl = Number(setup.sl || 0);
    const rawTp1 = Number(setup.tp1 || 0);
    const rawTp2 = Number(setup.tp2 || 0);

    if (!['buy', 'sell'].includes(direction) || entry <= 0 || rawSl <= 0 || rawTp1 <= 0) {
      signal.setup = null;
      continue;
    }

    if (!checkHtfAlignment(direction, structure)) {
      signal.setup = null;
      continue;
    }

    const rawSlPips = Math.abs(entry - rawSl) / pipSize;
    const rawTp1Pips = Math.abs(rawTp1 - entry) / pipSize;

    let targetSlPips;
    if (rawSlPips < 20 || rawSlPips > 30) targetSlPips = 25;
    else targetSlPips = Number(rawSlPips.toFixed(1));

    let structuralTargetPips = rawTp1Pips;
    const bosPrice = Number(structure.last_bos?.price || 0);
    const chochPrice = Number(structure.last_choch?.price || 0);

    if (bosPrice > 0) {
      const bosDist = Math.abs(bosPrice - entry) / pipSize;
      if ((direction === 'buy' && bosPrice > entry && bosDist >= 60) ||
          (direction === 'sell' && bosPrice < entry && bosDist >= 60)) {
        structuralTargetPips = Math.max(structuralTargetPips, bosDist);
      }
    }

    if (chochPrice > 0) {
      const chochDist = Math.abs(chochPrice - entry) / pipSize;
      if ((direction === 'buy' && chochPrice > entry && chochDist >= 60) ||
          (direction === 'sell' && chochPrice < entry && chochDist >= 60)) {
        structuralTargetPips = Math.max(structuralTargetPips, chochDist);
      }
    }

    const targetTp1Pips = Math.max(60, Number(structuralTargetPips.toFixed(1)));

    let newSl;
    let newTp1;
    let newTp2;

    if (direction === 'buy') {
      newSl = roundTo(entry - targetSlPips * pipSize, decimals);
      newTp1 = roundTo(entry + targetTp1Pips * pipSize, decimals);
      const tp2DistPips = Math.max(
        targetTp1Pips + 30,
        Math.abs(rawTp2 - entry) / pipSize
      );
      newTp2 = roundTo(entry + tp2DistPips * pipSize, decimals);
    } else {
      newSl = roundTo(entry + targetSlPips * pipSize, decimals);
      newTp1 = roundTo(entry - targetTp1Pips * pipSize, decimals);
      const tp2DistPips = Math.max(
        targetTp1Pips + 30,
        Math.abs(entry - rawTp2) / pipSize
      );
      newTp2 = roundTo(entry - tp2DistPips * pipSize, decimals);
    }

    const actualSlPips = Number((Math.abs(entry - newSl) / pipSize).toFixed(1));
    const actualTpPips = Number((Math.abs(newTp1 - entry) / pipSize).toFixed(1));

    if (actualSlPips <= 0) {
      signal.setup = null;
      continue;
    }

    const rrRatio = Number((actualTpPips / actualSlPips).toFixed(2));
    const dtScore = calculateDayTradingScore(
      setup,
      structure,
      actualSlPips,
      actualTpPips,
      rrRatio
    );

    const dirValid =
      (direction === 'buy' && newSl < entry && entry < newTp1) ||
      (direction === 'sell' && newSl > entry && entry > newTp1);
    const slValid = actualSlPips >= 18 && actualSlPips <= 32;
    const tpValid = actualTpPips >= 59.5;
    const rrValid = rrRatio >= 1.95;
    const scoreValid = dtScore >= 55;

    if (dirValid && slValid && tpValid && rrValid && scoreValid) {
      setup.sl = newSl;
      setup.tp1 = newTp1;
      setup.tp2 = newTp2;
      setup.risk_pips = actualSlPips;
      setup.rr = rrRatio;
      setup.day_trading_score = dtScore;
    } else {
      signal.setup = null;
    }
  }

  return data;
}

export function deduplicateSignals(data) {
  if (!data || !Array.isArray(data.signals)) return data;

  const unique = new Map();

  for (const signal of data.signals) {
    if (!signal || typeof signal !== 'object') continue;
    const pairCode = signal.pair?.code || signal.pair?.symbol || signal.code || signal.symbol;
    if (!pairCode) continue;

    const key = String(pairCode).trim().toUpperCase();
    if (!unique.has(key)) {
      unique.set(key, signal);
      continue;
    }

    const existing = unique.get(key);
    const hasSetup = Boolean(signal.setup);
    const existingHasSetup = Boolean(existing.setup);

    if (!existingHasSetup && hasSetup) {
      unique.set(key, signal);
    } else if (existingHasSetup && hasSetup) {
      const existingRr = Number(existing.setup?.rr || 0);
      const signalRr = Number(signal.setup?.rr || 0);
      if (signalRr > existingRr) unique.set(key, signal);
    }
  }

  data.signals = [...unique.values()];
  return data;
}

function normalizeAssetClass(asset) {
  const value = String(asset || '').toLowerCase();
  if (value.includes('metal') || value.includes('commodity')) return 'metals';
  if (value.includes('crypto')) return 'crypto';
  return 'forex';
}

function normalizeBmSignal(signal) {
  const pair = signal?.pair || {};
  const setup = signal?.setup || null;
  const structure = signal?.structure || {};
  const code = String(pair.code || pair.symbol || signal.code || signal.symbol || '').toUpperCase();

  const price = Number(signal.currentPrice ?? signal.price ?? 0);
  const decimals = Number(pair.decimals ?? (code.includes('JPY') ? 3 : (code === 'XAUUSD' ? 2 : 5)));
  const pipSize = getPipSize(code, decimals);

  let rawDirection = setup?.direction ? String(setup.direction).toUpperCase() : 'WAIT';

  const confidence = Number(
    setup?.confidence ??
    signal.confidence ??
    signal.strength ??
    0
  );

  let entry = setup?.entry != null && Number.isFinite(Number(setup.entry)) && Number(setup.entry) > 0 ? Number(setup.entry) : null;
  let stopLoss = setup?.sl != null && Number.isFinite(Number(setup.sl)) && Number(setup.sl) > 0 ? Number(setup.sl) : null;
  let target1 = setup?.tp1 != null && Number.isFinite(Number(setup.tp1)) && Number(setup.tp1) > 0 ? Number(setup.tp1) : null;
  let target2 = setup?.tp2 != null && Number.isFinite(Number(setup.tp2)) && Number(setup.tp2) > 0 ? Number(setup.tp2) : null;

  // Strict level validation: Reject impossible/malformed price levels
  let isValidSetup = false;
  if (rawDirection === 'BUY' && entry !== null && stopLoss !== null && target1 !== null) {
    isValidSetup = stopLoss < entry && entry < target1;
  } else if (rawDirection === 'SELL' && entry !== null && stopLoss !== null && target1 !== null) {
    isValidSetup = target1 < entry && entry < stopLoss;
  }

  if (!isValidSetup) {
    rawDirection = 'WAIT';
    entry = null;
    stopLoss = null;
    target1 = null;
    target2 = null;
  }

  const direction = rawDirection;

  // Dynamic Signal Status Lifecycle
  let signalStatus = 'MONITORING';
  if (direction === 'BUY') {
    if (price > 0 && target2 && price >= target2) signalStatus = 'TP2 HIT';
    else if (price > 0 && target1 && price >= target1) signalStatus = 'TP1 HIT';
    else if (price > 0 && stopLoss && price <= stopLoss) signalStatus = 'STOPPED';
    else signalStatus = 'ACTIVE';
  } else if (direction === 'SELL') {
    if (price > 0 && target2 && price <= target2) signalStatus = 'TP2 HIT';
    else if (price > 0 && target1 && price <= target1) signalStatus = 'TP1 HIT';
    else if (price > 0 && stopLoss && price >= stopLoss) signalStatus = 'STOPPED';
    else signalStatus = 'ACTIVE';
  }

  const referencePrices = [
    Number(structure.last_bos?.price || 0),
    Number(structure.last_choch?.price || 0)
  ].filter(Number.isFinite).filter(v => v > 0);

  const referenceResistance = referencePrices.length
    ? Math.max(...referencePrices)
    : (price > 0 ? price : null);

  const referenceSupport = referencePrices.length
    ? Math.min(...referencePrices)
    : (price > 0 ? price : null);

  const confluence = [];
  if (setup?.type) confluence.push(String(setup.type));
  if (setup?.trigger) confluence.push(String(setup.trigger));

  const source = signal.price_meta?.source
    ? `Live Engine + ${signal.price_meta.source}`
    : 'Live Market Signal Engine';

  const rr = setup?.rr != null ? Number(setup.rr) : null;

  return {
    ...signal,
    setup: (setup && isValidSetup && !signal.isLocked) ? setup : null,
    symbol: code,
    displaySymbol: pair.label || pair.name || code,
    name: pair.label || pair.name || code,
    assetClass: normalizeAssetClass(pair.asset),
    pipSize,
    direction,
    status: signalStatus,
    marketStatus: signal.price_meta?.source ? 'LIVE' : 'LIVE ENGINE',
    description: setup && isValidSetup
      ? `SMC Day-Trade • ${setup.type || 'Validated setup'}`
      : `SMC monitoring • ${structure.trend || 'Waiting for setup'}`,
    bias: structure.daily_bias
      ? `${String(structure.daily_bias).charAt(0).toUpperCase()}${String(structure.daily_bias).slice(1)} bias`
      : (structure.trend || 'Market Bias'),
    currentPrice: price,
    bid: signal.price_meta?.bid != null ? Number(signal.price_meta.bid) : price,
    ask: signal.price_meta?.ask != null ? Number(signal.price_meta.ask) : price,
    spread: signal.price_meta?.ask != null && signal.price_meta?.bid != null
      ? Number(signal.price_meta.ask) - Number(signal.price_meta.bid)
      : null,
    referenceResistance,
    referenceSupport,
    entry,
    entryLabel: setup?.type ? `ENTRY (${String(setup.type).toUpperCase()})` : 'ENTRY',
    stopLoss,
    target1,
    target2,
    riskReward: rr != null ? `1 : ${rr}` : '—',
    confidence: Math.max(0, Math.min(100, Number.isFinite(confidence) ? confidence : 0)),
    confluence: confluence.length ? confluence : ['SMC multi-timeframe analysis', 'Live VPS market feed'],
    sourcePill: source,
    setupAge: setup && isValidSetup ? 'Live engine setup' : 'Monitoring',
    state: setup && isValidSetup
      ? (confidence >= 85 ? 'VALIDATED' : confidence >= 70 ? 'FORMING' : '')
      : '',
    signalTimestamp: signal.timestamp || signal.generated_at || new Date().toISOString(),
    dataTimestamp: signal.price_meta?.timestamp || signal.timestamp || new Date().toISOString(),
    provider: source
  };
}

export async function fetchBmSignals({ force = false, signalAccessLocked = false } = {}) {
  const raw = await fetchBmEngineRoute('signals', force ? { force: 1 } : {}, {
    timeoutMs: force ? 300_000 : 35_000
  });

  const data = deduplicateSignals(raw || { signals: [] });

  // BM's PHP layer uses the live XAUUSD provider to correct the VPS XAU
  // spot and all price-derived setup levels.
  await injectLiveGoldPrice(data);

  // Keep the BM PHP validation/refinement behavior on the Netlify side.
  optimizeAndValidateSignals(data);

  if (signalAccessLocked && Array.isArray(data.signals)) {
    for (const s of data.signals) {
      if (s && typeof s === 'object') {
        s.setup = null;
      }
    }
  }

  return {
    ...(data || {}),
    signals: Array.isArray(data?.signals)
      ? data.signals.map(normalizeBmSignal)
      : [],
    signal_access: signalAccessLocked ? 'locked' : (data?.signal_access || 'unlocked'),
    source: 'Live Market Signal Engine',
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchBmPrices() {
  const data = await fetchBmEngineRoute('prices', {}, { timeoutMs: 10_000 });
  await injectLiveGoldPrice(data);
  return data;
}

export async function fetchBmStrength() {
  const data = await fetchBmEngineRoute('strength', {}, { timeoutMs: 10_000 });

  if (Array.isArray(data?.currencies)) {
    const uniqueScores = [...new Set(data.currencies.map(c => Number(c.score || 0)))];
    if (uniqueScores.length > 1) return data;
  }

  // Port of BM's fallback: derive currency strength from signal RSI values.
  try {
    const signalsData = await fetchBmEngineRoute('signals', { limit: 14 }, { timeoutMs: 35_000 });
    return {
      ...(data || {}),
      currencies: computeStrengthFromSignals(signalsData?.signals || [])
    };
  } catch {
    return data;
  }
}

function computeStrengthFromSignals(signals) {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'XAU', 'BTC'];
  const pairMap = {
    EURUSD: { base: 'EUR', quote: 'USD' },
    GBPUSD: { base: 'GBP', quote: 'USD' },
    USDJPY: { base: 'USD', quote: 'JPY' },
    USDCHF: { base: 'USD', quote: 'CHF' },
    AUDUSD: { base: 'AUD', quote: 'USD' },
    NZDUSD: { base: 'NZD', quote: 'USD' },
    USDCAD: { base: 'USD', quote: 'CAD' },
    XAUUSD: { base: 'XAU', quote: 'USD' },
    BTCUSD: { base: 'BTC', quote: 'USD' }
  };

  const raw = Object.fromEntries(
    currencies.map(c => [c, { base: [], quote: [] }])
  );

  for (const signal of signals) {
    const code = signal?.pair?.code || '';
    const rsi = Number(signal?.structure?.rsi);
    const map = pairMap[code];
    if (!map || !Number.isFinite(rsi)) continue;
    raw[map.base].base.push(rsi);
    raw[map.quote].quote.push(rsi);
  }

  const scores = {};
  for (const currency of currencies) {
    const base = raw[currency].base;
    const quote = raw[currency].quote;
    const baseAvg = base.length ? base.reduce((a, b) => a + b, 0) / base.length : 50;
    const quoteAvg = quote.length ? quote.reduce((a, b) => a + b, 0) / quote.length : 50;
    scores[currency] = Math.max(1, Math.min(99, Math.round((baseAvg + (100 - quoteAvg)) / 2)));
  }

  if (new Set(Object.values(scores)).size <= 1) {
    currencies.forEach((currency, i) => {
      scores[currency] = Math.max(1, Math.min(99, Math.round(50 + (i - 3.5) * 6)));
    });
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([currency, score], index) => ({
      currency,
      score,
      rank: index + 1,
      change: 0,
      bullish: score > 55
    }));
}

export async function fetchBmHealth() {
  return fetchBmEngineRoute('health', {}, { timeoutMs: 8_000 });
}

export async function fetchLiveGoldPrice() {
  const now = Date.now();
  if (goldCache.value && now - goldCache.fetchedAt < GOLD_CACHE_TTL_MS) {
    return goldCache.value;
  }

  const apiKey = process.env.GOLD_API_KEY || process.env.GOLDAPI_API_KEY || '';
  const headers = apiKey ? { 'x-access-token': apiKey } : {};

  // Provider 1: GoldAPI.io, same provider family used by BM Forex.
  try {
    const data = await fetchJson(GOLD_PRIMARY_URL, { timeoutMs: 4_000, headers });
    const price = Number(data?.price);
    if (Number.isFinite(price) && price >= 1000 && price <= 10000) {
      const result = {
        price: Number(price.toFixed(2)),
        bid: Number((Number(data?.bid ?? price)).toFixed(2)),
        ask: Number((Number(data?.ask ?? price)).toFixed(2)),
        symbol: data?.symbol || 'XAU',
        currency: data?.currency || 'USD',
        timestamp: data?.updatedAt || new Date().toISOString(),
        source: 'gold-api.com',
        status: 'LIVE'
      };
      goldCache.value = result;
      goldCache.fetchedAt = now;
      return result;
    }
  } catch (error) {
    console.warn('[BM Live Engine] GoldAPI failed:', error.message);
  }

  // Provider 2: GoldPrice.org.
  try {
    const data = await fetchJson(GOLD_SECONDARY_URL, { timeoutMs: 4_000 });
    const price = Number(data?.items?.[0]?.xauPrice);
    if (Number.isFinite(price) && price >= 1000 && price <= 10000) {
      const result = {
        price: Number(price.toFixed(2)),
        bid: Number(price.toFixed(2)),
        ask: Number(price.toFixed(2)),
        symbol: 'XAUUSD',
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: 'goldprice.org',
        status: 'LIVE'
      };
      goldCache.value = result;
      goldCache.fetchedAt = now;
      return result;
    }
  } catch (error) {
    console.warn('[BM Live Engine] GoldPrice.org failed:', error.message);
  }

  // Provider 3: Metals.dev demo feed, matching BM's PHP fallback.
  try {
    const data = await fetchJson(GOLD_TERTIARY_URL, { timeoutMs: 4_000 });
    const price = Number(data?.metals?.gold);
    if (Number.isFinite(price) && price >= 1000 && price <= 10000) {
      const result = {
        price: Number(price.toFixed(2)),
        bid: Number(price.toFixed(2)),
        ask: Number(price.toFixed(2)),
        symbol: 'XAUUSD',
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: 'metals.dev',
        status: 'LIVE'
      };
      goldCache.value = result;
      goldCache.fetchedAt = now;
      return result;
    }
  } catch (error) {
    console.warn('[BM Live Engine] Metals.dev failed:', error.message);
  }

  // BM behavior: allow only a short stale cache; never invent a price.
  if (goldCache.value && now - goldCache.fetchedAt < GOLD_MAX_STALE_MS) {
    return { ...goldCache.value, status: 'STALE', source: `${goldCache.value.source} (cached)` };
  }

  return null;
}

async function injectLiveGoldPrice(data) {
  if (!data || typeof data !== 'object') return data;

  const gold = await fetchLiveGoldPrice();
  if (!gold || !Number.isFinite(Number(gold.price))) {
    if (Array.isArray(data.signals)) {
      for (const signal of data.signals) {
        if (String(signal?.pair?.code || '').toUpperCase() === 'XAUUSD') {
          signal.setup = null;
        }
      }
    }
    return data;
  }

  const goldPrice = Number(gold.price);

  if (Array.isArray(data.signals)) {
    for (const signal of data.signals) {
      if (String(signal?.pair?.code || '').toUpperCase() !== 'XAUUSD') continue;

      const enginePrice = Number(signal.currentPrice || 0);
      if (enginePrice > 0) {
        const offset = goldPrice - enginePrice;
        if (signal.setup && typeof signal.setup === 'object') {
          for (const key of ['entry', 'sl', 'tp1', 'tp2', 'ob_high', 'ob_low']) {
            if (signal.setup[key] != null) {
              signal.setup[key] = roundTo(Number(signal.setup[key]) + offset, 2);
            }
          }
        }

        for (const path of ['last_bos', 'last_choch']) {
          if (signal.structure?.[path]?.price != null) {
            signal.structure[path].price = roundTo(
              Number(signal.structure[path].price) + offset,
              2
            );
          }
        }
      }

      signal.currentPrice = goldPrice;
      signal.price_meta = gold;
    }
  }

  if (Array.isArray(data.prices)) {
    for (const price of data.prices) {
      if (String(price?.code || price?.symbol || '').toUpperCase() === 'XAUUSD') {
        price.price = goldPrice;
      }
    }
  }

  return data;
}
