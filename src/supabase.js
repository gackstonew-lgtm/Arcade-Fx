/**
 * Arcade FX — Supabase Client Initialization (src/supabase.js)
 * Provides centralized Supabase Auth, Database & Realtime client.
 *
 * Project URL: https://ykkzfnrndlatvpfsnurk.supabase.co
 */

const DEFAULT_SUPABASE_URL = 'https://ykkzfnrndlatvpfsnurk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlra3pmbnJuZGxhdHZwZnNudXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTMzNzUsImV4cCI6MjEwMjUyOTM3NX0.DPp9s3o1MQtGoVC52GR-woEJszvvRlQntz-6j7usBJw';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  let rawUrl = window.ARCADEFX_CONFIG?.supabaseUrl || DEFAULT_SUPABASE_URL;
  // Clean URL to ensure base format without trailing slashes or /rest/v1/ suffix
  let cleanUrl = rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');

  const anonKey = window.ARCADEFX_CONFIG?.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

  if (window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(cleanUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return supabaseClient;
  }

  console.warn('[Supabase] CDN SDK not preloaded on window; creating fallback client structure.');
  return null;
}

export function isSupabaseConfigured() {
  return Boolean(window.supabase?.createClient);
}
