-- ========================================================
-- ARCADE FX — SUPABASE PRODUCTION BACKEND SCHEMA MIGRATION
-- Migration: 001_arcadefx_wallet.sql
-- Description: Core tables, RLS policies, atomic ledger triggers,
--              Kora payment tracking, and audit logging.
-- ========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. BASE TABLES (Existing functionality compatibility)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symbols (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  base_price NUMERIC(12,5) NOT NULL,
  pip_size NUMERIC(10,5) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(191) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.watchlist (
  id BIGSERIAL PRIMARY KEY,
  symbol_code VARCHAR(50) UNIQUE NOT NULL REFERENCES public.symbols(code) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.drawings (
  id BIGSERIAL PRIMARY KEY,
  symbol_code VARCHAR(50) NOT NULL REFERENCES public.symbols(code) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.signals (
  id BIGSERIAL PRIMARY KEY,
  symbol_code VARCHAR(50) NOT NULL REFERENCES public.symbols(code) ON DELETE CASCADE,
  timeframe VARCHAR(20) NOT NULL DEFAULT '15M',
  signal_type VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  rating VARCHAR(20) NOT NULL,
  details_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id BIGSERIAL PRIMARY KEY,
  symbol_code VARCHAR(50) NOT NULL REFERENCES public.symbols(code) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  condition_val NUMERIC(12,5) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed Base Data safely
INSERT INTO public.symbols (code, name, base_price, pip_size, type) VALUES
  ('EURUSD','Euro / US Dollar',1.08500,0.00010,'forex'),
  ('GBPUSD','British Pound / US Dollar',1.27200,0.00010,'forex'),
  ('USDJPY','US Dollar / Japanese Yen',154.50000,0.01000,'forex'),
  ('USDCHF','US Dollar / Swiss Franc',0.89800,0.00010,'forex'),
  ('USDCAD','US Dollar / Canadian Dollar',1.36500,0.00010,'forex'),
  ('AUDUSD','Australian Dollar / US Dollar',0.66200,0.00010,'forex'),
  ('NZDUSD','New Zealand Dollar / US Dollar',0.61200,0.00010,'forex'),
  ('XAUUSD','Gold / US Dollar',2380.00000,0.10000,'commodity'),
  ('XAGUSD','Silver / US Dollar',30.50000,0.01000,'commodity'),
  ('BTCUSD','Bitcoin / US Dollar',64500.00000,1.00000,'crypto'),
  ('ETHUSD','Ethereum / US Dollar',3480.00000,0.10000,'crypto'),
  ('DXY','US Dollar Index',104.80000,0.01000,'index')
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------
-- 2. USER PROFILES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  country VARCHAR(10) DEFAULT 'KE',
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 3. USER WALLETS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
  locked_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 4. WALLET TRANSACTIONS LEDGER TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'withdrawal_refund', 'adjustment', 'bonus', 'fee')),
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  balance_before NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,
  reference VARCHAR(100) NOT NULL UNIQUE,
  external_reference VARCHAR(100),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 5. DEPOSITS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount_kes NUMERIC(15,2) NOT NULL CHECK (amount_kes > 0),
  amount_usd NUMERIC(15,2) NOT NULL CHECK (amount_usd > 0),
  exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 129.0000,
  phone_number VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reference VARCHAR(100) NOT NULL UNIQUE,
  kora_reference VARCHAR(100),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 6. WITHDRAWALS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount_usd NUMERIC(15,2) NOT NULL CHECK (amount_usd > 0),
  amount_kes NUMERIC(15,2) NOT NULL CHECK (amount_kes > 0),
  exchange_rate NUMERIC(10,4) NOT NULL DEFAULT 129.0000,
  phone_number VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  reference VARCHAR(100) NOT NULL UNIQUE,
  kora_reference VARCHAR(100),
  payment_method VARCHAR(50) DEFAULT 'mpesa',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 7. AUDIT LOGS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  reference VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- 8. INDEXES FOR PERFORMANCE & INTEGRITY
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON public.wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_deposits_ref ON public.deposits(reference);
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON public.deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_ref ON public.withdrawals(reference);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON public.withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);

-- --------------------------------------------------------
-- 9. AUTH TRIGGER: AUTO CREATE PROFILE AND WALLET
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, email, full_name, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.email_confirmed_at IS NOT NULL), FALSE)
  );

  -- Insert initial zero-balance wallet for user
  INSERT INTO public.wallets (user_id, currency, balance, locked_balance)
  VALUES (NEW.id, 'USD', 0.00, 0.00);

  -- Log registration in audit_logs
  INSERT INTO public.audit_logs (user_id, action, metadata)
  VALUES (NEW.id, 'USER_REGISTERED', jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync email verification status on update
CREATE OR REPLACE FUNCTION public.handle_user_verification_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET is_verified = TRUE, updated_at = NOW()
    WHERE id = NEW.id;

    INSERT INTO public.audit_logs (user_id, action)
    VALUES (NEW.id, 'EMAIL_VERIFIED');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_verification_update();

-- --------------------------------------------------------
-- 10. ATOMIC FINANCIAL PROCEDURES & FUNCTIONS
-- --------------------------------------------------------

-- Procedure: Credit deposit atomically (Used by Webhook)
CREATE OR REPLACE FUNCTION public.credit_deposit_atomically(
  p_reference TEXT,
  p_kora_ref TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_deposit public.deposits%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_bal_before NUMERIC(15,2);
  v_bal_after NUMERIC(15,2);
  v_tx_id UUID;
BEGIN
  -- 1. Fetch & lock deposit row
  SELECT * INTO v_deposit
  FROM public.deposits
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit reference not found');
  END IF;

  -- Idempotency check: If already completed, exit cleanly without double crediting!
  IF v_deposit.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Deposit already processed and credited', 'already_processed', true);
  END IF;

  IF v_deposit.status = 'failed' OR v_deposit.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit is in a terminal non-payable status');
  END IF;

  -- 2. Lock user wallet row
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE id = v_deposit.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated wallet not found');
  END IF;

  v_bal_before := v_wallet.balance;
  v_bal_after := v_wallet.balance + v_deposit.amount_usd;

  -- 3. Update wallet balance
  UPDATE public.wallets
  SET balance = v_bal_after,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  -- 4. Create ledger transaction record
  INSERT INTO public.wallet_transactions (
    user_id, wallet_id, type, amount, currency,
    balance_before, balance_after, reference, external_reference,
    description, status, metadata
  ) VALUES (
    v_deposit.user_id,
    v_deposit.wallet_id,
    'deposit',
    v_deposit.amount_usd,
    'USD',
    v_bal_before,
    v_bal_after,
    p_reference,
    p_kora_ref,
    'M-Pesa STK Deposit via Kora (' || v_deposit.amount_kes || ' KES)',
    'completed',
    jsonb_build_object('amount_kes', v_deposit.amount_kes, 'exchange_rate', v_deposit.exchange_rate, 'phone', v_deposit.phone_number)
  )
  RETURNING id INTO v_tx_id;

  -- 5. Mark deposit completed
  UPDATE public.deposits
  SET status = 'completed',
      kora_reference = COALESCE(p_kora_ref, kora_reference),
      updated_at = NOW()
  WHERE reference = p_reference;

  -- 6. Log in audit_logs
  INSERT INTO public.audit_logs (user_id, action, reference, metadata)
  VALUES (
    v_deposit.user_id,
    'DEPOSIT_COMPLETED',
    p_reference,
    jsonb_build_object('amount_usd', v_deposit.amount_usd, 'amount_kes', v_deposit.amount_kes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'amount_usd', v_deposit.amount_usd,
    'new_balance', v_bal_after,
    'tx_id', v_tx_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure: Lock funds for withdrawal atomically
CREATE OR REPLACE FUNCTION public.lock_withdrawal_funds(
  p_user_id UUID,
  p_amount_usd NUMERIC(15,2),
  p_amount_kes NUMERIC(15,2),
  p_exchange_rate NUMERIC(10,4),
  p_phone TEXT,
  p_reference TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_avail NUMERIC(15,2);
  v_wth_id UUID;
BEGIN
  -- 1. Lock user wallet row for update
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_avail := v_wallet.balance - v_wallet.locked_balance;

  -- 2. Verify sufficient available balance
  IF v_avail < p_amount_usd THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient available balance',
      'available', v_avail,
      'requested', p_amount_usd
    );
  END IF;

  -- 3. Lock balance
  UPDATE public.wallets
  SET locked_balance = locked_balance + p_amount_usd,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  -- 4. Create pending withdrawal row
  INSERT INTO public.withdrawals (
    user_id, wallet_id, amount_usd, amount_kes, exchange_rate,
    phone_number, status, reference
  ) VALUES (
    p_user_id, v_wallet.id, p_amount_usd, p_amount_kes, p_exchange_rate,
    p_phone, 'pending', p_reference
  )
  RETURNING id INTO v_wth_id;

  -- 5. Audit Log
  INSERT INTO public.audit_logs (user_id, action, reference, metadata)
  VALUES (
    p_user_id,
    'WITHDRAWAL_INITIATED',
    p_reference,
    jsonb_build_object('amount_usd', p_amount_usd, 'amount_kes', p_amount_kes, 'phone', p_phone)
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_wth_id,
    'reference', p_reference,
    'wallet_id', v_wallet.id,
    'locked_amount', p_amount_usd
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure: Finalize withdrawal (Success or Failed Refund)
CREATE OR REPLACE FUNCTION public.finalize_withdrawal(
  p_reference TEXT,
  p_kora_ref TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_wth public.withdrawals%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_bal_before NUMERIC(15,2);
  v_bal_after NUMERIC(15,2);
  v_tx_id UUID;
BEGIN
  -- 1. Lock withdrawal row
  SELECT * INTO v_wth
  FROM public.withdrawals
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal reference not found');
  END IF;

  IF v_wth.status = 'completed' OR v_wth.status = 'refunded' OR v_wth.status = 'failed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Withdrawal already finalized', 'status', v_wth.status);
  END IF;

  -- 2. Lock wallet row
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE id = v_wth.wallet_id
  FOR UPDATE;

  IF p_success THEN
    -- Deduct balance and release locked balance
    v_bal_before := v_wallet.balance;
    v_bal_after := v_wallet.balance - v_wth.amount_usd;

    UPDATE public.wallets
    SET balance = v_bal_after,
        locked_balance = GREATEST(0.00, locked_balance - v_wth.amount_usd),
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Create ledger transaction
    INSERT INTO public.wallet_transactions (
      user_id, wallet_id, type, amount, currency,
      balance_before, balance_after, reference, external_reference,
      description, status, metadata
    ) VALUES (
      v_wth.user_id, v_wth.wallet_id, 'withdrawal', v_wth.amount_usd, 'USD',
      v_bal_before, v_bal_after, p_reference, p_kora_ref,
      'M-Pesa Payout via Kora (' || v_wth.amount_kes || ' KES)',
      'completed',
      jsonb_build_object('amount_kes', v_wth.amount_kes, 'phone', v_wth.phone_number)
    ) RETURNING id INTO v_tx_id;

    UPDATE public.withdrawals
    SET status = 'completed',
        kora_reference = COALESCE(p_kora_ref, kora_reference),
        updated_at = NOW()
    WHERE reference = p_reference;

    INSERT INTO public.audit_logs (user_id, action, reference)
    VALUES (v_wth.user_id, 'WITHDRAWAL_COMPLETED', p_reference);
  ELSE
    -- Failed payout -> Refund locked balance safely back to available pool
    UPDATE public.wallets
    SET locked_balance = GREATEST(0.00, locked_balance - v_wth.amount_usd),
        updated_at = NOW()
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_transactions (
      user_id, wallet_id, type, amount, currency,
      balance_before, balance_after, reference, external_reference,
      description, status, metadata
    ) VALUES (
      v_wth.user_id, v_wth.wallet_id, 'withdrawal_refund', v_wth.amount_usd, 'USD',
      v_wallet.balance, v_wallet.balance, p_reference, p_kora_ref,
      'Withdrawal failed & refunded: ' || COALESCE(p_failure_reason, 'Provider rejection'),
      'refunded',
      jsonb_build_object('reason', p_failure_reason)
    ) RETURNING id INTO v_tx_id;

    UPDATE public.withdrawals
    SET status = 'failed',
        kora_reference = COALESCE(p_kora_ref, kora_reference),
        metadata = jsonb_set(metadata, '{failure_reason}', to_jsonb(COALESCE(p_failure_reason, 'Unknown'))),
        updated_at = NOW()
    WHERE reference = p_reference;

    INSERT INTO public.audit_logs (user_id, action, reference, metadata)
    VALUES (v_wth.user_id, 'WITHDRAWAL_FAILED_REFUNDED', p_reference, jsonb_build_object('reason', p_failure_reason));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'status', CASE WHEN p_success THEN 'completed' ELSE 'failed' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- WALLETS POLICIES
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- WALLET TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transaction ledger"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- DEPOSITS POLICIES
CREATE POLICY "Users can view own deposits"
  ON public.deposits FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create deposits"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- WITHDRAWALS POLICIES
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can request withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- AUDIT LOGS POLICIES
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
