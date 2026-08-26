-- ============================================================================
-- ARCADE FX — INSTITUTIONAL TRADING PLATFORM DATABASE SCHEMA (MySQL / MariaDB)
-- ============================================================================
-- Compatible with XAMPP / phpMyAdmin / MySQL 5.7+ & MySQL 8.0+ / MariaDB 10.3+
-- Engine: InnoDB
-- Default Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Target Database: arcade_fx
-- Generated: 2026-08-15
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `arcade_fx` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `arcade_fx`;

-- ----------------------------------------------------------------------------
-- 1. TABLE: symbols
-- Stores supported trading instruments, base prices, pip sizes, and market categories.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `watchlist`;
DROP TABLE IF EXISTS `drawings`;
DROP TABLE IF EXISTS `signals`;
DROP TABLE IF EXISTS `alerts`;
DROP TABLE IF EXISTS `symbols`;

CREATE TABLE `symbols` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `base_price` DECIMAL(12, 5) NOT NULL,
  `pip_size` DECIMAL(10, 5) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_symbols_code` (`code`),
  KEY `idx_symbols_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: 12 Default Trading Instruments
INSERT INTO `symbols` (`code`, `name`, `base_price`, `pip_size`, `type`) VALUES
('EURUSD', 'Euro / US Dollar', 1.08500, 0.00010, 'forex'),
('GBPUSD', 'British Pound / US Dollar', 1.27200, 0.00010, 'forex'),
('USDJPY', 'USD / Japanese Yen', 154.50000, 0.01000, 'forex'),
('USDCHF', 'USD / Swiss Franc', 0.89800, 0.00010, 'forex'),
('USDCAD', 'USD / Canadian Dollar', 1.36500, 0.00010, 'forex'),
('AUDUSD', 'Australian Dollar / US Dollar', 0.66200, 0.00010, 'forex'),
('NZDUSD', 'New Zealand Dollar / US Dollar', 0.61200, 0.00010, 'forex'),
('EURGBP', 'Euro / British Pound', 0.85300, 0.00010, 'forex'),
('EURJPY', 'Euro / Japanese Yen', 167.60000, 0.01000, 'forex'),
('GBPJPY', 'British Pound / Japanese Yen', 196.50000, 0.01000, 'forex'),
('XAUUSD', 'Gold / US Dollar', 2485.50000, 0.10000, 'commodity'),
('XAGUSD', 'Silver / US Dollar', 28.50000, 0.01000, 'commodity');

-- ----------------------------------------------------------------------------
-- 2. TABLE: settings
-- Stores system preferences, workspace themes, SMC overlays, and risk parameters.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(191) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Application Settings JSON
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('theme', '"dark"'),
('chartType', '"CANDLESTICK"'),
('timezone', '"UTC"'),
('defaultRiskPercent', '1.0'),
('minConfluenceScore', '70'),
('showCrtZones', 'true'),
('showFvgs', 'true'),
('showOrderBlocks', 'true'),
('showLiquiditySweeps', 'true'),
('showPwhPwl', 'true'),
('showPdhPdl', 'true'),
('showSignals', 'true'),
('showRiskReward', 'true'),
('enableSoundAlerts', 'true'),
('enableToastAlerts', 'true'),
('enableSignalAlerts', 'true'),
('enableCrtAlerts', 'true');

-- ----------------------------------------------------------------------------
-- 3. TABLE: watchlist
-- Stores user's pinned watchlist pairs.
-- ----------------------------------------------------------------------------
CREATE TABLE `watchlist` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `symbol_code` VARCHAR(50) NOT NULL,
  `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_watchlist_symbol` (`symbol_code`),
  CONSTRAINT `fk_watchlist_symbol` FOREIGN KEY (`symbol_code`) REFERENCES `symbols` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Watchlist Symbols
INSERT INTO `watchlist` (`symbol_code`) VALUES
('EURUSD'),
('GBPUSD'),
('XAUUSD'),
('BTCUSD'),
('DXY');

-- ----------------------------------------------------------------------------
-- 4. TABLE: drawings
-- Stores technical chart annotations (trendlines, Fibonacci levels, SMC boxes).
-- ----------------------------------------------------------------------------
CREATE TABLE `drawings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `symbol_code` VARCHAR(50) NOT NULL,
  `drawing_data` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_drawings_symbol` (`symbol_code`),
  CONSTRAINT `fk_drawings_symbol` FOREIGN KEY (`symbol_code`) REFERENCES `symbols` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABLE: signals
-- Stores 10-factor Smart Money Concepts (SMC) & 5AM CRT signal logs.
-- ----------------------------------------------------------------------------
CREATE TABLE `signals` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `symbol_code` VARCHAR(50) NOT NULL,
  `timeframe` VARCHAR(20) NOT NULL DEFAULT '15M',
  `signal_type` VARCHAR(20) NOT NULL,
  `score` INT NOT NULL,
  `rating` VARCHAR(20) NOT NULL,
  `details_json` LONGTEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_signals_symbol` (`symbol_code`),
  KEY `idx_signals_created` (`created_at`),
  KEY `idx_signals_score_rating` (`score`, `rating`),
  CONSTRAINT `fk_signals_symbol` FOREIGN KEY (`symbol_code`) REFERENCES `symbols` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Sample Verified Signals
INSERT INTO `signals` (`symbol_code`, `timeframe`, `signal_type`, `score`, `rating`, `details_json`) VALUES
('EURUSD', '15M', 'BULLISH', 85, 'Grade A+', '{"entry":1.0845,"sl":1.0825,"tp1":1.0875,"tp2":1.0900,"crtSweep":true,"dxyCorr":-0.85}'),
('XAUUSD', '15M', 'BULLISH', 90, 'Grade A+', '{"entry":2382.50,"sl":2372.50,"tp1":2395.00,"tp2":2410.00,"crtSweep":true,"dxyCorr":-0.88}'),
('GBPUSD', '15M', 'BEARISH', 75, 'Grade A', '{"entry":1.2740,"sl":1.2770,"tp1":1.2700,"tp2":1.2660,"crtSweep":false,"dxyCorr":-0.75}');

-- ----------------------------------------------------------------------------
-- 6. TABLE: alerts
-- Stores price alerts and 5AM CRT range triggers.
-- ----------------------------------------------------------------------------
CREATE TABLE `alerts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `symbol_code` VARCHAR(50) NOT NULL,
  `alert_type` VARCHAR(50) NOT NULL,
  `condition_val` DECIMAL(12, 5) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_alerts_symbol_active` (`symbol_code`, `is_active`),
  CONSTRAINT `fk_alerts_symbol` FOREIGN KEY (`symbol_code`) REFERENCES `symbols` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABLE: users
-- Stores trader account profiles and authentication roles.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL DEFAULT 'Arcade FX Trader',
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'trader',
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `email_verified` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Demo Trader Account
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`) VALUES
(1, 'Arcade FX Pro Trader', 'trader@arcadefx.io', '$2y$10$e.g.demo_secure_hash_placeholder_arcade_fx', 'trader', 'active');

-- ----------------------------------------------------------------------------
-- 8. TABLE: subscriptions
-- Stores active memberships, 3-Day Free Trial records, and renewal dates.
-- ----------------------------------------------------------------------------
CREATE TABLE `subscriptions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `plan_name` VARCHAR(100) NOT NULL DEFAULT '3-Day Free Trial',
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `start_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` DATETIME NULL,
  `payment_reference` VARCHAR(100) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_subscriptions_user` (`user_id`),
  KEY `idx_subscriptions_status` (`status`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Default Active Subscription
INSERT INTO `subscriptions` (`user_id`, `plan_name`, `status`, `expiry_date`, `payment_reference`) VALUES
(1, 'Institutional Pro Trader', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), 'SUB-ARCADE-FX-PRO-9988');

-- ----------------------------------------------------------------------------
-- 9. TABLE: payments
-- Stores payment gateway transactions (Kora / Card / Crypto).
-- ----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `transaction_reference` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'success',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_payments_ref` (`transaction_reference`),
  KEY `idx_payments_user` (`user_id`),
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data: Sample Transaction Audit Log
INSERT INTO `payments` (`user_id`, `transaction_reference`, `amount`, `currency`, `payment_status`) VALUES
(1, 'TXN-KORA-ARCADE-7788', 49.00, 'USD', 'success');

-- ============================================================================
-- END OF ARCADE FX DATABASE SCHEMA FILE
-- ============================================================================
