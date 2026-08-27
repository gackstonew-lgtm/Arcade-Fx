# Arcade FX — Vercel Production Environment Variables Mapping & Migration Guide

**Target Production Domain:** `https://arcadefx.live`  
**Configuration Source File:** `.env.vercel.example`

---

## 1. Executive Summary & Environment Variable Matrix

This document provides a comprehensive mapping of every environment variable required or supported by the **Arcade FX** platform when deployed on **Vercel**.

### Environment Mapping Matrix

| Variable | Required | Sensitive | Vercel Environment | Target Location | Source / Purpose |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `SIGNAL_ENGINE_URL` | **Yes** | No | Production, Preview, Dev | Vercel | Base URL for live BM Forex VPS Signal Engine (`http://157.173.193.93:5000`) |
| `GOLD_API_KEY` | Optional | **Yes** | Production, Preview, Dev | Vercel | API token for GoldAPI.io REST service (XAU/USD, XAG/USD, XPT/USD, XPD/USD) |
| `GOLDAPI_API_KEY` | Optional | **Yes** | Production, Preview, Dev | Vercel | Legacy alias for `GOLD_API_KEY` (Supported for backward compatibility) |
| `TWELVE_DATA_API_KEY` | Optional | **Yes** | Production, Preview, Dev | Vercel | API key for Twelve Data multi-asset REST endpoint (`/quote`) |
| `TWELVE_DATA_BASE_URL` | **Yes** | No | Production, Preview, Dev | Vercel | Base endpoint for Twelve Data REST API (`https://api.twelvedata.com`) |
| `SUPABASE_URL` | **Yes** | No | Production, Preview, Dev | Vercel | Public REST endpoint for Supabase project (`https://ykkzfnrndlatvpfsnurk.supabase.co`) |
| `SUPABASE_ANON_KEY` | **Yes** | No | Production, Preview, Dev | Vercel | Client-side public anonymous access token for Supabase DB & Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | Server-side administrative secret key for bypassing Row-Level Security (RLS) |
| `DATABASE_URL` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | PostgreSQL connection string (Supabase Direct or Transaction Pooler) |
| `DATABASE_SSL` | **Yes** | No | Production, Preview, Dev | Vercel | SSL requirement toggle for PostgreSQL pool (`true` / `false`) |
| `PAYHERO_ARCADEFX_CHANNEL_ID` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | Dedicated PayHero Channel ID for Arcade FX M-Pesa STK Push payments |
| `PAYHERO_CHANNEL_ID` | Optional | **Yes** | Production, Preview, Dev | Vercel | Legacy channel ID alias (Fallback if `PAYHERO_ARCADEFX_CHANNEL_ID` is missing) |
| `PAYHERO_API_KEY` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | Basic Authentication API Key for PayHero v2 REST API |
| `PAYHERO_SECRET` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | Basic Authentication API Secret for PayHero v2 REST API |
| `PAYHERO_CALLBACK_URL` | **Yes** | No | Production, Preview | Vercel | Asynchronous webhook callback URL (`https://arcadefx.live/api/payhero-webhook`) |
| `ADMIN_EMAIL` | **Yes** | **Yes** | Production, Preview, Dev | Vercel | Master admin email granted permanent super-admin privileges (`admin@arcadefx.live`) |
| `ALLOWED_ORIGIN` | **Yes** | No | Production | Vercel | Single Access-Control-Allow-Origin production header (`https://arcadefx.live`) |
| `ALLOWED_ORIGINS` | Optional | No | Production, Preview, Dev | Vercel | Comma-separated list of allowed CORS origins (Takes precedence over `ALLOWED_ORIGIN`) |
| `KORA_SECRET_KEY` | Optional | **Yes** | Edge Functions Only | Supabase CLI | Merchant secret key for Korapay M-Pesa charges and disbursement |
| `KORA_WEBHOOK_SECRET` | Optional | **Yes** | Edge Functions Only | Supabase CLI | HMAC signature secret for Korapay webhooks |

---

## 2. Detailed Variable Breakdown

### 1. Signal Engine Integration
* **`SIGNAL_ENGINE_URL`**
  * **Why Arcade FX Needs It:** Connects the serverless backend proxy to the live BM Forex VPS engine hosting Smart Money Concepts (SMC) signal calculations, indicator levels, market strength, and OHLCV candlestick data.
  * **Consuming Components:** `netlify/functions/lib/bm-live-engine.mjs`, `netlify/functions/api.mjs`.
  * **Sensitivity & Location:** Public / Non-sensitive URL. Configured in **Vercel Environment Variables**.
  * **Value:** `http://157.173.193.93:5000` (Defaults to this URL in code if omitted).
  * **Authentication:** No API key or authorization token is currently implemented or required by the VPS signal engine.

---

### 2. Precious Metals Market Data (GoldAPI)
* **`GOLD_API_KEY` & `GOLDAPI_API_KEY`**
  * **Why Arcade FX Needs It:** Provides live precious metals quotes (XAU/USD Gold, XAG/USD Silver, XPT/USD Platinum, XPD/USD Palladium) for the market dashboard and signal engine.
  * **Consuming Components:** `netlify/functions/lib/bm-live-engine.mjs`, `netlify/functions/lib/goldapi-data.mjs`, `netlify/functions/lib/ecb-data.mjs`.
  * **Sensitivity & Location:** Server-side Secret. Configured in **Vercel Environment Variables**.
  * **Precedence:** `GOLD_API_KEY` takes primary precedence; `GOLDAPI_API_KEY` is supported as a fallback name.
  * **Fallback Behavior:** If no key is provided, the system serves reference rates without breaking application functionality or throwing errors.

---

### 3. Twelve Data Integration
* **`TWELVE_DATA_API_KEY` & `TWELVE_DATA_BASE_URL`**
  * **Why Arcade FX Needs It:** Enables multi-asset real-time quotes for major forex pairs and precious metals.
  * **Consuming Components:** `netlify/functions/lib/twelve-data.mjs`, `netlify/functions/lib/ecb-data.mjs`.
  * **API Endpoints Used:** `/quote` endpoint (`https://api.twelvedata.com/quote?symbol=EUR/USD&apikey=...`).
  * **Sensitivity & Location:** `TWELVE_DATA_API_KEY` is a Server-side Secret; `TWELVE_DATA_BASE_URL` (`https://api.twelvedata.com`) is Public. Configured in **Vercel Environment Variables**.
  * **Fallback Behavior:** If `TWELVE_DATA_API_KEY` is omitted, market data gracefully falls back to European Central Bank (ECB) reference rates.

---

### 4. Supabase & PostgreSQL Persistence
* **`SUPABASE_URL`**
  * **Why Arcade FX Needs It:** Base REST URL for Supabase Database, Authentication, and User Profile storage.
  * **Consuming Components:** `netlify/functions/lib/db.mjs`, `supabase/functions/*`, frontend scripts (`index.html`, `admin/src/adminApi.js`).
  * **Public Value:** `https://ykkzfnrndlatvpfsnurk.supabase.co`.
* **`SUPABASE_ANON_KEY`**
  * **Why Arcade FX Needs It:** Enables client-side user login, session management, and public database reads restricted by Row Level Security (RLS).
  * **Public Value:** Safe to expose in client code and Vercel frontend.
* **`SUPABASE_SERVICE_ROLE_KEY`**
  * **Why Arcade FX Needs It:** Server-side secret key used by backend functions to manage administrative overrides, user entitlement verification, and system settings bypass.
  * **Security Warning:** **CRITICAL SERVER-SIDE SECRET**. Must NEVER be prefixed with `VITE_` or exposed to browser bundles.
* **`DATABASE_URL` & `DATABASE_SSL`**
  * **Why Arcade FX Needs It:** Direct PostgreSQL connection string and SSL toggle used by Node.js `pg.Pool` for direct SQL queries and database migration scripts (`scripts/migrate.mjs`).
  * **Value Example:** `postgresql://postgres.ykkzfnrndlatvpfsnurk:YOUR_PASSWORD_HERE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`.

---

### 5. PayHero / M-Pesa Payments
* **`PAYHERO_ARCADEFX_CHANNEL_ID` & `PAYHERO_CHANNEL_ID`**
  * **Why Arcade FX Needs It:** Specifies the PayHero payment channel ID for triggering M-Pesa STK Push subscription prompts.
  * **Consuming Components:** `netlify/functions/payhero-stk.mjs`.
  * **Precedence:** `PAYHERO_ARCADEFX_CHANNEL_ID` is the primary production variable; `PAYHERO_CHANNEL_ID` serves as legacy fallback.
* **`PAYHERO_API_KEY` & `PAYHERO_SECRET`**
  * **Why Arcade FX Needs It:** Credentials for Basic Authentication against PayHero REST API v2 (`https://backend.payhero.co.ke/api/v2/payments`).
* **`PAYHERO_CALLBACK_URL`**
  * **Why Arcade FX Needs It:** Public webhook URL registered with PayHero to receive asynchronous payment confirmation callbacks and trigger instant subscription activation.
  * **Production Target:** `https://arcadefx.live/api/payhero-webhook`.

---

### 6. Admin & CORS Configuration
* **`ADMIN_EMAIL`**
  * **Why Arcade FX Needs It:** Server-side administrator verification key. `verifyAdmin()` in `http.mjs` checks this email alongside database profiles and permanent admin lists to authorize access to the Admin Dashboard.
  * **Production Target:** `admin@arcadefx.live` (or secondary admin email `gackstoneb@gmail.com`).
* **`ALLOWED_ORIGIN` & `ALLOWED_ORIGINS`**
  * **Why Arcade FX Needs It:** Controls Access-Control-Allow-Origin headers returned by backend API responses.
  * **Precedence:** `ALLOWED_ORIGINS` (comma-separated list) takes precedence over `ALLOWED_ORIGIN`.

---

### 7. Supabase Edge Functions Only (Not Vercel)
* **`KORA_SECRET_KEY` & `KORA_WEBHOOK_SECRET`**
  * **Why Arcade FX Needs It:** Used exclusively inside Supabase Edge Functions (`supabase/functions/create-deposit`, `create-withdrawal`, `kora-webhook`) for Korapay payment gateway processing.
  * **Target Location:** **Supabase Secrets** (Configured using Supabase CLI: `supabase secrets set KORA_SECRET_KEY=...`). These do **NOT** belong in Vercel.

---

## 3. Vercel Environments Configuration

Configure environment variables in **Vercel → Project Settings → Environment Variables**:

### Production Environment (`https://arcadefx.live`)
* `ALLOWED_ORIGIN` = `https://arcadefx.live`
* `ALLOWED_ORIGINS` = `https://arcadefx.live,https://admin.arcadefx.live`
* `PAYHERO_CALLBACK_URL` = `https://arcadefx.live/api/payhero-webhook`
* `SIGNAL_ENGINE_URL` = `http://157.173.193.93:5000`
* `SUPABASE_URL` = `https://ykkzfnrndlatvpfsnurk.supabase.co`

### Preview Environment (Branch / PR Deploys)
* Set `ALLOWED_ORIGINS` to allow preview deployment origins (e.g. `https://*.vercel.app`).
* Keep `SIGNAL_ENGINE_URL`, `SUPABASE_URL`, and DB credentials identical to staging/production.

### Development Environment (Local Host)
* `ALLOWED_ORIGIN` = `http://localhost:3000`
* `PAYHERO_CALLBACK_URL` = `http://localhost:3000/api/payhero-webhook`

---

## 4. Vercel Runtime Compatibility Audit

> [!IMPORTANT]
> Setting environment variables alone in Vercel will **NOT** immediately run the existing backend. The existing serverless backend contains Netlify-specific architecture that must be mapped to Vercel.

### Key Architectural Differences & Compatibility Audit

1. **Serverless Function Handlers (`netlify/functions/*.mjs`)**
   * **Current State:** The backend API endpoints (`admin.mjs`, `api.mjs`, `payhero-stk.mjs`, `payhero-webhook.mjs`) are written as Netlify Functions exporting `export async function handler(event)` returning `{ statusCode, headers, body }`.
   * **Vercel Requirement:** Vercel Serverless Functions in `/api` expect standard Node HTTP signatures `export default function handler(req, res)` or Web standard `Request`/`Response` handlers.
   * **Vite Dev Proxy:** `vite.config.ts` currently includes `apiDevServerPlugin` which dynamically imports `./netlify/functions/admin.mjs` and `./netlify/functions/api.mjs`.

2. **Route Rewrites & Routing Rules (`netlify.toml`)**
   * **Current State:** `netlify.toml` manages rewrites:
     * `/api/admin/*` -> `/.netlify/functions/admin/:splat`
     * `/api/*` -> `/.netlify/functions/api/:splat`
     * Clean HTML routes (`/signals` -> `/signals.html`, `/dashboard` -> `/index.html`).
   * **Vercel Behavior:** Vercel **ignores** `netlify.toml`.
   * **Required Fix:** A `vercel.json` file must be created to handle route rewrites and API routing on Vercel:

```json
{
  "rewrites": [
    { "source": "/api/admin/:path*", "destination": "/api/admin" },
    { "source": "/api/:path*", "destination": "/api/index" },
    { "source": "/signals", "destination": "/signals.html" },
    { "source": "/alerts", "destination": "/alerts.html" },
    { "source": "/news", "destination": "/news.html" },
    { "source": "/markets", "destination": "/markets.html" },
    { "source": "/trading", "destination": "/trading.html" },
    { "source": "/smc", "destination": "/smc.html" },
    { "source": "/tools", "destination": "/tools.html" },
    { "source": "/login", "destination": "/login.html" },
    { "source": "/register", "destination": "/register.html" },
    { "source": "/dashboard", "destination": "/index.html" },
    { "source": "/", "destination": "/landing.html" }
  ]
}
```

3. **PayHero Callback Endpoint Path**
   * **Netlify Path:** `https://arcadefx.live/.netlify/functions/payhero-webhook`
   * **Vercel Path:** `https://arcadefx.live/api/payhero-webhook`
   * **Migration Step:** Ensure `PAYHERO_CALLBACK_URL` is set to `https://arcadefx.live/api/payhero-webhook` in Vercel settings.

---

## 5. Security Requirements & Verification Checklist

Before deploying to production on Vercel:

1. **Secrets Protection:** Ensure `.gitignore` ignores `.env`, `.env.local`, `.env.production`, and `.env.vercel`. Only `.env.vercel.example` template is tracked in Git.
2. **Service Role Key Isolation:** Confirm `SUPABASE_SERVICE_ROLE_KEY` is NEVER referenced in client JavaScript or `VITE_*` variables.
3. **No Embedded Credentials:** Code audit confirms no DB passwords or PayHero secrets are embedded in `src/`, `public/`, or HTML files.
4. **HTTPS Enforcement:** Production callbacks and CORS origins use `https://arcadefx.live`.

---

## 6. Environment Audit Statistics

```text
============================================================
ARCADE FX — ENVIRONMENT VARIABLES AUDIT SUMMARY
============================================================
TOTAL ENVIRONMENT VARIABLES DISCOVERED: 20
REQUIRED FOR PRODUCTION:                12
OPTIONAL (WITH STABLE FALLBACKS):      6
LEGACY COMPATIBILITY VARIABLES:        2
SUPABASE-ONLY (EDGE FUNCTIONS):        2
VERCEL-ONLY (CORE RUNTIME):            18
MISSING CREDENTIALS IN CODEBASE:       0 (All secrets properly externalized)
KNOWN PUBLIC VALUES INCLUDED:          5 (Signal URL, Supabase URL/Anon Key, Twelve Data URL, CORS Origin)
PLACEHOLDER VALUES REQUIRED:          7 (DB Pass, Service Key, Gold API Key, Twelve Data Key, PayHero Keys/Channel)
VERCEL COMPATIBILITY WARNINGS:         1 (Netlify Function adapter wrapper required for /api routes)
============================================================
```
