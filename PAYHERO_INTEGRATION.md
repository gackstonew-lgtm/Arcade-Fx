# ArcadeFX — PayHero M-PESA Payment Integration Guide

This document specifies the architecture, environment configuration, serverless function endpoints, and channel isolation rules for the ArcadeFX PayHero M-PESA STK Push integration.

---

## 1. PayHero Environment Configuration (Netlify)

To activate PayHero M-PESA STK Push payment processing, set the following environment variables in your **Netlify Site Configuration → Environment Variables**:

| Variable Name | Required | Type | Purpose | Example / Note |
| --- | --- | --- | --- | --- |
| `PAYHERO_API_KEY` | **Yes** | Private (Backend) | Your PayHero API Key | `ph_api_key_xxxxxxxx` |
| `PAYHERO_SECRET` | **Yes** | Private (Backend) | Your PayHero API Secret / Token | `ph_sec_yyyyyyyy` |
| `PAYHERO_ARCADEFX_CHANNEL_ID` | **Yes** | Private (Backend) | ArcadeFX Dedicated PayHero Channel ID | `1234` |
| `PAYHERO_CALLBACK_URL` | **Yes** | Private (Backend) | Webhook URL for payment confirmations | `https://arcadefx.live/.netlify/functions/payhero-webhook` |

> [!IMPORTANT]
> **Dedicated Channel Isolation Policy**:
> ArcadeFX strictly uses `PAYHERO_ARCADEFX_CHANNEL_ID`. The backend will **never** modify, delete, or fall back to any other partner payment channel inside the shared PayHero account. If `PAYHERO_ARCADEFX_CHANNEL_ID` is missing, payment requests fail safely with a configuration error.

---

## 2. Serverless Function Endpoints

### 1. STK Push Initiation Endpoint
- **URL**: `POST /.netlify/functions/payhero-stk` (and `/api/payhero-stk`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "planId": "pro",
    "phoneNumber": "0712345678",
    "email": "trader@arcadefx.live"
  }
  ```
- **Behavior**:
  - Authoritatively validates `planId` pricing (`starter`: 3,750 KES / $29, `pro`: 9,900 KES / $79, `institutional`: 24,900 KES / $199).
  - Normalizes phone number into `2547XXXXXXXX` 12-digit format.
  - Generates unique reference `ARCADEFX-SUB-{timestamp}-{hash}`.
  - Calls PayHero API v2 (`https://backend.payhero.co.ke/api/v2/payments`).

### 2. Webhook / Callback Endpoint
- **URL**: `POST /.netlify/functions/payhero-webhook` (and `/api/payhero-webhook`)
- **Behavior**:
  - Receives asynchronous M-PESA STK payment confirmations from PayHero.
  - **Idempotency**: Verifies transaction reference. If already processed, returns `200 OK` without duplicate activations.
  - **Subscription Activation**: On confirmed `SUCCESS`, updates user profile in Supabase (`subscription_status = 'active'`, `subscription_expires_at = NOW() + 30 days`).

---

## 3. Local Development & Testing

During local development with `npm run dev`:
- Vite dev server middleware intercepts `/api/payhero-stk` and `/api/payhero-webhook` and executes Netlify handlers locally in Node.js.
- Test endpoint directly via Node:
  ```bash
  node -e "import('./netlify/functions/payhero-stk.mjs').then(m => m.handler({ httpMethod: 'POST', body: JSON.stringify({ planId: 'pro', phoneNumber: '0712345678' }) }).then(console.log))"
  ```
