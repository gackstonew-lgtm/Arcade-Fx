-- Arcade FX — Database Schema Migration File (MySQL / MariaDB & phpMyAdmin Compatible)
-- Target Engine: InnoDB | Default Charset: utf8mb4

CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(191) UNIQUE NOT NULL,
    `setting_value` LONGTEXT NOT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `symbols` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) UNIQUE NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `base_price` DECIMAL(12, 5) NOT NULL,
    `pip_size` DECIMAL(10, 5) NOT NULL,
    `type` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `watchlist` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `symbol_code` VARCHAR(50) UNIQUE NOT NULL,
    `added_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `drawings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `symbol_code` VARCHAR(50) NOT NULL,
    `drawing_data` LONGTEXT NOT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `signals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `symbol_code` VARCHAR(50) NOT NULL,
    `timeframe` VARCHAR(20) NOT NULL DEFAULT '15M',
    `signal_type` VARCHAR(20) NOT NULL,
    `score` INT NOT NULL,
    `rating` VARCHAR(20) NOT NULL,
    `details_json` LONGTEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `alerts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `symbol_code` VARCHAR(50) NOT NULL,
    `alert_type` VARCHAR(50) NOT NULL,
    `condition_val` DECIMAL(12, 5) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Ticker Symbols Insertion
INSERT IGNORE INTO `symbols` (`code`, `name`, `base_price`, `pip_size`, `type`) VALUES
('EURUSD', 'Euro / US Dollar', 1.0850, 0.0001, 'forex'),
('GBPUSD', 'British Pound / US Dollar', 1.2720, 0.0001, 'forex'),
('USDJPY', 'USD / Japanese Yen', 154.50, 0.01, 'forex'),
('USDCHF', 'USD / Swiss Franc', 0.8980, 0.0001, 'forex'),
('USDCAD', 'USD / Canadian Dollar', 1.3650, 0.0001, 'forex'),
('AUDUSD', 'Australian Dollar / US Dollar', 0.6620, 0.0001, 'forex'),
('NZDUSD', 'New Zealand Dollar / US Dollar', 0.6120, 0.0001, 'forex'),
('EURGBP', 'Euro / British Pound', 0.8530, 0.0001, 'forex'),
('EURJPY', 'Euro / Japanese Yen', 167.60, 0.01, 'forex'),
('GBPJPY', 'British Pound / Japanese Yen', 196.50, 0.01, 'forex'),
('XAUUSD', 'Gold / US Dollar', 2485.50, 0.1, 'commodity'),
('XAGUSD', 'Silver / US Dollar', 28.50, 0.01, 'commodity');
