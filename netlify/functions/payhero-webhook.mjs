/**
 * ArcadeFX — PayHero Asynchronous Callback/Webhook Serverless Endpoint
 * Processes PayHero M-PESA STK Push confirmation, handles idempotency,
 * and activates user subscriptions in Supabase / PostgreSQL.
 */

import { database } from './lib/db.mjs';
import { qualifyReferralOnPayment } from './lib/referral-service.mjs';

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, service: 'ArcadeFX PayHero Webhook Engine', status: 'ONLINE' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('[PayHero Webhook Received]', JSON.stringify(payload));

    const externalRef = payload.external_reference || payload.reference || payload.ThirdPartyTransID;
    const statusRaw = String(payload.status || payload.ResultCode || '').toUpperCase();
    const mpesaReceipt = payload.MpesaReceiptNumber || payload.mpesa_code || payload.receipt_number || '';
    const amountPaid = Number(payload.amount || payload.Amount || 0);

    if (!externalRef) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing external reference' })
      };
    }

    const isSuccess = ['SUCCESS', 'COMPLETED', '0', 'SUCCESSFUL'].includes(statusRaw);

    let db;
    try {
      db = database();
    } catch (e) {
      console.warn('[PayHero Webhook DB Warning] No PostgreSQL connection available:', e.message);
    }

    if (db) {
      // 1. Idempotency Check: Verify if transaction is already completed
      const existingRes = await db.query(
        'SELECT * FROM wallet_transactions WHERE reference = $1',
        [externalRef]
      );

      const existingTx = existingRes.rows[0];

      if (existingTx && existingTx.status === 'completed') {
        console.log(`[PayHero Webhook Idempotency] Reference ${externalRef} is already completed.`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Transaction already completed (idempotent)' })
        };
      }

      if (isSuccess) {
        // Update transaction to completed
        await db.query(`
          UPDATE wallet_transactions
          SET status = 'completed',
              receipt_number = $1,
              updated_at = NOW()
          WHERE reference = $2
        `, [mpesaReceipt, externalRef]);

        // Activate User Subscription in profiles & subscriptions table
        if (existingTx?.user_email || existingTx?.user_id) {
          const planName = existingTx.plan_name || 'Professional';
          const planId = (planName.toLowerCase().includes('essential') ? 'essential' : (planName.toLowerCase().includes('elite') ? 'elite' : 'professional'));
          const userId = existingTx.user_id;
          const userEmail = existingTx.user_email;

          await db.query(`
            UPDATE profiles
            SET subscription_status = 'active',
                subscription_plan_id = $1,
                plan_name = $2,
                subscription_expires_at = NOW() + INTERVAL '30 days',
                updated_at = NOW()
            WHERE id = $3 OR LOWER(email) = LOWER($4)
          `, [planId, planName, userId, userEmail]);

          try {
            await db.query(`
              INSERT INTO subscriptions (
                user_id, plan_id, status, payment_provider, amount, currency, current_period_end, payment_reference
              ) VALUES ($1, $2, 'active', 'payhero', $3, 'USD', NOW() + INTERVAL '30 days', $4)
              ON CONFLICT (payment_reference) DO UPDATE SET status = 'active', updated_at = NOW()
            `, [userId && !userId.startsWith('user_') ? userId : null, planId, existingTx.amount_usd || 49.00, externalRef]);
          } catch (subErr) {
            console.warn('[PayHero Webhook Sub Record Warning]', subErr.message);
          }

          console.log(`[PayHero Webhook Success] Subscription activated for ${userEmail} (${planName} / ${planId})`);

          // Qualify Referral only on verified successful payment
          try {
            let targetUserId = userId;
            if (!targetUserId || targetUserId.startsWith('user_')) {
              const uRes = await db.query('SELECT id FROM profiles WHERE email = $1', [userEmail]);
              if (uRes.rows.length > 0) targetUserId = uRes.rows[0].id;
            }
            if (targetUserId) {
              await qualifyReferralOnPayment(db, targetUserId, planName, amountPaid || existingTx?.amount_usd || 49.00, 'USD');
            }
          } catch (refErr) {
            console.warn('[PayHero Webhook Referral Qualification Warning]', refErr.message);
          }
        }
      } else {
        // Mark transaction as failed/cancelled
        await db.query(`
          UPDATE wallet_transactions
          SET status = 'failed',
              updated_at = NOW()
          WHERE reference = $1
        `, [externalRef]);

        console.log(`[PayHero Webhook Failed] Payment failed for reference ${externalRef}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PayHero webhook processed successfully',
        reference: externalRef,
        status: isSuccess ? 'COMPLETED' : 'FAILED'
      })
    };

  } catch (err) {
    console.error('[PayHero Webhook Error]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Webhook processing error' })
    };
  }
}
