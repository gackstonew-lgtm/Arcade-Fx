-- Arcade FX Database Migration 003: Admin Dashboard, Live Classes, Subscriptions, Notifications & Audit Logs

-- 1. Add admin role, account status, and subscription fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) NOT NULL DEFAULT 'Free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) NOT NULL DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Assign Permanent Administrator Privileges to gackstoneb@gmail.com and admin@arcadefx.live
UPDATE profiles
SET role = 'admin', status = 'active', subscription_plan = 'VIP', subscription_status = 'active'
WHERE LOWER(email) IN ('gackstoneb@gmail.com', 'admin@arcadefx.live');

-- 2. Subscriptions Management Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL DEFAULT 'Pro',
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, trial, expired, cancelled, inactive
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly, lifetime
  price_usd NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiration_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Targeted Platform Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'info', -- info, warning, success, alert
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all', -- all, subscribers, free, pro, vip, expired, class_registrants
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_url TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'sent', -- draft, scheduled, sent, cancelled
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Inbox Notifications Delivery Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id BIGINT REFERENCES notifications(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'info',
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Email Dispatch Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGSERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent', -- pending, sent, failed
  scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Live Trading Classes Table
CREATE TABLE IF NOT EXISTS live_classes (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_name VARCHAR(191) NOT NULL DEFAULT 'Arcade FX Master Trader',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  meeting_url TEXT,
  capacity INTEGER DEFAULT 100,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- draft, scheduled, live, completed, cancelled
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Live Class User Registrations Table
CREATE TABLE IF NOT EXISTS live_class_registrations (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(class_id, user_id)
);

-- 8. Admin Security Audit Trail Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL, -- user, subscription, payment, notification, class, system
  target_id VARCHAR(100),
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  status VARCHAR(30) NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_user_notif_user ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_classes_start ON live_classes(start_time);
CREATE INDEX IF NOT EXISTS idx_class_reg_class ON live_class_registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
