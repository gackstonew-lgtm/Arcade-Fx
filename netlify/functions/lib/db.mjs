import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;
let pool;
let supabaseAdmin;

const DEFAULT_SUPABASE_URL = 'https://ykkzfnrndlatvpfsnurk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlra3pmbnJuZGxhdHZwZnNudXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTMzNzUsImV4cCI6MjEwMjUyOTM3NX0.DPp9s3o1MQtGoVC52GR-woEJszvvRlQntz-6j7usBJw';

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  if (url && key) {
    supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false }
    });
    return supabaseAdmin;
  }
  return null;
}

export function database() {
  if (process.env.DATABASE_URL) {
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 1
      });
    }
    return pool;
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    return createSupabaseDbAdapter(supabase);
  }

  throw new Error('Neither DATABASE_URL nor SUPABASE_URL is configured');
}

function createSupabaseDbAdapter(supabase) {
  return {
    isSupabase: true,
    supabase,
    async connect() {
      return {
        query: (text, params) => this.query(text, params),
        release: () => {}
      };
    },
    async query(text, params = []) {
      const cleanSql = text.trim();
      
      // Handle profiles queries
      if (cleanSql.toLowerCase().includes('from profiles') || cleanSql.toLowerCase().includes('into profiles') || cleanSql.toLowerCase().includes('update profiles')) {
        if (cleanSql.startsWith('SELECT referral_code FROM profiles WHERE id =')) {
          const { data, error } = await supabase.from('profiles').select('referral_code').eq('id', params[0]);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('SELECT id FROM profiles WHERE referral_code =')) {
          const { data, error } = await supabase.from('profiles').select('id').eq('referral_code', params[0]);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('SELECT id, email FROM profiles WHERE referral_code =')) {
          const { data, error } = await supabase.from('profiles').select('id, email').eq('referral_code', params[0]);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('SELECT id FROM profiles WHERE email =')) {
          const { data, error } = await supabase.from('profiles').select('id').eq('email', params[0]);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('FROM profiles WHERE id = $1 OR LOWER(email) = $2')) {
          let q = supabase.from('profiles').select('*');
          if (params[0] && params[1]) {
            q = q.or(`id.eq.${params[0]},email.ilike.${params[1]}`);
          } else if (params[0]) {
            q = q.eq('id', params[0]);
          } else if (params[1]) {
            q = q.ilike('email', params[1]);
          }
          const { data, error } = await q;
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('UPDATE profiles SET referral_code =')) {
          const { data, error } = await supabase.from('profiles').update({ referral_code: params[0], updated_at: new Date().toISOString() }).eq('id', params[1]).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('UPDATE profiles SET referred_by_id =')) {
          const { data, error } = await supabase.from('profiles').update({ referred_by_id: params[0], updated_at: new Date().toISOString() }).eq('id', params[1]).is('referred_by_id', null).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('UPDATE profiles') && cleanSql.includes('subscription_status =')) {
          const { data, error } = await supabase.from('profiles').update({
            subscription_status: 'active',
            plan_name: params[0],
            subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }).or(`id.eq.${params[1]},email.eq.${params[2]}`).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
      }

      // Handle referrals queries
      if (cleanSql.toLowerCase().includes('referrals')) {
        if (cleanSql.includes('SELECT id FROM referrals WHERE referred_user_id =')) {
          const { data, error } = await supabase.from('referrals').select('id').eq('referred_user_id', params[0]);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('INSERT INTO referrals')) {
          const { data, error } = await supabase.from('referrals').insert({
            referrer_user_id: params[0],
            referred_user_id: params[1],
            referral_code: params[2],
            status: 'PENDING'
          }).select();
          if (error && !error.message?.includes('duplicate key')) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('SELECT id, referrer_user_id, referral_code FROM referrals')) {
          const { data, error } = await supabase.from('referrals').select('id, referrer_user_id, referral_code').eq('referred_user_id', params[0]).eq('status', 'PENDING');
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('UPDATE referrals')) {
          const { data, error } = await supabase.from('referrals').update({
            status: 'QUALIFIED',
            subscription_plan: params[0] || 'Pro SMC Trader',
            subscription_amount: params[1] || 49.00,
            currency: params[2] || 'USD',
            qualified_at: new Date().toISOString()
          }).eq('id', params[3]).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('COUNT(*)') && cleanSql.includes('FROM referrals')) {
          const { data: allData, error: errAll } = await supabase.from('referrals').select('id, status').eq('referrer_user_id', params[0]);
          if (errAll) throw errAll;
          const total = allData ? allData.length : 0;
          const pending = allData ? allData.filter(r => r.status === 'PENDING').length : 0;
          const successful = allData ? allData.filter(r => r.status === 'QUALIFIED').length : 0;
          return { rows: [{ total, pending, successful }], rowCount: 1 };
        }
        if (cleanSql.includes('SELECT') && cleanSql.includes('FROM referrals WHERE referrer_user_id =')) {
          const { data, error } = await supabase.from('referrals').select('id, status, subscription_plan, subscription_amount, created_at, qualified_at').eq('referrer_user_id', params[0]).order('created_at', { ascending: false }).limit(50);
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
      }

      // Handle settings queries
      if (cleanSql.toLowerCase().includes('settings')) {
        if (cleanSql.startsWith('SELECT setting_key, setting_value FROM settings')) {
          const { data, error } = await supabase.from('settings').select('setting_key, setting_value');
          if (error) return { rows: [], rowCount: 0 };
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('INSERT INTO settings')) {
          const { data, error } = await supabase.from('settings').upsert({
            setting_key: params[0],
            setting_value: JSON.parse(params[1]),
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' }).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
      }

      // Handle subscriptions queries
      if (cleanSql.toLowerCase().includes('subscriptions')) {
        if (cleanSql.includes('SELECT status, current_period_end, plan_id FROM subscriptions')) {
          const { data, error } = await supabase.from('subscriptions').select('status, current_period_end, plan_id').eq('user_id', params[0]).in('status', ['active', 'trialing']).order('created_at', { ascending: false }).limit(1);
          if (error) return { rows: [], rowCount: 0 };
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
      }

      // Handle wallet_transactions queries
      if (cleanSql.toLowerCase().includes('wallet_transactions')) {
        if (cleanSql.includes('SELECT * FROM wallet_transactions WHERE reference =') || cleanSql.includes('SELECT status, receipt_number')) {
          const { data, error } = await supabase.from('wallet_transactions').select('*').eq('reference', params[0]);
          if (error) return { rows: [], rowCount: 0 };
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('UPDATE wallet_transactions SET status = \'completed\'')) {
          const { data, error } = await supabase.from('wallet_transactions').update({
            status: 'completed',
            receipt_number: params[0],
            updated_at: new Date().toISOString()
          }).eq('reference', params[1]).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.includes('UPDATE wallet_transactions SET status = \'failed\'')) {
          const { data, error } = await supabase.from('wallet_transactions').update({
            status: 'failed',
            updated_at: new Date().toISOString()
          }).eq('reference', params[0]).select();
          if (error) throw error;
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
      }

      // Handle symbols queries (health check)
      if (cleanSql.toLowerCase().includes('symbols')) {
        const { count, error } = await supabase.from('symbols').select('*', { count: 'exact', head: true });
        if (error) return { rows: [{ symbol_count: 0 }], rowCount: 1 };
        return { rows: [{ symbol_count: count || 0 }], rowCount: 1 };
      }

      // Handle watchlist queries
      if (cleanSql.toLowerCase().includes('watchlist')) {
        if (cleanSql.startsWith('DELETE FROM watchlist')) {
          const { error } = await supabase.from('watchlist').delete().eq('symbol_code', params[0]);
          if (error) throw error;
          return { rows: [], rowCount: 1 };
        }
        if (cleanSql.startsWith('INSERT INTO watchlist')) {
          const { data, error } = await supabase.from('watchlist').upsert({ symbol_code: params[0] }, { onConflict: 'symbol_code' }).select();
          if (error) throw error;
          return { rows: data || [], rowCount: 1 };
        }
      }

      // Handle drawings queries
      if (cleanSql.toLowerCase().includes('drawings')) {
        if (cleanSql.startsWith('SELECT drawing_data FROM drawings')) {
          const { data, error } = await supabase.from('drawings').select('drawing_data').eq('symbol_code', params[0]).order('updated_at', { ascending: false }).limit(1);
          if (error) return { rows: [], rowCount: 0 };
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('INSERT INTO drawings')) {
          const { data, error } = await supabase.from('drawings').insert({
            symbol_code: params[0],
            drawing_data: JSON.parse(params[1])
          }).select();
          if (error) throw error;
          return { rows: data || [], rowCount: 1 };
        }
      }

      // Handle alerts queries
      if (cleanSql.toLowerCase().includes('alerts')) {
        if (cleanSql.startsWith('SELECT * FROM alerts')) {
          const { data, error } = await supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false });
          if (error) return { rows: [], rowCount: 0 };
          return { rows: data || [], rowCount: data ? data.length : 0 };
        }
        if (cleanSql.startsWith('UPDATE alerts SET is_active = FALSE')) {
          const { error } = await supabase.from('alerts').update({ is_active: false }).eq('id', params[0]);
          if (error) throw error;
          return { rows: [], rowCount: 1 };
        }
        if (cleanSql.startsWith('INSERT INTO alerts')) {
          const { data, error } = await supabase.from('alerts').insert({
            symbol_code: params[0],
            alert_type: params[1],
            condition_val: params[2],
            is_active: true
          }).select('id');
          if (error) throw error;
          return { rows: data || [{ id: Date.now() }], rowCount: 1 };
        }
      }

      // Default safe empty response
      return { rows: [], rowCount: 0 };
    }
  };
}
