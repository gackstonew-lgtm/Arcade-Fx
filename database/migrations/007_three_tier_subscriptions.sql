-- Arcade FX Migration 007: 3-Tier Subscriptions ($15 Essential, $49 Professional, $149 Elite)

-- Update profiles table default subscription_plan_id
ALTER TABLE profiles ALTER COLUMN subscription_plan_id SET DEFAULT 'professional';

-- Ensure subscriptions table has plan_id index and plan verification constraints
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- Update plan names for legacy pro entries to professional
UPDATE profiles SET subscription_plan_id = 'professional' WHERE subscription_plan_id IN ('pro', 'arcadefx-pro');
UPDATE subscriptions SET plan_id = 'professional' WHERE plan_id IN ('pro', 'arcadefx-pro');
