/**
 * apiClient.js — Arcade FX Netlify API client.
 *
 * Production market/signal data is served by Netlify Functions, which proxy
 * the BM Forex VPS signal engine server-side. No upstream market API keys
 * are exposed to browser JavaScript.
 */

import { getSupabase } from '../supabase.js';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.ARCADEFX_CONFIG?.apiBaseUrl) return window.ARCADEFX_CONFIG.apiBaseUrl;
    if (window.ARCADEFX_PHP_CONFIG?.apiBaseUrl) return window.ARCADEFX_PHP_CONFIG.apiBaseUrl;
    if (window.location?.origin && window.location.origin.startsWith('http')) {
      return `${window.location.origin}/api`;
    }
  }
  return 'https://arcadefx.live/api';
};

export class ApiClient {
  static async request(endpoint, options = {}) {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${baseUrl}/${cleanEndpoint}`;

    const defaultHeaders = {
      Accept: 'application/json'
    };

    const config = {
      cache: 'no-store',
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    if (!config.headers.Authorization && !config.headers.authorization) {
      try {
        const supabase = getSupabase();
        if (supabase?.auth) {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (e) {}
    }

    if (config.body && typeof config.body === 'object') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }

    try {
      let response = await fetch(url, config);

      if ((!response.ok || response.status === 404) && !url.startsWith('https://arcadefx.live')) {
        const fallbackUrl = `https://arcadefx.live/api/${cleanEndpoint}`;
        try {
          const fallbackRes = await fetch(fallbackUrl, config);
          if (fallbackRes.ok) {
            response = fallbackRes;
          }
        } catch (fErr) {
          console.warn('[ApiClient] Fallback request to arcadefx.live warning:', fErr.message);
        }
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        const snippet = text.substring(0, 120).trim();
        const isHtml = snippet.startsWith('<!DOCTYPE') || snippet.startsWith('<html');
        return {
          success: false,
          error: isHtml ? 'Server returned HTML error page' : 'Server returned non-JSON payload',
          status: response.status,
          isOffline: true
        };
      }

      if (!response.ok) {
        return {
          ...(payload || {}),
          success: false,
          error: payload?.error || `HTTP ${response.status}`,
          status: response.status,
          isOffline: true
        };
      }

      if (!contentType.includes('application/json') && payload === null) {
        return {
          success: false,
          error: 'Server returned non-JSON payload',
          isOffline: true
        };
      }

      return payload;
    } catch (err) {
      console.warn(`[ApiClient] Request to ${endpoint} failed:`, err.message);
      return { success: false, error: err.message, isOffline: true };
    }
  }

  static async checkHealth() {
    return this.request('health');
  }

  static async fetchSettings() {
    return this.request('settings');
  }

  static async saveSettings(settingsObj) {
    return this.request('settings', {
      method: 'POST',
      body: settingsObj
    });
  }

  static async fetchSymbols() {
    return this.request('market-data?action=symbols');
  }

  static async fetchHistory(symbol = 'EURUSD', tf = 15, count = 120) {
    return this.request(`market-data?action=history&symbol=${encodeURIComponent(symbol)}&tf=${tf}&count=${count}`);
  }

  static async fetchLivePrices() {
    return this.request('market-data?action=prices');
  }

  static async fetchSignals(symbol = null) {
    const query = symbol ? `?symbol=${encodeURIComponent(symbol)}` : '';
    return this.request(`signals${query}`);
  }

  static async rescanSignals() {
    return this.request('signals?action=rescan', { method: 'POST' });
  }

  static async fetchWatchlist() {
    return this.request('watchlist');
  }

  static async addToWatchlist(symbolCode) {
    return this.request('watchlist', {
      method: 'POST',
      body: { symbol_code: symbolCode }
    });
  }

  static async removeFromWatchlist(symbolCode) {
    return this.request(`watchlist?symbol=${encodeURIComponent(symbolCode)}`, {
      method: 'DELETE'
    });
  }

  static async fetchDrawings(symbolCode = 'EURUSD') {
    return this.request(`drawings?symbol=${encodeURIComponent(symbolCode)}`);
  }

  static async saveDrawings(symbolCode, drawingsArray) {
    return this.request('drawings', {
      method: 'POST',
      body: { symbol_code: symbolCode, drawings: drawingsArray }
    });
  }

  static async fetchAlerts() {
    return this.request('alerts');
  }

  static async createAlert(alertData) {
    return this.request('alerts', {
      method: 'POST',
      body: alertData
    });
  }

  static async deleteAlert(id) {
    return this.request(`alerts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  static async fetchNewsCalendar() {
    return this.request('news');
  }

  static async fetchEntitlement() {
    return this.request('entitlement');
  }

  static async fetchReferrals() {
    return this.request('referrals');
  }

  static async applyReferralCode(code) {
    return this.request('referrals', {
      method: 'POST',
      body: { referral_code: code }
    });
  }
}
