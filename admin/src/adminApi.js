/**
 * Arcade FX — Administrator API Client (`admin/src/adminApi.js`)
 * Manages JWT authorization tokens, session storage, error handling,
 * automatic session expiration, and requests to /api/admin/* endpoints.
 */

const getAdminApiBaseUrl = () => {
  let raw = '';
  if (typeof window !== 'undefined' && window.ARCADEFX_ADMIN_CONFIG?.apiBaseUrl) {
    raw = window.ARCADEFX_ADMIN_CONFIG.apiBaseUrl;
  }
  
  if (!raw) {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('admin') || window.location.hostname.includes('netlify'))) {
      raw = 'https://arcadefx.live/api/admin';
    } else {
      raw = '/api/admin';
    }
  }

  if (!raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('/')) {
    raw = '/' + raw;
  }
  return raw.replace(/\/+$/, '');
};

const TOKEN_STORAGE_KEY = 'arcadefx_admin_token';
const USER_STORAGE_KEY = 'arcadefx_admin_user';

export class AdminApiClient {
  static getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }

  static setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  static clearSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  static getUser() {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated() {
    return Boolean(this.getToken());
  }

  static async request(endpoint, options = {}) {
    const baseUrl = getAdminApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    let url = `${baseUrl}/${cleanEndpoint}`;

    const token = this.getToken();
    const defaultHeaders = {
      Accept: 'application/json'
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const config = {
      cache: 'no-store',
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    if (config.body && typeof config.body === 'object') {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }

    try {
      let response = await fetch(url, config);

      // Automatic Failover: If local subdomain endpoint returns 404, retry against main backend https://arcadefx.live/api/admin
      if (response.status === 404 && !url.startsWith('https://arcadefx.live')) {
        const fallbackUrl = `https://arcadefx.live/api/admin/${cleanEndpoint}`;
        try {
          const fallbackRes = await fetch(fallbackUrl, config);
          if (fallbackRes.ok || fallbackRes.status !== 404) {
            response = fallbackRes;
          }
        } catch (fErr) {
          console.warn('[AdminApiClient] Fallback backend fetch warning:', fErr.message);
        }
      }

      const text = await response.text();

      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        let errorMsg = `Server responded with HTTP ${response.status}`;
        if (response.status === 404) {
          errorMsg = `API Endpoint '${cleanEndpoint}' not found (404). Verify Netlify serverless deployment.`;
        } else if (response.status === 500) {
          errorMsg = `Server error (500) processing '${cleanEndpoint}'.`;
        }
        return {
          success: false,
          error: errorMsg,
          status: response.status
        };
      }

      if (response.status === 401 || response.status === 403) {
        console.warn(`[AdminApiClient] Session invalid or forbidden (${response.status})`);
        if (!options.skipAuthRedirect && !window.location.pathname.endsWith('login.html')) {
          this.clearSession();
          window.location.href = 'login.html?expired=1';
        }
        return {
          ...(payload || {}),
          success: false,
          error: payload?.error || (response.status === 403 ? 'Forbidden - Administrator privileges required' : 'Administrator session expired or unauthorized'),
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          ...(payload || {}),
          success: false,
          error: payload?.error || `HTTP Error ${response.status}`,
          status: response.status
        };
      }

      return payload;
    } catch (err) {
      console.error(`[AdminApiClient] Network error requesting ${endpoint}:`, err);
      return { success: false, error: err.message || 'Network error' };
    }
  }

  // Admin login helper
  static async login(email, password) {
    try {
      const supabaseUrl = window.ARCADEFX_ADMIN_CONFIG?.supabaseUrl || 'https://ykkzfnrndlatvpfsnurk.supabase.co';
      const anonKey = window.ARCADEFX_ADMIN_CONFIG?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlra3pmbnJuZGxhdHZwZnNudXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTMzNzUsImV4cCI6MjEwMjUyOTM3NX0.DPp9s3o1MQtGoVC52GR-woEJszvvRlQntz-6j7usBJw';

      const cleanSupabaseUrl = supabaseUrl.trim().replace(/\/+$/, '');

      const authRes = await fetch(`${cleanSupabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey
        },
        body: JSON.stringify({ email, password })
      });

      const authData = await authRes.json();
      if (!authRes.ok || !authData.access_token) {
        return {
          success: false,
          error: authData.error_description || authData.msg || 'Invalid administrator email or password'
        };
      }

      const token = authData.access_token;
      const user = authData.user;

      // Verify administrator permissions with serverless backend
      this.setSession(token, user);

      const checkRes = await this.request('settings', { skipAuthRedirect: true });
      if (!checkRes.success) {
        this.clearSession();
        return {
          success: false,
          error: checkRes.error || 'User authenticated but does not possess administrator privileges'
        };
      }

      return { success: true, user: checkRes.adminProfile || user, token };
    } catch (err) {
      return { success: false, error: err.message || 'Login request failed' };
    }
  }

  static async fetchOverview() {
    return this.request('overview');
  }

  static async fetchUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`users${query ? '?' + query : ''}`);
  }

  static async executeUserAction(userId, action, extra = {}) {
    return this.request('users', {
      method: 'POST',
      body: { user_id: userId, action, ...extra }
    });
  }

  static async fetchPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`payments${query ? '?' + query : ''}`);
  }

  static async fetchSubscriptions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`subscriptions${query ? '?' + query : ''}`);
  }

  static async executeSubscriptionAction(userId, action, extra = {}) {
    return this.request('subscriptions', {
      method: 'POST',
      body: { user_id: userId, action, ...extra }
    });
  }

  static async fetchNotifications() {
    return this.request('notifications');
  }

  static async sendNotification(data) {
    return this.request('notifications', {
      method: 'POST',
      body: data
    });
  }

  static async fetchEmailLogs() {
    return this.request('emails');
  }

  static async sendEmail(data) {
    return this.request('emails', {
      method: 'POST',
      body: data
    });
  }

  static async fetchClasses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`classes${query ? '?' + query : ''}`);
  }

  static async createClass(classData) {
    return this.request('classes', {
      method: 'POST',
      body: classData
    });
  }

  static async updateClass(classData) {
    return this.request('classes', {
      method: 'PUT',
      body: classData
    });
  }

  static async deleteClass(classId) {
    return this.request(`classes?id=${encodeURIComponent(classId)}`, {
      method: 'DELETE'
    });
  }

  static async fetchAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`audit-logs${query ? '?' + query : ''}`);
  }

  static async fetchSettings() {
    return this.request('settings');
  }

  static async saveSettings(settingsData) {
    return this.request('settings', {
      method: 'POST',
      body: settingsData
    });
  }
}
