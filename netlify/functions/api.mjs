import { database, getSupabaseAdmin } from './lib/db.mjs';
import { clientError, options, parseBody, response, serverError } from './lib/http.mjs';
import {
  fetchBmHealth,
  fetchBmOhlcv,
  fetchBmPrices,
  fetchBmSignals,
  fetchBmStrength
} from './lib/bm-live-engine.mjs';
import { fetchEcbWatchlist } from './lib/ecb-data.mjs';
import { MarketDataProvider } from './lib/market-data-provider.mjs';

import { handler as payHeroStkHandler } from './payhero-stk.mjs';
import { handler as payHeroWebhookHandler } from './payhero-webhook.mjs';

import { checkUserEntitlement } from './lib/entitlement.mjs';
import { attributeReferral, getUserReferralDetails } from './lib/referral-service.mjs';

const SYMBOL_PATTERN = /^[A-Z0-9]{2,50}$/;
const methods = {
  health: 'GET, OPTIONS',
  settings: 'GET, POST, PUT, OPTIONS',
  'market-data': 'GET, OPTIONS',
  signals: 'GET, POST, OPTIONS',
  prices: 'GET, OPTIONS',
  strength: 'GET, OPTIONS',
  watchlist: 'GET, POST, DELETE, OPTIONS',
  drawings: 'GET, POST, OPTIONS',
  alerts: 'GET, POST, DELETE, OPTIONS',
  news: 'GET, OPTIONS',
  entitlement: 'GET, POST, OPTIONS',
  referrals: 'GET, POST, OPTIONS',
  'payhero-stk': 'POST, OPTIONS',
  'payhero-webhook': 'GET, POST, OPTIONS',
  payments: 'GET, POST, OPTIONS'
};

let newsCache = { expiresAt: 0, payload: null };

export async function handler(event) {
  const queryRoute = event.queryStringParameters?.route;
  const pathEndpoint = event.path.split('/').pop();
  const endpoint = (queryRoute && methods[queryRoute]) ? queryRoute : pathEndpoint;
  const method = event.httpMethod;

  if (!methods[endpoint]) {
    return response(event, 404, { success: false, error: 'Endpoint not found' });
  }

  if (method === 'OPTIONS') return options(event, methods[endpoint]);
  if (!methods[endpoint].includes(method)) {
    return response(event, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    return await routes[endpoint](event);
  } catch (error) {
    console.error(`[ArcadeFX API] ${endpoint}:`, error);
    return serverError(event, error);
  }
}

const routes = {
  async health(event) {
    let databaseStatus = { status: 'unavailable' };
    try {
      const db = database();
      const { rows } = await db.query('SELECT COUNT(*)::int AS symbol_count FROM symbols');
      databaseStatus = {
        status: 'connected',
        driver: 'postgresql',
        symbol_count: rows[0].symbol_count
      };
    } catch (error) {
      console.warn('[Health] Database unavailable:', error.message);
    }

    let engineStatus = { status: 'offline' };
    try {
      const health = await fetchBmHealth();
      engineStatus = { status: 'online', ...health };
    } catch (error) {
      engineStatus = { status: 'offline', error: error.message };
    }

    return response(event, 200, {
      status: engineStatus.status === 'online' ? 'healthy' : 'degraded',
      backend: 'Node.js / Netlify Functions',
      database: databaseStatus,
      signalEngine: engineStatus,
      server_time: new Date().toISOString()
    });
  },

  async news(event) {
    if (newsCache.payload && Date.now() < newsCache.expiresAt) {
      return response(event, 200, newsCache.payload);
    }

    try {
      const upstream = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
        headers: { 'User-Agent': 'ArcadeFX-News/1.0' },
        signal: AbortSignal.timeout(8000)
      });

      if (!upstream.ok) throw new Error('Provider response unavailable');
      const events = await upstream.json();
      if (!Array.isArray(events)) throw new Error('Invalid provider response');

      newsCache = {
        expiresAt: Date.now() + 15 * 60 * 1000,
        payload: {
          success: true,
          source: 'ForexFactory',
          fetched_at: new Date().toISOString(),
          events
        }
      };

      return response(event, 200, newsCache.payload);
    } catch {
      return response(event, 503, {
        success: false,
        error: 'Economic calendar source is temporarily unavailable.'
      });
    }
  },

  async settings(event) {
    if (event.httpMethod === 'GET') {
      try {
        const db = database();
        const { rows } = await db.query('SELECT setting_key, setting_value FROM settings');
        return response(event, 200, {
          success: true,
          settings: Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value]))
        });
      } catch (dbErr) {
        // Database unavailable (e.g. DATABASE_URL not configured). Return empty
        // settings so the frontend falls back to its localStorage defaults without
        // crashing or displaying a 500 error page.
        console.warn('[Settings] Database unavailable, returning empty settings:', dbErr.message);
        return response(event, 200, {
          success: true,
          settings: {},
          source: 'defaults',
          warning: 'Settings database unavailable; using application defaults'
        });
      }
    }

    // POST / PUT — persist settings to the database
    try {
      const db = database();
      const data = parseBody(event);
      const entries = Object.entries(data);
      if (!entries.length) throw clientError('At least one setting is required');

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        for (const [key, value] of entries) {
          if (!/^[A-Za-z][A-Za-z0-9_]{0,190}$/.test(key)) {
            throw clientError('Invalid setting key');
          }

          await client.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2::jsonb) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP',
            [key, JSON.stringify(value)]
          );
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return response(event, 200, {
        success: true,
        updated_keys: entries.map(([key]) => key)
      });
    } catch (dbErr) {
      if (dbErr.statusCode) throw dbErr; // Re-throw client errors (e.g. 400 invalid key)
      console.warn('[Settings POST] Database unavailable:', dbErr.message);
      return response(event, 200, {
        success: false,
        warning: 'Settings could not be saved; database unavailable'
      });
    }
  },

  async 'market-data'(event) {
    const query = event.queryStringParameters || {};
    const action = query.action || 'symbols';

    if (action === 'prices' || action === 'live-prices') {
      try {
        const data = await MarketDataProvider.getLivePrices();
        return response(event, 200, {
          success: true,
          ...data
        });
      } catch (err) {
        return response(event, 503, {
          success: false,
          error: 'Real market price data is temporarily unavailable'
        });
      }
    }

    if (action === 'symbols') {
      const symbols = MarketDataProvider.getSymbols();
      return response(event, 200, {
        success: true,
        symbols,
        source: 'ArcadeFX Real-Time Market Data Engine'
      });
    }

    if (action !== 'history') {
      throw clientError('Unknown action parameter');
    }

    const symbolCode = normalSymbol(query.symbol || 'EURUSD');
    const count = boundedInteger(query.count, 120, 1, 500);
    const timeframe = boundedInteger(query.tf, 15, 1, 1440);

    try {
      const result = await MarketDataProvider.getHistory(symbolCode, timeframe, count);
      return response(event, 200, {
        success: true,
        symbol: symbolCode,
        timeframe,
        count: result.bars.length,
        bars: result.bars,
        source: result.source
      });
    } catch (err) {
      return response(event, 503, {
        success: false,
        symbol: symbolCode,
        error: err.message || 'Market OHLCV history temporarily unavailable'
      });
    }
  },

  async entitlement(event) {
    const { userId, email } = await extractUserFromEvent(event);
    const entitlement = await checkUserEntitlement(userId, email);
    return response(event, 200, {
      success: true,
      entitlement
    });
  },

  async signals(event) {
    const query = event.queryStringParameters || {};
    const { userId, email } = await extractUserFromEvent(event);

    const entitlement = await checkUserEntitlement(userId, email);
    const isEntitled = Boolean(entitlement.isEntitled);

    const force = event.httpMethod === 'POST' || query.action === 'rescan' || query.force === '1';

    const data = await fetchBmSignals({ force, signalAccessLocked: !isEntitled });

    let signals = Array.isArray(data.signals) ? data.signals : [];

    const sigEntitlement = entitlement.entitlements?.signals;
    if (isEntitled && sigEntitlement && !sigEntitlement.all) {
      const allowedPairs = Array.isArray(sigEntitlement.allowedPairs)
        ? sigEntitlement.allowedPairs
        : ['BTCUSD', 'EURUSD'];

      signals = signals.map(sig => {
        const sym = String(sig.symbol || '').toUpperCase();
        if (!allowedPairs.includes(sym)) {
          return {
            ...sig,
            setup: null,
            direction: 'WAIT',
            entry: null,
            stopLoss: null,
            target1: null,
            target2: null,
            isLocked: true
          };
        }
        return sig;
      });
    }

    const assetClass = query.assetClass;
    const direction = query.direction;
    const minConfidence = query.minConfidence ? Number(query.minConfidence) : null;

    if (assetClass && assetClass.toLowerCase() !== 'all') {
      signals = signals.filter(
        signal => String(signal.assetClass || '').toLowerCase() === assetClass.toLowerCase()
      );
    }

    if (direction && direction.toUpperCase() !== 'ALL') {
      signals = signals.filter(
        signal => String(signal.direction || '').toUpperCase() === direction.toUpperCase()
      );
    }

    if (minConfidence !== null && Number.isFinite(minConfidence)) {
      signals = signals.filter(signal => Number(signal.confidence || 0) >= minConfidence);
    }

    return response(event, 200, {
      ...data,
      success: true,
      scanTimestamp: data.scanTimestamp || new Date().toISOString(),
      lastScanStatus: 'just now',
      count: signals.length,
      signals,
      signal_access: isEntitled ? 'unlocked' : 'locked',
      entitlement,
      marketDataSource: 'Real-Time VPS Signal Engine',
      realTime: true
    });
  },

  async prices(event) {
    const data = await fetchBmPrices();
    return response(event, 200, {
      success: true,
      ...(data || {})
    });
  },

  async strength(event) {
    const data = await fetchBmStrength();
    return response(event, 200, {
      success: true,
      ...(data || {})
    });
  },

  async watchlist(event) {
    if (event.httpMethod === 'GET') {
      const ecbData = await fetchEcbWatchlist();
      return response(event, 200, ecbData);
    }

    const db = database();
    const symbol = normalSymbol(
      event.httpMethod === 'DELETE'
        ? event.queryStringParameters?.symbol
        : parseBody(event).symbol_code
    );

    if (event.httpMethod === 'DELETE') {
      await db.query('DELETE FROM watchlist WHERE symbol_code = $1', [symbol]);
      return response(event, 200, { success: true, removed: symbol });
    }

    await db.query(
      'INSERT INTO watchlist (symbol_code) VALUES ($1) ON CONFLICT (symbol_code) DO NOTHING',
      [symbol]
    );

    return response(event, 200, { success: true, symbol_code: symbol });
  },

  async drawings(event) {
    const db = database();

    if (event.httpMethod === 'GET') {
      const symbol = normalSymbol(event.queryStringParameters?.symbol || 'EURUSD');
      const { rows } = await db.query(
        'SELECT drawing_data FROM drawings WHERE symbol_code = $1 ORDER BY updated_at DESC LIMIT 1',
        [symbol]
      );

      return response(event, 200, {
        success: true,
        symbol,
        drawings: rows[0]?.drawing_data || []
      });
    }

    const data = parseBody(event);
    const symbol = normalSymbol(data.symbol_code || 'EURUSD');

    if (!Array.isArray(data.drawings)) {
      throw clientError('Drawings must be an array');
    }

    await db.query(
      'INSERT INTO drawings (symbol_code, drawing_data) VALUES ($1, $2::jsonb)',
      [symbol, JSON.stringify(data.drawings)]
    );

    return response(event, 200, { success: true, symbol });
  },

  async alerts(event) {
    const db = database();

    if (event.httpMethod === 'GET') {
      const { rows } = await db.query(
        'SELECT * FROM alerts WHERE is_active = TRUE ORDER BY created_at DESC'
      );
      return response(event, 200, { success: true, alerts: rows });
    }

    if (event.httpMethod === 'DELETE') {
      const id = boundedInteger(
        event.queryStringParameters?.id,
        0,
        1,
        Number.MAX_SAFE_INTEGER
      );

      await db.query('UPDATE alerts SET is_active = FALSE WHERE id = $1', [id]);
      return response(event, 200, { success: true, deactivated: id });
    }

    const data = parseBody(event);
    const symbol = normalSymbol(data.symbol_code);

    if (!data.alert_type || !Number.isFinite(Number(data.condition_val))) {
      throw clientError('Missing required alert fields');
    }

    const { rows } = await db.query(
      'INSERT INTO alerts (symbol_code, alert_type, condition_val) VALUES ($1, $2, $3) RETURNING id',
      [symbol, String(data.alert_type), Number(data.condition_val)]
    );

    return response(event, 200, { success: true, id: rows[0].id });
  },

  async referrals(event) {
    const db = database();
    const { userId } = await extractUserFromEvent(event);

    if (!userId) {
      return response(event, 401, {
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Please sign in to access referral dashboard.'
      });
    }

    if (event.httpMethod === 'GET') {
      const origin = event.headers?.origin || event.headers?.referer || 'https://arcadefx.live';
      const details = await getUserReferralDetails(db, userId, origin);
      return response(event, details.success ? 200 : 400, details);
    }

    if (event.httpMethod === 'POST') {
      const data = parseBody(event);
      const referralCode = data.referral_code || data.referralCode || data.code;
      if (!referralCode) {
        throw clientError('Missing referral code');
      }

      const result = await attributeReferral(db, userId, referralCode);
      return response(event, result.success ? 200 : 400, result);
    }

    throw clientError('Method not allowed');
  },

  async 'payhero-stk'(event) {
    return await payHeroStkHandler(event);
  },

  async 'payhero-webhook'(event) {
    return await payHeroWebhookHandler(event);
  },

  async payments(event) {
    const q = event.queryStringParameters || {};
    const action = q.action || 'stk';

    if (action === 'webhook') {
      return await payHeroWebhookHandler(event);
    }
    if (action === 'verify') {
      const ref = q.reference;
      try {
        const db = database();
        const { rows } = await db.query(
          'SELECT status, receipt_number, plan_name, amount_usd FROM wallet_transactions WHERE reference = $1',
          [ref]
        );
        if (rows.length) {
          return response(event, 200, { success: true, ...rows[0] });
        }
      } catch (e) {}
      return response(event, 200, { success: true, status: 'pending', reference: ref });
    }

    return await payHeroStkHandler(event);
  }
};

function normalSymbol(value) {
  const symbol = String(value || '').toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) throw clientError('Invalid symbol code');
  return symbol;
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw clientError('Invalid numeric parameter');
  }
  return number;
}

async function extractUserFromEvent(event) {
  const query = event.queryStringParameters || {};
  const authHeader = event.headers.authorization || event.headers.Authorization || '';

  let userId = query.userId || query.user_id || '';
  let email = query.email || query.userEmail || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            userId = user.id;
            email = user.email || email;
          }
        }
      } catch (e) {}

      if (!userId) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.sub) userId = payload.sub;
            if (payload.email) email = payload.email;
          }
        } catch (e) {}
      }
    }
  }

  return { userId, email };
}
