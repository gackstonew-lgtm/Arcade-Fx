-- Arcade FX Migration 005: Signal Engine Lifecycle & Audit Logging Schema

CREATE TABLE IF NOT EXISTS signal_logs (
  id BIGSERIAL PRIMARY KEY,
  symbol_code VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TP1 HIT, TP2 HIT, STOPPED, EXPIRED, CANCELLED
  timeframe VARCHAR(20) NOT NULL DEFAULT '15M',
  entry NUMERIC(14,5),
  stop_loss NUMERIC(14,5),
  take_profit_1 NUMERIC(14,5),
  take_profit_2 NUMERIC(14,5),
  confidence INTEGER NOT NULL DEFAULT 50,
  strategy VARCHAR(100) DEFAULT 'SMC Day-Trade',
  source VARCHAR(100) DEFAULT 'Real-Time VPS Signal Engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signal_logs_symbol_status ON signal_logs(symbol_code, status);
CREATE INDEX IF NOT EXISTS idx_signal_logs_created ON signal_logs(created_at DESC);

ALTER TABLE signal_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_signal_logs') THEN
    CREATE POLICY public_read_signal_logs ON signal_logs FOR SELECT USING (true);
  END IF;
END $$;
