/**
 * ArcadeFX — Server-Side Subscription & Trial Entitlement Engine
 * Evaluates 3-day free trials, paid memberships, and VIP lifetime access.
 */

import { database } from './db.mjs';

const VIP_EMAILS = new Set([
  'gackstoneb@gmail.com',
  'admin@arcadefx.live',
  'trader@arcadefx.io'
]);

export const PLANS = {
  essential: {
    id: 'essential',
    name: 'Essential Signals',
    priceUsd: 15,
    priceKes: 1950,
    allowedSignals: ['BTCUSD', 'EURUSD'],
    allSignals: false,
    forexClasses: false,
    forexClassPdfs: false,
    tools: true,
    news: true,
    charts: true,
    marketWatch: true
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    priceUsd: 49,
    priceKes: 6320,
    allowedSignals: null,
    allSignals: true,
    forexClasses: false,
    forexClassPdfs: false,
    tools: true,
    news: true,
    charts: true,
    marketWatch: true
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    priceUsd: 149,
    priceKes: 19200,
    allowedSignals: null,
    allSignals: true,
    forexClasses: true,
    forexClassPdfs: true,
    tools: true,
    news: true,
    charts: true,
    marketWatch: true
  },
  vip: {
    id: 'vip',
    name: 'VIP Lifetime',
    priceUsd: 0,
    priceKes: 0,
    allowedSignals: null,
    allSignals: true,
    forexClasses: true,
    forexClassPdfs: true,
    tools: true,
    news: true,
    charts: true,
    marketWatch: true
  }
};

export function resolvePlanConfig(rawPlanId) {
  const normalized = String(rawPlanId || '').trim().toLowerCase();
  if (normalized.includes('essential')) return PLANS.essential;
  if (normalized.includes('elite')) return PLANS.elite;
  if (normalized.includes('vip')) return PLANS.vip;
  return PLANS.professional;
}

export function buildEntitlementResponse(planConfig, status = 'SUBSCRIPTION_ACTIVE', extra = {}) {
  const isEntitled = status === 'SUBSCRIPTION_ACTIVE' || status === 'TRIAL_ACTIVE' || status === 'VIP_LIFETIME';
  return {
    isEntitled,
    status,
    accessState: isEntitled ? 'SUBSCRIPTION_ACTIVE' : 'PAYMENT_REQUIRED',
    planId: planConfig.id,
    planName: planConfig.name,
    priceUsd: planConfig.priceUsd,
    entitlements: {
      plan: planConfig.id,
      signals: {
        all: planConfig.allSignals,
        allowedPairs: planConfig.allowedSignals,
        btcusd: true,
        eurusd: true,
        xauusd: planConfig.allSignals,
        xagusd: planConfig.allSignals
      },
      news: planConfig.news,
      charts: planConfig.charts,
      marketWatch: planConfig.marketWatch,
      tools: planConfig.tools,
      forexClasses: planConfig.forexClasses,
      forexClassPdfs: planConfig.forexClassPdfs
    },
    ...extra
  };
}

export async function checkUserEntitlement(userId, userEmail) {
  const emailLower = String(userEmail || '').trim().toLowerCase();

  // 1. Permanent VIP & Admin Override Check
  if (VIP_EMAILS.has(emailLower)) {
    return buildEntitlementResponse(PLANS.vip, 'VIP_LIFETIME', {
      daysRemaining: 9999,
      message: 'ArcadeFX Professional Trading Intelligence Unlocked (VIP Lifetime)'
    });
  }

  try {
    const db = database();

    // 2. Query Active Subscription Table
    if (userId) {
      const subRes = await db.query(
        `SELECT status, current_period_end, plan_id FROM subscriptions
         WHERE user_id = $1 AND status IN ('active', 'trialing')
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (subRes.rows && subRes.rows.length > 0) {
        const sub = subRes.rows[0];
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
        if (!periodEnd || periodEnd > Date.now()) {
          const planConfig = resolvePlanConfig(sub.plan_id);
          const subStatus = sub.status === 'trialing' ? 'TRIAL_ACTIVE' : 'SUBSCRIPTION_ACTIVE';
          return buildEntitlementResponse(planConfig, subStatus, {
            currentPeriodEnd: sub.current_period_end,
            message: `ArcadeFX ${planConfig.name} Active`
          });
        }
      }
    }

    // 3. Query User Profile for Trial & Subscription Dates
    if (userId || emailLower) {
      const profRes = await db.query(
        `SELECT created_at, trial_started_at, trial_ends_at, subscription_status, subscription_plan_id, plan_name, subscription_expires_at
         FROM profiles WHERE id = $1 OR LOWER(email) = $2 LIMIT 1`,
        [userId || null, emailLower || null]
      );

      if (profRes.rows && profRes.rows.length > 0) {
        const prof = profRes.rows[0];

        // Active subscription check
        if (prof.subscription_status === 'active') {
          const expires = prof.subscription_expires_at ? new Date(prof.subscription_expires_at).getTime() : null;
          if (!expires || expires > Date.now()) {
            const planConfig = resolvePlanConfig(prof.subscription_plan_id || prof.plan_name);
            return buildEntitlementResponse(planConfig, 'SUBSCRIPTION_ACTIVE', {
              message: `ArcadeFX ${planConfig.name} Active`
            });
          }
        }

        // 3-Day Free Trial check
        const trialStart = new Date(prof.trial_started_at || prof.created_at || Date.now()).getTime();
        const trialDurationMs = 3 * 24 * 60 * 60 * 1000;
        const trialEnd = prof.trial_ends_at ? new Date(prof.trial_ends_at).getTime() : trialStart + trialDurationMs;
        const now = Date.now();

        if (now < trialEnd) {
          const hoursLeft = Math.ceil((trialEnd - now) / (60 * 60 * 1000));
          const daysLeft = Math.ceil(hoursLeft / 24);
          const trialPlanConfig = PLANS.professional;
          return buildEntitlementResponse(trialPlanConfig, 'TRIAL_ACTIVE', {
            daysRemaining: daysLeft,
            hoursRemaining: hoursLeft,
            message: `3-Day Free Trial Active (${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining)`
          });
        }

        // Trial Expired
        return buildEntitlementResponse(PLANS.professional, 'TRIAL_EXPIRED', {
          isEntitled: false,
          daysRemaining: 0,
          message: '3-Day Free Trial Expired. Subscription Required.'
        });
      }
    }
  } catch (err) {
    console.warn('[Entitlement Engine] Database check warning:', err.message);
  }

  // Fallback: Default session entitlement (active trial)
  return buildEntitlementResponse(PLANS.professional, 'TRIAL_ACTIVE', {
    daysRemaining: 3,
    message: 'ArcadeFX 3-Day Free Trial Active'
  });
}
