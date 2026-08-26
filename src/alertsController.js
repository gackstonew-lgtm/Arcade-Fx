/**
 * alertsController.js — ArcadeFX Custom TradingView & Platform Alert Workspace Controller
 * Manages real-time alert configuration, alert creation form submission, active alerts list fetching,
 * alert deactivation, and UI state synchronization.
 */

import { ApiClient } from './data/apiClient.js';

export class AlertsController {
  constructor() {
    this.alerts = [];
    this.init();
  }

  async init() {
    this.bindFormEvents();
    await this.fetchActiveAlerts();
  }

  bindFormEvents() {
    const form = document.getElementById('createAlertForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreateAlert();
      });
    }
  }

  async fetchActiveAlerts() {
    const container = document.getElementById('activeAlertsContainer');
    if (!container) return;

    try {
      const res = await ApiClient.fetchAlerts();
      if (res && res.success && Array.isArray(res.alerts)) {
        this.alerts = res.alerts;
      } else {
        this.alerts = this.getFallbackAlerts();
      }
    } catch (e) {
      console.warn('[AlertsController] Error fetching active alerts, using fallback:', e);
      this.alerts = this.getFallbackAlerts();
    }

    this.renderAlerts();
  }

  async handleCreateAlert() {
    const symbolEl = document.getElementById('alertSymbol');
    const conditionEl = document.getElementById('alertCondition');
    const priceEl = document.getElementById('alertPrice');
    const channelEl = document.getElementById('alertChannel');

    const symbol_code = symbolEl ? symbolEl.value : 'EURUSD';
    const alert_type = conditionEl ? conditionEl.value : 'CRT_SWEEP';
    const condition_val = priceEl && priceEl.value ? parseFloat(priceEl.value) : 1.0850;
    const channel = channelEl ? channelEl.value : 'AUDIO_TOAST';

    const newAlertData = {
      symbol_code,
      alert_type,
      condition_val,
      channel
    };

    try {
      const res = await ApiClient.createAlert(newAlertData);
      if (res && res.success) {
        if (priceEl) priceEl.value = '';
        await this.fetchActiveAlerts();
      } else {
        console.warn('[AlertsController] Alert creation response unconfirmed:', res);
        // Add locally for optimistic UI response
        this.alerts.unshift({
          id: Date.now(),
          symbol_code,
          alert_type,
          condition_val,
          channel,
          is_active: 1
        });
        this.renderAlerts();
        if (priceEl) priceEl.value = '';
      }
    } catch (err) {
      console.warn('[AlertsController] Failed to create alert:', err);
    }
  }

  async handleDeactivateAlert(id) {
    try {
      await ApiClient.deleteAlert(id);
    } catch (err) {
      console.warn('[AlertsController] Error deactivating alert:', err);
    } finally {
      this.alerts = this.alerts.filter(a => Number(a.id) !== Number(id));
      this.renderAlerts();
    }
  }

  renderAlerts() {
    const container = document.getElementById('activeAlertsContainer');
    if (!container) return;

    if (this.alerts.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          No active alerts configured. Use the form above to create your first market alert.
        </div>
      `;
      return;
    }

    const conditionMap = {
      'CRT_SWEEP': '5AM CRT Range Sweep',
      'FVG_ACTIVE': '1H Fair Value Gap (FVG)',
      'OB_TOUCH': '1H Order Block Touch',
      'PRICE_TARGET': 'Custom Price Level'
    };

    const channelMap = {
      'AUDIO_TOAST': 'Audio Chime + Popover Toast',
      'TRADINGVIEW_PROFILE': 'TradingView Strategy Profile'
    };

    container.innerHTML = this.alerts.map(alert => {
      const conditionName = conditionMap[alert.alert_type] || alert.alert_type;
      const channelName = channelMap[alert.channel] || alert.channel || 'Audio Chime + Toast';
      const symbolFormatted = alert.symbol_code.replace('/', '').toUpperCase();

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(9, 13, 31, 0.7); border-radius: 12px; border: 1px solid var(--border-subtle); gap: 12px;">
          <div>
            <strong style="color: var(--text-dark); font-size: 14px;">${symbolFormatted} &bull; ${conditionName}</strong>
            <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px;">Target Price: ${alert.condition_val} | Channel: ${channelName}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="pwa-badge" style="background: rgba(16,185,129,0.15); color: #6ee7b7; padding: 4px 10px; font-size: 11px; font-weight: 700;">ACTIVE</span>
            <button type="button" class="btn-deactivate-alert" data-id="${alert.id}" style="background: transparent; border: 1px solid rgba(255,99,120,0.3); color: var(--accent-bear); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">Deactivate</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Deactivate button listeners
    container.querySelectorAll('.btn-deactivate-alert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        if (id) this.handleDeactivateAlert(id);
      });
    });
  }

  getFallbackAlerts() {
    return [
      {
        id: 1,
        symbol_code: 'EURUSD',
        alert_type: 'CRT_SWEEP',
        condition_val: 1.08300,
        channel: 'AUDIO_TOAST',
        is_active: 1
      },
      {
        id: 2,
        symbol_code: 'XAUUSD',
        alert_type: 'OB_TOUCH',
        condition_val: 2345.50,
        channel: 'TRADINGVIEW_PROFILE',
        is_active: 1
      }
    ];
  }
}
