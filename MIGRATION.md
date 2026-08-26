# Arcade FX PHP to Netlify migration

## Runtime map

| Previous PHP responsibility | Netlify equivalent | Public route |
| --- | --- | --- |
| `api/health.php` | `netlify/functions/api.mjs` | `GET /api/health` |
| `api/settings.php` | `netlify/functions/api.mjs` | `GET/POST/PUT /api/settings` |
| `api/market_data.php` | `netlify/functions/api.mjs` | `GET /api/market-data` |
| `api/signals.php` | `netlify/functions/api.mjs` | `GET/POST /api/signals` |
| `api/watchlist.php` | `netlify/functions/api.mjs` | `GET/POST/DELETE /api/watchlist` |
| `api/drawings.php` | `netlify/functions/api.mjs` | `GET/POST /api/drawings` |
| `api/alerts.php` | `netlify/functions/api.mjs` | `GET/POST/DELETE /api/alerts` |
| SQLite/PDO state | Managed PostgreSQL via `pg` | `DATABASE_URL` |
| PHP page templates | static build output in `dist/` | existing `*.php` URLs rewritten to `*.html` |

The trading/SMC calculation modules were already browser-side JavaScript and remain unchanged. The old PHP market-data endpoint generated synthetic bars; its Node replacement retains its symbol registry, session-volatility model, OHLCV shape, and deterministic-per-symbol behavior.

## Deliberately absent from the source application

No runtime implementation was found for authentication, sessions, roles, admin controls, payments, subscriptions, webhooks, password resets, email, uploads, or scheduled jobs. The existing database SQL mentions users/payments/subscriptions, but neither the PHP routes nor frontend calls use them. They are not replaced with placeholders.

## Deployment

1. Create a managed PostgreSQL database and set `DATABASE_URL`, `DATABASE_SSL=true`, and `ALLOWED_ORIGIN=https://arcadefx.live` in Netlify.
2. Run `npm install`, then `npm run db:migrate` and `npm run db:import-legacy` from a trusted environment with `DATABASE_URL` set.
3. Deploy to Netlify. `npm run build` creates `dist/`; the source PHP, SQLite database, configuration, and SQL files are excluded from the publish directory.
4. Purge the prior Netlify deployment/cache. Reload the PWA once so `sw.js` removes the legacy cache.

For local development: copy `.env.example` to `.env`, set a PostgreSQL URL, run `npm install`, then `npm run dev`.

## Data migration

`database/migrations/001_initial_postgres.sql` creates and seeds the six tables actually used by the PHP runtime. `npm run db:import-legacy` imports the existing SQLite `settings`, `symbols`, `watchlist`, `drawings`, `signals`, and `alerts` tables into PostgreSQL in one transaction; it never modifies the source database. Do not run the old destructive `database.sql` against production; it contains `DROP TABLE` statements and demo-only user/payment data.
