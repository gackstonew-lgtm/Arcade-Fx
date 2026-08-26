import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'arcadefx-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];

        if (pathname.startsWith('/api/') || pathname === '/api') {
          try {
            const isAdmin = pathname.startsWith('/api/admin');
            const handlerModule = isAdmin
              ? await import('./netlify/functions/admin.mjs')
              : await import('./netlify/functions/api.mjs');

            const fullUrl = new URL(rawUrl, `http://${req.headers.host || 'localhost:3000'}`);
            const queryParams: Record<string, string> = {};
            fullUrl.searchParams.forEach((val, key) => {
              queryParams[key] = val;
            });

            let bodyStr = '';
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              bodyStr = Buffer.concat(chunks).toString('utf8');
            }

            const event = {
              path: pathname,
              httpMethod: req.method || 'GET',
              headers: req.headers as Record<string, string>,
              queryStringParameters: queryParams,
              body: bodyStr || null
            };

            const result = await handlerModule.handler(event);

            res.statusCode = result.statusCode || 200;
            if (result.headers) {
              Object.entries(result.headers).forEach(([key, val]) => {
                res.setHeader(key, val as string);
              });
            }
            res.end(result.body || '');
            return;
          } catch (err: any) {
            console.error('[API Dev Middleware Error]', err);
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
  plugins: [react(), apiDevServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        signals: path.resolve(__dirname, 'signals.html'),
        alerts: path.resolve(__dirname, 'alerts.html'),
        news: path.resolve(__dirname, 'news.html'),
        markets: path.resolve(__dirname, 'markets.html'),
        trading: path.resolve(__dirname, 'trading.html'),
        smc: path.resolve(__dirname, 'smc.html'),
        tools: path.resolve(__dirname, 'tools.html'),
        landing: path.resolve(__dirname, 'landing.html'),
        login: path.resolve(__dirname, 'login.html'),
        register: path.resolve(__dirname, 'register.html'),
        admin: path.resolve(__dirname, 'admin/index.html'),
        adminLogin: path.resolve(__dirname, 'admin/login.html')
      }
    }
  },
});
