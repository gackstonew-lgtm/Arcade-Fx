-- Arcade FX Database Migration 002: Multi-User Identity, Row Level Security & Financial Ledger

-- Enable UUID extension if missing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(191),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  locked_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wallet Transactions Ledger
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- deposit, withdrawal, refund, adjustment
  amount_usd NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  amount_kes NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  reference VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'completed', -- pending, completed, failed
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Trading Journal
CREATE TABLE IF NOT EXISTS journals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol_code VARCHAR(50) NOT NULL,
  timeframe VARCHAR(20) NOT NULL DEFAULT '15M',
  bias VARCHAR(20) NOT NULL, -- BULLISH / BEARISH
  setup_type VARCHAR(50) NOT NULL,
  entry_price NUMERIC(12,5) NOT NULL,
  stop_loss NUMERIC(12,5) NOT NULL,
  target_price NUMERIC(12,5) NOT NULL,
  risk_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  r_multiple NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  outcome VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- WIN, LOSS, BREAKEVEN, OPEN
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add user_id column to existing user tables if missing
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE signals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_drawings_user ON drawings(user_id);

-- 7. Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed and recreate
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_policy') THEN
    CREATE POLICY user_profiles_policy ON profiles FOR ALL USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_wallets_policy') THEN
    CREATE POLICY user_wallets_policy ON wallets FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_transactions_policy') THEN
    CREATE POLICY user_transactions_policy ON wallet_transactions FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_journals_policy') THEN
    CREATE POLICY user_journals_policy ON journals FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_watchlists_policy') THEN
    CREATE POLICY user_watchlists_policy ON watchlists FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_alerts_policy') THEN
    CREATE POLICY user_alerts_policy ON alerts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_drawings_policy') THEN
    CREATE POLICY user_drawings_policy ON drawings FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_settings_policy') THEN
    CREATE POLICY user_settings_policy ON settings FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;
