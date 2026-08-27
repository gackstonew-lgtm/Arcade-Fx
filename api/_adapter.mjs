/**
 * Vercel Serverless Function Adapter for Arcade FX API Endpoints.
 *
 * Converts Node.js Vercel req/res objects into Netlify-compatible event
 * objects and writes the returned response back to Vercel's response stream.
 */

export function vercelToNetlifyEvent(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'arcadefx.live';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const fullUrl = new URL(req.url || '/', `${proto}://${host}`);

  const queryStringParameters = {};

  // Extract from searchParams in fullUrl
  fullUrl.searchParams.forEach((val, key) => {
    queryStringParameters[key] = val;
  });

  // Merge Vercel req.query if present
  if (req.query && typeof req.query === 'object') {
    for (const [key, val] of Object.entries(req.query)) {
      if (typeof val === 'string') {
        queryStringParameters[key] = val;
      } else if (Array.isArray(val)) {
        queryStringParameters[key] = val[val.length - 1];
      }
    }
  }

  let body = req.body;
  if (body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
  } else if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }

  return {
    path: fullUrl.pathname,
    httpMethod: req.method || 'GET',
    headers: req.headers || {},
    queryStringParameters,
    body: body || null
  };
}

export function sendNetlifyResult(res, result) {
  const statusCode = result?.statusCode || 200;
  res.statusCode = statusCode;

  if (result?.headers) {
    Object.entries(result.headers).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        res.setHeader(key, String(val));
      }
    });
  }

  if (result?.body !== undefined && result?.body !== null) {
    if (typeof result.body === 'string') {
      res.end(result.body);
    } else {
      res.end(JSON.stringify(result.body));
    }
  } else {
    res.end();
  }
}
