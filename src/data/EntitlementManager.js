/**
 * EntitlementManager.js — Client-Side Entitlement & Subscription Controller
 * Communicates with backend entitlement endpoints and Supabase to determine
 * whether the authenticated user has an active 3-day trial or active $49/mo subscription.
 */

import { ApiClient } from './apiClient.js';
import { AuthState } from '../auth.js';

class EntitlementManager {
  constructor() {
    this.entitlement = {
      isEntitled: true,
      status: 'SUBSCRIPTION_ACTIVE',
      accessState: 'SUBSCRIPTION_ACTIVE',
      planId: 'professional',
      planName: 'Professional',
      priceUsd: 49,
      entitlements: {
        plan: 'professional',
        signals: {
          all: true,
          allowedPairs: null,
          btcusd: true,
          eurusd: true,
          xauusd: true,
          xagusd: true
        },
        news: true,
        charts: true,
        marketWatch: true,
        tools: true,
        forexClasses: false,
        forexClassPdfs: false
      },
      daysRemaining: 0,
      hoursRemaining: 0,
      message: 'ArcadeFX Trading Intelligence Unlocked'
    };

    this.listeners = new Set();
  }

  async checkEntitlement() {
    try {
      const res = await ApiClient.fetchEntitlement();
      if (res && res.success && res.entitlement) {
        this.entitlement = {
          ...this.entitlement,
          ...res.entitlement
        };
      }
    } catch (err) {
      console.warn('[EntitlementManager] Entitlement fetch warning:', err);
    }

    this.notify();
    return this.entitlement;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this.entitlement); } catch (e) {}
    });
  }

  isUnlocked() {
    return !!this.entitlement?.isEntitled;
  }

  getStatus() {
    return this.entitlement?.status || 'SUBSCRIPTION_ACTIVE';
  }

  getPlanId() {
    return this.entitlement?.planId || this.entitlement?.entitlements?.plan || 'professional';
  }

  getPlanName() {
    return this.entitlement?.planName || 'Professional';
  }

  canAccessSignal(symbolCode) {
    if (!this.isUnlocked()) return false;
    const signalsConfig = this.entitlement?.entitlements?.signals;
    if (!signalsConfig) return true;
    if (signalsConfig.all) return true;

    const sym = String(symbolCode || '').toUpperCase().trim();
    if (Array.isArray(signalsConfig.allowedPairs)) {
      return signalsConfig.allowedPairs.includes(sym);
    }

    if (sym === 'BTCUSD') return !!signalsConfig.btcusd;
    if (sym === 'EURUSD') return !!signalsConfig.eurusd;
    return false;
  }

  canAccessForexClasses() {
    if (!this.isUnlocked()) return false;
    return !!this.entitlement?.entitlements?.forexClasses;
  }

  canAccessPdfs() {
    if (!this.isUnlocked()) return false;
    return !!this.entitlement?.entitlements?.forexClassPdfs;
  }

  getCountdownText() {
    if (this.entitlement?.status === 'VIP_LIFETIME') return 'VIP Lifetime Unlocked';
    if (this.entitlement?.status === 'TRIAL_ACTIVE' && this.entitlement?.daysRemaining != null) {
      return `3-Day Free Trial (${this.entitlement.daysRemaining}d left)`;
    }
    if (this.entitlement?.status === 'SUBSCRIPTION_ACTIVE') {
      return `Active Plan: ${this.getPlanName()}`;
    }
    if (this.entitlement?.status === 'TRIAL_EXPIRED') {
      return 'Subscription Required';
    }
    return '';
  }
}

export const entitlementManager = new EntitlementManager();
