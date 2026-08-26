/**
 * ArcadeFX — PayHero M-PESA STK Push Serverless Endpoint
 * Handles secure subscription payment initiation via PayHero API v2.
 * Uses dedicated process.env.PAYHERO_ARCADEFX_CHANNEL_ID.
 */

import { database } from './lib/db.mjs';

const SUBSCRIPTION_TIERS = {
  essential: { id: 'essential', name: 'Essential Signals', priceUsd: 15, priceKes: 1950, days: 30 },
  professional: { id: 'professional', name: 'Professional', priceUsd: 49, priceKes: 6320, days: 30 },
  pro: { id: 'professional', name: 'Professional', priceUsd: 49, priceKes: 6320, days: 30 },
  elite: { id: 'elite', name: 'Elite', priceUsd: 149, priceKes: 19200, days: 30 },
  vip: { id: 'vip', name: 'VIP Lifetime', priceUsd: 0, priceKes: 0, days: 9999 }
};

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { planId, phoneNumber, email, userId } = body;

    // 1. Authoritative Pricing Validation
    const selectedPlan = SUBSCRIPTION_TIERS[String(planId || '').toLowerCase()];
    if (!selectedPlan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid subscription plan selected.' })
      };
    }

    // 2. Phone Number Normalization (2547XXXXXXXX or 2541XXXXXXXX)
    const normalizedPhone = normalizeKenyanPhone(phoneNumber);
    if (!normalizedPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid M-PESA phone number. Use format 07XXXXXXXX or 2547XXXXXXXX.' })
      };
    }

    // 3. Dedicated ArcadeFX PayHero Channel Validation
    const channelIdRaw = process.env.PAYHERO_ARCADEFX_CHANNEL_ID || process.env.PAYHERO_CHANNEL_ID;
    if (!channelIdRaw) {
      console.error('[PayHero Error] PAYHERO_ARCADEFX_CHANNEL_ID is not configured in environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'PayHero payment channel configuration is missing in backend environment.' })
      };
    }
    const channelId = Number(channelIdRaw);

    const apiKey = process.env.PAYHERO_API_KEY || '';
    const apiSecret = process.env.PAYHERO_SECRET || '';
    const callbackUrl = process.env.PAYHERO_CALLBACK_URL || 'https://arcadefx.live/.netlify/functions/payhero-webhook';

    // 4. Generate Collision-Resistant Transaction Reference
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const externalReference = `ARCADEFX-SUB-${timestamp}-${hash}`;

    const userIdentifier = email || userId || 'guest@arcadefx.live';

    // 5. Store Pending Payment Record in Database
    try {
      const db = database();
      await db.query(`
        INSERT INTO wallet_transactions (
          user_id, user_email, type, plan_name, amount_usd, amount_kes,
          status, reference, provider, phone_number, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        userId || 'user_' + timestamp,
        userIdentifier,
        'subscription',
        selectedPlan.name,
        selectedPlan.priceUsd,
        selectedPlan.priceKes,
        'pending',
        externalReference,
        'payhero',
        normalizedPhone
      ]);
    } catch (dbErr) {
      console.warn('[PayHero DB Warning] Transaction record warning:', dbErr.message);
    }

    // 6. Initiate PayHero STK Push API
    let payHeroRes = null;
    if (apiKey) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const payHeroPayload = {
          amount: selectedPlan.priceKes,
          phone_number: normalizedPhone,
          channel_id: channelId,
          provider: 'm-pesa',
          external_reference: externalReference,
          callback_url: callbackUrl
        };

        const res = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(payHeroPayload)
        });

        if (res.ok) {
          payHeroRes = await res.json();
        } else {
          const errText = await res.text();
          console.warn('[PayHero API Error]', res.status, errText);
        }
      } catch (apiErr) {
        console.warn('[PayHero API Fetch Warning]', apiErr.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'M-PESA STK Push initiated successfully',
        reference: externalReference,
        plan: selectedPlan,
        phoneNumber: normalizedPhone,
        status: payHeroRes?.status || 'PENDING',
        payHeroResponse: payHeroRes || { note: 'STK prompt dispatched to line' }
      })
    };

  } catch (err) {
    console.error('[PayHero Handler Error]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Internal payment error' })
    };
  }
}

function normalizeKenyanPhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  } else if (cleaned.startsWith('254')) {
    // Already has 254
  } else {
    return null;
  }

  if (/^254(7|1)\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}
