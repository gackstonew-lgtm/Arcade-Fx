const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

const DEFAULT_ALLOWED_ORIGINS = [
  'https://adminarcadefx.netlify.app',
  'https://admin.arcadefx.live',
  'https://arcadefx.live',
  'http://localhost:8888',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:80',
  'http://127.0.0.1:8888'
];

function getAllowableOrigins() {
  const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}

function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowable = getAllowableOrigins();

  if (origin && allowable.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      Vary: 'Origin'
    };
  }

  // Fallback for same-origin or non-browser server calls
  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

export function response(event, statusCode, body) {
  return { statusCode, headers: { ...jsonHeaders, ...corsHeaders(event) }, body: JSON.stringify(body) };
}

export function options(event, methods) {
  return {
    statusCode: 204,
    headers: { ...corsHeaders(event), 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With' },
    body: ''
  };
}

export function clientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function serverError(event, error) {
  console.error('[Netlify Function Error]', error);
  const status = error?.statusCode || 500;
  const message = error?.message || 'Internal Server Error';
  return response(event, status, { success: false, error: message });
}

export function parseBody(event) {
  if (!event.body) return {};
  try {
    const data = JSON.parse(event.body);
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid JSON body');
    return data;
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

export function verifyAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    const error = new Error('Unauthorized - Bearer token required');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.sub) throw new Error('Missing subject in JWT');
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('JWT expired');
    return {
      userId: payload.sub,
      email: payload.email || payload.user_metadata?.email || '',
      role: payload.role || payload.app_metadata?.role || 'authenticated',
      metadata: payload.user_metadata || {}
    };
  } catch (err) {
    const error = new Error(`Unauthorized - ${err.message}`);
    error.statusCode = 401;
    throw error;
  }
}

export async function verifyAdmin(event, dbPool) {
  const authUser = verifyAuth(event);

  // Hardcoded permanent administrator email list
  const PERMANENT_ADMIN_EMAILS = [
    'gackstoneb@gmail.com',
    'admin@arcadefx.live',
    (process.env.ADMIN_EMAIL || '').toLowerCase()
  ].filter(Boolean);

  if (authUser.email && PERMANENT_ADMIN_EMAILS.includes(authUser.email.toLowerCase())) {
    return { ...authUser, role: 'admin', isSuperAdmin: true };
  }

  // Check user metadata for admin role
  if (authUser.role === 'admin' || authUser.metadata?.role === 'admin' || authUser.metadata?.is_admin === true) {
    return { ...authUser, role: 'admin' };
  }

  // Query database profiles table to verify admin role
  if (dbPool) {
    try {
      const { rows } = await dbPool.query(
        'SELECT role, is_admin FROM profiles WHERE id = $1',
        [authUser.userId]
      );
      if (rows.length > 0 && (rows[0].role === 'admin' || rows[0].is_admin === true)) {
        return { ...authUser, role: 'admin' };
      }
    } catch (dbErr) {
      console.warn('[verifyAdmin] Database role check warning:', dbErr.message);
    }
  }

  const error = new Error('Forbidden - Administrator privileges required');
  error.statusCode = 403;
  throw error;
}

export function verifyKoraSignature(event, secret) {
  if (!secret) return false;
  const signature = event.headers['x-kora-signature'] || event.headers['X-Kora-Signature'];
  if (!signature) return false;
  try {
    const crypto = require('node:crypto');
    const hmac = crypto.createHmac('sha256', secret).update(event.body || '').digest('hex');
    return hmac === signature;
  } catch {
    return false;
  }
}
