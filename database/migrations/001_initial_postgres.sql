-- Arcade FX Netlify migration: PostgreSQL schema. Run before enabling functions.
CREATE TABLE IF NOT EXISTS symbols (
  id BIGSERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(100) NOT NULL,
  base_price NUMERIC(12,5) NOT NULL, pip_size NUMERIC(10,5) NOT NULL, type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY, setting_key VARCHAR(191) UNIQUE NOT NULL, setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS watchlist (
  id BIGSERIAL PRIMARY KEY, symbol_code VARCHAR(50) UNIQUE NOT NULL REFERENCES symbols(code) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS drawings (
  id BIGSERIAL PRIMARY KEY, symbol_code VARCHAR(50) NOT NULL REFERENCES symbols(code) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL PRIMARY KEY, symbol_code VARCHAR(50) NOT NULL REFERENCES symbols(code) ON DELETE CASCADE,
  timeframe VARCHAR(20) NOT NULL DEFAULT '15M', signal_type VARCHAR(20) NOT NULL, score INTEGER NOT NULL,
  rating VARCHAR(20) NOT NULL, details_json JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY, symbol_code VARCHAR(50) NOT NULL REFERENCES symbols(code) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, condition_val NUMERIC(12,5) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_drawings_symbol ON drawings(symbol_code);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol_code);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol_active ON alerts(symbol_code, is_active);

INSERT INTO symbols (code, name, base_price, pip_size, type) VALUES
('EURUSD','Euro / US Dollar',1.08500,0.00010,'forex'), ('GBPUSD','British Pound / US Dollar',1.27200,0.00010,'forex'),
('USDJPY','US Dollar / Japanese Yen',154.50000,0.01000,'forex'), ('USDCHF','US Dollar / Swiss Franc',0.89800,0.00010,'forex'),
('USDCAD','US Dollar / Canadian Dollar',1.36500,0.00010,'forex'), ('AUDUSD','Australian Dollar / US Dollar',0.66200,0.00010,'forex'),
('NZDUSD','New Zealand Dollar / US Dollar',0.61200,0.00010,'forex'), ('XAUUSD','Gold / US Dollar',2380.00000,0.10000,'commodity'),
('XAGUSD','Silver / US Dollar',30.50000,0.01000,'commodity'), ('BTCUSD','Bitcoin / US Dollar',64500.00000,1.00000,'crypto'),
('ETHUSD','Ethereum / US Dollar',3480.00000,0.10000,'crypto'), ('DXY','US Dollar Index',104.80000,0.01000,'index')
ON CONFLICT (code) DO NOTHING;

INSERT INTO settings (setting_key, setting_value) VALUES
('theme','"dark"'), ('chartType','"CANDLESTICK"'), ('timezone','"UTC"'), ('defaultRiskPercent','1.0'), ('minConfluenceScore','70'),
('showCrtZones','true'), ('showFvgs','true'), ('showOrderBlocks','true'), ('showLiquiditySweeps','true'), ('showPwhPwl','true'), ('showPdhPdl','true'),
('showSignals','true'), ('showRiskReward','true'), ('enableSoundAlerts','true'), ('enableToastAlerts','true'), ('enableSignalAlerts','true'), ('enableCrtAlerts','true')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO watchlist (symbol_code) VALUES ('EURUSD'),('GBPUSD'),('XAUUSD'),('BTCUSD'),('DXY') ON CONFLICT (symbol_code) DO NOTHING;
