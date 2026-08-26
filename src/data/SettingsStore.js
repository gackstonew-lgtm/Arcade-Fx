/**
 * SettingsStore.js — Centralized Settings Store & localStorage persistence
 * Handles user preferences, theme selection (light/dark/system), strategy toggles, audio alerts, and event notifications.
 */

const SETTINGS_KEY = 'arcadefx_user_settings';

const DEFAULT_SETTINGS = {
  // Appearance & Theme
  theme: 'system', // 'light' | 'dark' | 'system'
  accentColor: 'blue',

  // General & Timezone
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',

  // Chart Display & Overlays
  chartType: 'CANDLESTICK',
  showCrosshair: true,
  showGridlines: true,
  showVolume: true,
  showCorrelation: true,
  showPwhPwl: true,
  showPdhPdl: true,
  showCrtZones: true,
  showFvgs: true,
  showOrderBlocks: true,
  showLiquiditySweeps: true,
  showSignals: true,
  showRiskReward: true,

  // Strategy Parameters (SMC & 5AM CRT)
  crtHourUTC: 5, // 5 AM UTC 4H candle
  fvgThresholdPips: 2.0,
  minConfluenceScore: 50,
  highConfluenceScore: 85,
  defaultRiskPercent: 1.0, // 1% of equity

  // Notifications & Audio
  enableSoundAlerts: true,
  enableToastAlerts: true,
  enableSignalAlerts: true,
  enableCrtAlerts: true,
  alertVolume: 80,

  // Trader Profile
  traderName: 'Trader',
  traderEmail: 'trader@arcadefx.io',
  accountStatus: 'Active • Verified',
  marketFeedStatus: '🟢 Live Institutional Market Feed',

  // Privacy & Data
  localDataOnly: true,
  autoSaveWorkspace: true
};

import { ApiClient } from './apiClient.js';

class SettingsStore {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.load();
    this.syncWithBackend();
  }

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.applyTheme();
  }

  async syncWithBackend() {
    try {
      const res = await ApiClient.fetchSettings();
      if (res.success && res.settings && Object.keys(res.settings).length > 0) {
        this.settings = { ...this.settings, ...res.settings };
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        }
        this.applyTheme();
        this.notify();
      }
    } catch (e) {
      // Non-fatal sync fallback
    }
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      }
      ApiClient.saveSettings(this.settings).catch(() => {});
    } catch (e) {
      // Non-fatal
    }
    this.applyTheme();
    this.notify();
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  update(updates) {
    this.settings = { ...this.settings, ...updates };
    this.save();
  }

  resetToDefaults() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }

  resolveEffectiveTheme() {
    if (this.settings.theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return this.settings.theme;
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const effectiveTheme = this.resolveEffectiveTheme();
    if (effectiveTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body?.classList?.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body?.classList?.remove('dark');
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.settings);
      } catch (err) {
        console.error('Error in settings listener:', err);
      }
    }
  }
}

export const settingsStore = new SettingsStore();
