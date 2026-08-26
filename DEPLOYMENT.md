# Arcade FX Netlify & Serverless Production Deployment Guide (`arcadefx.live`)

Arcade FX has been architecturally migrated from legacy PHP to a modern **JavaScript/TypeScript + Netlify Serverless Functions** stack. PHP is no longer required or present in the deployment bundle.

---

## Production Deployment Stack

- **Frontend**: Vite + TypeScript + React static build output served directly from `dist/`
- **Backend API**: Netlify Serverless Functions in `netlify/functions/api.mjs` and `netlify/functions/admin.mjs`
- **Database**: Managed PostgreSQL (`DATABASE_URL`) with connection pooling in `netlify/functions/lib/db.mjs`
- **Authentication & Wallet**: Supabase JS SDK + Supabase Edge Functions (`supabase/functions/`)

---

## Netlify Deployment Steps

1. **Environment Configuration**:
   Configure environment variables in Netlify Dashboard:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   DATABASE_SSL=true
   ALLOWED_ORIGIN=https://arcadefx.live
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. **Build & Publish**:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Functions Directory: `netlify/functions`

3. **Verification**:
   Run locally or in staging:
   ```bash
   npm run build
   node scripts/run-tests.mjs
   ```
   All static assets and serverless functions deploy directly via `netlify.toml`.
