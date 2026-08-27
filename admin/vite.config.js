import { defineConfig } from 'vite';

function adminApiDevMiddlewarePlugin() {
  return {
    name: 'arcadefx-admin-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];

        if (pathname.startsWith('/api/') || pathname === '/api') {
          try {
            const isAdmin = pathname.startsWith('/api/admin');
            const adminPath = '../netlify/functions/admin.mjs';
            const apiPath = '../netlify/functions/api.mjs';
            const handlerModule = isAdmin
              ? await import(/* @vite-ignore */ adminPath)
              : await import(/* @vite-ignore */ apiPath);

            const fullUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost:5174'}`);
            const queryParams = {};
            fullUrl.searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });

            let bodyStr = '';
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              bodyStr = Buffer.concat(chunks).toString('utf8');
            }

            const event = {
              path: pathname,
              httpMethod: req.method || 'GET',
              headers: req.headers,
              queryStringParameters: queryParams,
              body: bodyStr || null
            };

            const result = await handlerModule.handler(event);

            res.statusCode = result.statusCode || 200;
            if (result.headers) {
              Object.entries(result.headers).forEach(([key, val]) => {
                res.setHeader(key, val);
              });
            }
            res.end(result.body || '');
            return;
          } catch (err) {
            console.error('[Admin API Dev Middleware Error]', err);
            res.statusCode = err.statusCode || 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [adminApiDevMiddlewarePlugin()],
  server: {
    host: 'localhost',
    port: 5174,
    open: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
