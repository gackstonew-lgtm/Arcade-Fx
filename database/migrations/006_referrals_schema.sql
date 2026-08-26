-- Arcade FX Migration 006: Referral & Subscription Attribution System

-- 1. Ensure Profile columns for Referral Code & Attributed Referrer
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by_id);

-- 2. Referrals Ledger Table
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, QUALIFIED, CANCELLED, EXPIRED
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
  subscription_plan VARCHAR(100),
  subscription_amount NUMERIC(14,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  qualified_at TIMESTAMPTZ,
  CONSTRAINT chk_no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON referrals(referrer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- 3. Row Level Security Policies for Referrals Table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_read_own_referrals') THEN
    CREATE POLICY user_read_own_referrals ON referrals 
      FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
  END IF;
END $$;
