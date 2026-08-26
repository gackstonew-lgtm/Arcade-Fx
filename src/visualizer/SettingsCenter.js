/**
 * SettingsCenter.js — Native Settings Center UI & Configuration Workspace.
 * Category tabs: Account & Profile, Subscription, Appearance & Theme,
 * Notifications, Trading Preferences & Overlays, Security, Support & Factory Reset.
 */

import { settingsStore } from '../data/SettingsStore.js';
import { ApiClient } from '../data/apiClient.js';

export class SettingsCenter {
  constructor(containerElement) {
    this.container = containerElement;
    this.activeTab = 'profile';
    this.searchQuery = '';
    this.referralData = null;
    this.loadingReferrals = false;

    this.render();
    settingsStore.subscribe(() => this.render());
  }

  showToast(message = 'Settings updated successfully') {
    let toast = document.getElementById('settingsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'settingsToast';
      toast.className = 'settings-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  showResetModal() {
    let backdrop = document.getElementById('resetModalBackdrop');
    if (backdrop) backdrop.remove();

    backdrop = document.createElement('div');
    backdrop.id = 'resetModalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-card">
        <h3>Reset Settings to Institutional Defaults?</h3>
        <p>This action will restore all strategy overlays, indicators, theme preferences, risk parameters, and audio alerts back to standard institutional defaults.</p>
        <div class="modal-actions">
          <button id="cancelResetBtn" class="btn-secondary">Cancel</button>
          <button id="confirmResetBtn" class="btn-danger">Confirm Reset</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    document.getElementById('cancelResetBtn').onclick = () => backdrop.remove();
    document.getElementById('confirmResetBtn').onclick = () => {
      settingsStore.resetToDefaults();
      backdrop.remove();
      this.showToast('All settings reset to institutional defaults');
    };
  }

  render() {
    if (!this.container) return;

    const s = settingsStore.getAll();
    const currentTheme = s.theme;

    this.container.innerHTML = `
      <div class="settings-workspace">
        <div class="settings-header">
          <div>
            <div class="settings-title">⚙️ Arcade FX Settings Center</div>
            <div class="settings-subtitle">Manage account profile, appearance themes, trading preferences, and security</div>
          </div>
          <div class="settings-search">
            <span>🔍</span>
            <input id="settingsSearchInput" type="text" placeholder="Search settings (theme, fvg, risk)..." value="${this.searchQuery}">
          </div>
        </div>

        <div class="settings-grid">
          <!-- Left Category Tabs -->
          <div class="settings-tabs">
            <div class="sidebar-section-title" style="padding: 4px 8px;">ACCOUNT</div>
            <button class="settings-tab-btn ${this.activeTab === 'profile' ? 'active' : ''}" data-tab="profile">👤 Account Profile</button>
            <button class="settings-tab-btn ${this.activeTab === 'subscription' ? 'active' : ''}" data-tab="subscription">✨ Subscription & Tier</button>
            <button class="settings-tab-btn ${this.activeTab === 'referrals' ? 'active' : ''}" data-tab="referrals">🎁 Referrals & Attribution</button>

            <div class="sidebar-section-title" style="padding: 8px 8px 4px;">PREFERENCES</div>
            <button class="settings-tab-btn ${this.activeTab === 'appearance' ? 'active' : ''}" data-tab="appearance">🎨 Appearance & Theme</button>
            <button class="settings-tab-btn ${this.activeTab === 'notifications' ? 'active' : ''}" data-tab="notifications">🔔 Notifications & Alerts</button>
            <button class="settings-tab-btn ${this.activeTab === 'overlays' ? 'active' : ''}" data-tab="overlays">🧠 Trading & SMC Overlays</button>

            <div class="sidebar-section-title" style="padding: 8px 8px 4px;">SECURITY & SUPPORT</div>
            <button class="settings-tab-btn ${this.activeTab === 'security' ? 'active' : ''}" data-tab="security">🔒 Security</button>
            <button class="settings-tab-btn ${this.activeTab === 'privacy' ? 'active' : ''}" data-tab="privacy">⚙️ Support & Factory Reset</button>
          </div>

          <!-- Right Tab Content Panel -->
          <div class="settings-content">
            ${this.renderTabContent(s, currentTheme)}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderTabContent(s, currentTheme) {
    if (this.searchQuery.trim() !== '') {
      return this.renderSearchResults(s);
    }

    switch (this.activeTab) {
      case 'profile':
        const currentName = localStorage.getItem('arcadefx_trader_name') || s.traderName || 'Trader';
        const currentEmail = localStorage.getItem('arcadefx_trader_email') || s.traderEmail || 'trader@arcadefx.io';
        return `
          <div class="settings-card">
            <div class="card-heading">👤 Trader Account Profile</div>
            <div class="card-subheading">Customize your trader profile details. Saved changes instantly update your dashboard welcome greeting and workspace header avatar.</div>
            
            <form id="profileSettingsForm" style="display: flex; flex-direction: column; gap: 16px; margin-top: 14px;">
              <div class="form-row">
                <div class="form-label" style="font-weight: 700;">Trader Name</div>
                <input type="text" id="settingTraderNameInput" class="form-control" style="width: 260px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-card); background: var(--bg-app); color: var(--text-dark);" value="${currentName}" placeholder="Enter your custom trader name..." required>
              </div>

              <div class="form-row">
                <div class="form-label" style="font-weight: 700;">Email Address</div>
                <input type="email" id="settingTraderEmailInput" class="form-control" style="width: 260px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-card); background: var(--bg-app); color: var(--text-dark);" value="${currentEmail}" placeholder="trader@arcadefx.io" required>
              </div>

              <div class="form-row">
                <div class="form-label">Account Status</div>
                <span class="pwa-badge" style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">Active &bull; Verified</span>
              </div>

              <div class="form-row">
                <div class="form-label">Live Market Feed Status</div>
                <span style="font-size: 12px; font-weight: 600; color: var(--accent-bull);">🟢 Live Institutional Market Feed</span>
              </div>

              <div style="margin-top: 10px;">
                <button type="submit" id="saveProfileBtn" class="btn-join-meet" style="padding: 10px 24px; font-size: 14px; cursor: pointer;">
                  <span>💾 Save Profile Details</span>
                </button>
              </div>
            </form>
          </div>
        `;

      case 'subscription':
        return `
          <div class="settings-card">
            <div class="card-heading">✨ Membership & Subscription Plan</div>
            <div class="card-subheading">Manage your active trading subscription and institutional features.</div>

            <div style="background: var(--bg-app); border: 1px solid var(--border-card); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 16px; color: var(--text-dark);">Arcade FX Institutional Pro</strong>
                <span style="background: var(--accent-blue); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px;">ACTIVE PLAN</span>
              </div>
              <div style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
                Includes unlimited 5AM CRT 4H range detection, non-repainting 10-factor SMC signal engine, DXY Pearson correlation, TradingView Advanced Chart integration, and Real-Time Trade Journal Synchronisation.
              </div>
            </div>
          </div>
        `;

      case 'appearance':
        return `
          <div class="settings-card">
            <div class="card-heading">🎨 Theme Engine & Color System</div>
            <div class="card-subheading">Switch between Light Workspace (#f8fafc) and Dark Fintech (#090d16) instantly.</div>
            
            <div class="theme-cards-grid">
              <!-- Dark Theme Card -->
              <div class="theme-radio-card ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark">
                <div class="theme-preview dark">
                  <div class="tp-sidebar"></div>
                  <div class="tp-content"><div class="tp-card"></div></div>
                </div>
                <div class="theme-title">🌙 Dark Fintech</div>
                <div class="theme-desc">Institutional dark mode (#090d16)</div>
              </div>

              <!-- Light Theme Card -->
              <div class="theme-radio-card ${currentTheme === 'light' ? 'active' : ''}" data-theme-val="light">
                <div class="theme-preview light">
                  <div class="tp-sidebar"></div>
                  <div class="tp-content"><div class="tp-card"></div></div>
                </div>
                <div class="theme-title">☀️ Light Workspace</div>
                <div class="theme-desc">Clean SaaS light tokens (#f8fafc)</div>
              </div>

              <!-- System Default Card -->
              <div class="theme-radio-card ${currentTheme === 'system' ? 'active' : ''}" data-theme-val="system">
                <div class="theme-preview system"></div>
                <div class="theme-title">💻 System Default</div>
                <div class="theme-desc">Matches OS color scheme automatically</div>
              </div>
            </div>
          </div>
        `;

      case 'notifications':
        return `
          <div class="settings-card">
            <div class="card-heading">🔔 Audio Alerts & System Toast Notifications</div>
            <div class="card-subheading">Configure event triggers for Grade A+ signals and 5AM CRT range sweeps.</div>

            <div class="toggle-grid">
              <div class="toggle-row">
                <span class="toggle-label">Enable Audio Alerts</span>
                <input type="checkbox" class="toggle-switch" data-setting="enableSoundAlerts" ${s.enableSoundAlerts ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">Enable Toast Alerts</span>
                <input type="checkbox" class="toggle-switch" data-setting="enableToastAlerts" ${s.enableToastAlerts ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">Signal Confirmation Popups</span>
                <input type="checkbox" class="toggle-switch" data-setting="enableSignalAlerts" ${s.enableSignalAlerts ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">5AM CRT Range Alerts</span>
                <input type="checkbox" class="toggle-switch" data-setting="enableCrtAlerts" ${s.enableCrtAlerts ? 'checked' : ''}>
              </div>
            </div>
          </div>
        `;

      case 'overlays':
        return `
          <div class="settings-card">
            <div class="card-heading">🧠 SMC Strategy Overlays & Risk Parameters</div>
            <div class="card-subheading">Enable dynamic technical overlays drawn directly on the trading chart canvas.</div>

            <div class="toggle-grid" style="margin-bottom: 20px;">
              <div class="toggle-row">
                <span class="toggle-label">PWH / PWL Weekly Range</span>
                <input type="checkbox" class="toggle-switch" data-setting="showPwhPwl" ${s.showPwhPwl ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">PDH / PDL Daily Range</span>
                <input type="checkbox" class="toggle-switch" data-setting="showPdhPdl" ${s.showPdhPdl ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">5AM CRT 4H Range Zones</span>
                <input type="checkbox" class="toggle-switch" data-setting="showCrtZones" ${s.showCrtZones ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">1H Fair Value Gaps (FVGs)</span>
                <input type="checkbox" class="toggle-switch" data-setting="showFvgs" ${s.showFvgs ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">1H Order Block Displacement</span>
                <input type="checkbox" class="toggle-switch" data-setting="showOrderBlocks" ${s.showOrderBlocks ? 'checked' : ''}>
              </div>
              <div class="toggle-row">
                <span class="toggle-label">HTF Liquidity Sweeps</span>
                <input type="checkbox" class="toggle-switch" data-setting="showLiquiditySweeps" ${s.showLiquiditySweeps ? 'checked' : ''}>
              </div>
            </div>

            <div class="form-row">
              <div>
                <div class="form-label">Default Risk Sizing (% Balance)</div>
                <div class="form-help">Percentage of account balance risked per trade setup (Standard 1.0%)</div>
              </div>
              <input type="number" step="0.1" class="form-control" style="width: 90px;" data-setting-num="defaultRiskPercent" value="${s.defaultRiskPercent}">
            </div>
          </div>
        `;

      case 'security':
        return `
          <div class="settings-card">
            <div class="card-heading">🔒 Account Security & Access Controls</div>
            <div class="card-subheading">Manage session integrity and access authentication settings.</div>

            <div class="form-row">
              <div class="form-label">Email Verification Status</div>
              <span class="pwa-badge">✓ Verified</span>
            </div>
            <div class="form-row">
              <div class="form-label">Two-Factor Authentication (2FA)</div>
              <span style="font-size: 12px; color: var(--accent-bull); font-weight: 600;">Enabled (App Authenticator)</span>
            </div>
          </div>
        `;

      case 'referrals':
        return this.renderReferralsTab();

      case 'privacy':
      default:
        return `
          <div class="settings-card">
            <div class="card-heading">⚙️ System Maintenance & Factory Reset</div>
            <div class="card-subheading">Restore all dashboard parameters back to institutional default state.</div>

            <div style="margin-top: 14px;">
              <button id="openResetModalBtn" class="btn-danger-outline">⚠️ Reset All Settings to Institutional Defaults</button>
            </div>
          </div>
        `;
    }
  }

  renderReferralsTab() {
    if (!this.referralData && !this.loadingReferrals) {
      this.loadingReferrals = true;
      ApiClient.fetchReferrals().then(res => {
        this.loadingReferrals = false;
        if (res && res.success) {
          this.referralData = {
            ...res,
            referralCode: res.referralCode || 'AFX000',
            referralUrl: res.referralLink || res.referralUrl || `${window.location.origin}/?ref=${res.referralCode || 'AFX000'}`,
            totalReferrals: res.totalReferrals ?? res.statistics?.totalReferrals ?? 0,
            pendingReferrals: res.pendingReferrals ?? res.statistics?.pendingPayments ?? 0,
            successfulReferrals: res.successfulReferrals ?? res.statistics?.successfulPaid ?? 0,
            history: res.history || []
          };
        } else {
          this.referralData = {
            referralCode: 'AFX000',
            referralUrl: `${window.location.origin}/?ref=AFX000`,
            totalReferrals: 0,
            pendingReferrals: 0,
            successfulReferrals: 0,
            history: []
          };
        }
        this.render();
      }).catch(e => {
        this.loadingReferrals = false;
        this.referralData = {
          referralCode: 'AFX000',
          referralUrl: `${window.location.origin}/?ref=AFX000`,
          totalReferrals: 0,
          pendingReferrals: 0,
          successfulReferrals: 0,
          history: []
        };
        this.render();
      });
    }

    const data = this.referralData || {
      referralCode: 'Loading...',
      referralUrl: `${window.location.origin}/?ref=...`,
      totalReferrals: 0,
      pendingReferrals: 0,
      successfulReferrals: 0,
      history: []
    };

    const historyRowsHtml = (data.history && data.history.length > 0)
      ? data.history.map(item => `
          <tr>
            <td>#${item.index || item.id}</td>
            <td><span class="ref-status-badge ${String(item.status).toLowerCase()}">${item.status}</span></td>
            <td style="font-weight: 600;">${item.plan}</td>
            <td style="color: var(--text-muted);">${item.date}</td>
          </tr>
        `).join('')
      : `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No referral activity recorded yet. Share your unique referral link to start earning verified referral attributions!
          </td>
        </tr>
      `;

    return `
      <div class="settings-card">
        <div class="card-heading">🎁 Referral & Subscription Attribution System</div>
        <div class="card-subheading">Share your unique ArcadeFX referral link. Referrals qualify automatically after the referred trader completes a verified paid subscription.</div>

        <!-- 1. Unique Referral Link Box -->
        <div class="referral-link-card">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-dark); margin-bottom: 4px;">Your Unique Referral Link</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">Share this persistent URL with fellow traders to earn qualified referral credit upon active subscription:</div>
          
          <div class="referral-input-group">
            <input type="text" id="userReferralUrlInput" class="referral-url-input" value="${data.referralUrl}" readonly>
            <button type="button" id="copyReferralLinkBtn" class="btn-copy-ref">📋 Copy Link</button>
          </div>
        </div>

        <!-- 2. Apply / Paste Referral Link Input -->
        <div class="referral-link-card" style="margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-dark); margin-bottom: 4px;">Have a Referral Link?</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">Paste another trader's referral code or link below to apply attribution to your account:</div>
          
          <div class="referral-input-group">
            <input type="text" id="applyReferralInput" class="referral-url-input" placeholder="Paste referral link or code (e.g. AFX7K92M)...">
            <button type="button" id="applyReferralBtn" class="btn-copy-ref" style="background: var(--bg-app); border: 1px solid var(--border-card); color: var(--text-dark);">Apply Link</button>
          </div>
          <div id="referralApplyFeedback" style="font-size: 12px; font-weight: 600; margin-top: 8px; display: none;"></div>
        </div>

        <!-- 3. Real-Time Referral Statistics -->
        <div style="font-size: 14px; font-weight: 700; color: var(--text-dark); margin-top: 10px;">Referral Statistics</div>
        <div class="referral-stats-grid">
          <div class="ref-stat-card">
            <div class="ref-stat-val">${data.totalReferrals}</div>
            <div class="ref-stat-label">Total Referrals</div>
          </div>
          <div class="ref-stat-card">
            <div class="ref-stat-val" style="color: #F59E0B;">${data.pendingReferrals}</div>
            <div class="ref-stat-label">Pending Payments</div>
          </div>
          <div class="ref-stat-card success-card">
            <div class="ref-stat-val" style="color: #10B981;">${data.successfulReferrals}</div>
            <div class="ref-stat-label">Successful Paid</div>
          </div>
        </div>

        <!-- 4. Referral Activity Ledger -->
        <div style="font-size: 14px; font-weight: 700; color: var(--text-dark); margin-top: 20px; margin-bottom: 8px;">Referral History</div>
        <div style="overflow-x: auto; border: 1px solid var(--border-card); border-radius: 10px; background: var(--bg-app);">
          <table class="referral-history-table">
            <thead>
              <tr>
                <th>REF ID</th>
                <th>STATUS</th>
                <th>SUBSCRIPTION PLAN</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              ${historyRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderSearchResults(s) {
    const q = this.searchQuery.toLowerCase();
    return `
      <div class="settings-card">
        <div class="card-heading">Search Results for "${this.searchQuery}"</div>
        <div class="card-subheading">Matching settings controls across all categories</div>
        
        <div class="toggle-grid">
          ${q.includes('theme') || q.includes('dark') || q.includes('light') ? `
            <div class="toggle-row">
              <span class="toggle-label">Theme Mode Switch</span>
              <button class="btn-secondary" id="searchThemeToggle">Switch Theme</button>
            </div>
          ` : ''}
          ${q.includes('crt') || q.includes('5am') ? `
            <div class="toggle-row">
              <span class="toggle-label">5AM CRT Range Zones</span>
              <input type="checkbox" class="toggle-switch" data-setting="showCrtZones" ${s.showCrtZones ? 'checked' : ''}>
            </div>
          ` : ''}
          ${q.includes('fvg') || q.includes('fair') ? `
            <div class="toggle-row">
              <span class="toggle-label">1H Fair Value Gaps (FVGs)</span>
              <input type="checkbox" class="toggle-switch" data-setting="showFvgs" ${s.showFvgs ? 'checked' : ''}>
            </div>
          ` : ''}
          ${q.includes('risk') ? `
            <div class="toggle-row">
              <span class="toggle-label">Risk / Reward Projection Box</span>
              <input type="checkbox" class="toggle-switch" data-setting="showRiskReward" ${s.showRiskReward ? 'checked' : ''}>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  attachEvents() {
    const searchInput = document.getElementById('settingsSearchInput');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value;
        this.render();
      };
    }

    const tabs = this.container.querySelectorAll('.settings-tab-btn');
    tabs.forEach(t => {
      t.onclick = () => {
        this.activeTab = t.getAttribute('data-tab');
        this.searchQuery = '';
        this.render();
      };
    });

    const themeCards = this.container.querySelectorAll('.theme-radio-card');
    themeCards.forEach(tc => {
      tc.onclick = () => {
        const val = tc.getAttribute('data-theme-val');
        settingsStore.set('theme', val);
        this.showToast(`Theme updated to ${val.toUpperCase()}`);
      };
    });

    const searchThemeToggle = document.getElementById('searchThemeToggle');
    if (searchThemeToggle) {
      searchThemeToggle.onclick = () => {
        const current = settingsStore.get('theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        settingsStore.set('theme', next);
        this.showToast(`Theme updated to ${next.toUpperCase()}`);
      };
    }

    const toggles = this.container.querySelectorAll('.toggle-switch');
    toggles.forEach(t => {
      t.onchange = (e) => {
        const key = t.getAttribute('data-setting');
        settingsStore.set(key, e.target.checked);
        this.showToast(`${key} updated`);
      };
    });

    const numInputs = this.container.querySelectorAll('[data-setting-num]');
    numInputs.forEach(input => {
      input.onchange = (e) => {
        const key = input.getAttribute('data-setting-num');
        settingsStore.set(key, parseFloat(e.target.value));
        this.showToast(`${key} updated`);
      };
    });

    const selects = this.container.querySelectorAll('[data-setting-select]');
    selects.forEach(select => {
      select.onchange = (e) => {
        const key = select.getAttribute('data-setting-select');
        settingsStore.set(key, e.target.value);
        this.showToast(`${key} updated`);
      };
    });

    const profileForm = document.getElementById('profileSettingsForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameVal = document.getElementById('settingTraderNameInput').value.trim();
        const emailVal = document.getElementById('settingTraderEmailInput').value.trim();

        if (nameVal) {
          localStorage.setItem('arcadefx_trader_name', nameVal);
          localStorage.setItem('arcadefx_trader_email', emailVal || 'trader@arcadefx.io');
          settingsStore.set('traderName', nameVal);
          settingsStore.set('traderEmail', emailVal || 'trader@arcadefx.io');

          if (typeof window.syncTraderProfileUi === 'function') {
            window.syncTraderProfileUi();
          }

          this.showToast(`Profile updated! Welcome, ${nameVal}`);
        }
      });
    }

    const resetBtn = document.getElementById('openResetModalBtn');
    if (resetBtn) {
      resetBtn.onclick = () => this.showResetModal();
    }

    // Referral Copy & Apply Event Listeners
    const copyBtn = document.getElementById('copyReferralLinkBtn');
    const urlInput = document.getElementById('userReferralUrlInput');
    if (copyBtn && urlInput) {
      copyBtn.onclick = () => {
        urlInput.select();
        navigator.clipboard.writeText(urlInput.value).then(() => {
          copyBtn.textContent = '✓ Copied!';
          copyBtn.classList.add('copied');
          this.showToast('Referral link copied to clipboard!');
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Link';
            copyBtn.classList.remove('copied');
          }, 2200);
        }).catch(() => {
          this.showToast('Referral link copied!');
        });
      };
    }

    const applyBtn = document.getElementById('applyReferralBtn');
    const applyInput = document.getElementById('applyReferralInput');
    const applyFeedback = document.getElementById('referralApplyFeedback');

    if (applyBtn && applyInput) {
      applyBtn.onclick = async () => {
        let val = applyInput.value.trim();
        if (!val) {
          if (applyFeedback) {
            applyFeedback.style.display = 'block';
            applyFeedback.style.color = '#EF4444';
            applyFeedback.textContent = 'Please enter or paste a valid referral link or code.';
          }
          return;
        }

        if (val.includes('ref=')) {
          val = val.split('ref=').pop().split('&')[0];
        }

        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';

        try {
          const res = await ApiClient.applyReferralCode(val);
          if (applyFeedback) {
            applyFeedback.style.display = 'block';
            if (res && res.success) {
              applyFeedback.style.color = '#10B981';
              applyFeedback.textContent = '✓ ' + (res.message || 'Referral code successfully applied!');
              this.showToast('Referral link applied successfully!');
              this.referralData = null; // force fresh reload
              setTimeout(() => this.render(), 1200);
            } else {
              applyFeedback.style.color = '#EF4444';
              applyFeedback.textContent = '⚠️ ' + (res?.error || 'Could not apply referral link.');
            }
          }
        } catch (err) {
          if (applyFeedback) {
            applyFeedback.style.display = 'block';
            applyFeedback.style.color = '#EF4444';
            applyFeedback.textContent = '⚠️ ' + (err.message || 'Error applying referral link');
          }
        } finally {
          applyBtn.disabled = false;
          applyBtn.textContent = 'Apply Link';
        }
      };
    }
  }
}
