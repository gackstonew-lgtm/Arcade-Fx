-- Arcade FX Migration 004: Subscription Entitlements, 3-Day Free Trial & RLS

-- 1. Ensure Profile columns for trial & subscription state
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan_id VARCHAR(50) DEFAULT 'arcadefx-pro';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. Subscription Entitlement Ledger Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL DEFAULT 'arcadefx-pro',
  status VARCHAR(30) NOT NULL DEFAULT 'trialing', -- trialing, active, payment_pending, past_due, cancelled, expired, failed
  payment_provider VARCHAR(50) DEFAULT 'payhero',
  payment_method VARCHAR(30) DEFAULT 'mpesa', -- mpesa, card
  amount NUMERIC(14,2) NOT NULL DEFAULT 49.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_start TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_reference VARCHAR(100) UNIQUE,
  provider_transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at);

-- 3. Row Level Security Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_read_subscriptions') THEN
    CREATE POLICY user_read_subscriptions ON subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Grant Permanent VIP Lifetime & Signal Engine Entitlement to gackstoneb@gmail.com
UPDATE profiles
SET role = 'admin',
    status = 'active',
    subscription_plan = 'VIP Lifetime',
    subscription_status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(email) IN ('gackstoneb@gmail.com', 'admin@arcadefx.live');

