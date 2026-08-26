/**
 * Arcade FX — Administrator Application Controller (`admin/src/adminApp.js`)
 * Main orchestrator for SPA routing, data fetching, view rendering,
 * user management drawers, calendar, payments, notifications, and security audit trail.
 */

import { AdminApiClient } from './adminApi.js';

export class AdminApp {
  constructor() {
    this.currentView = 'overview';
    this.userPage = 1;
    this.paymentPage = 1;
    this.subPage = 1;
    this.auditPage = 1;
    this.calendarDate = new Date();

    this.init();
  }

  async init() {
    if (!AdminApiClient.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    this.bindNavigation();
    this.bindGlobalControls();
    this.bindFormListeners();
    this.handleRoute();

    // Check admin authentication session
    const settingsRes = await AdminApiClient.fetchSettings();
    if (settingsRes && settingsRes.success && settingsRes.adminProfile) {
      this.updateAdminHeader(settingsRes.adminProfile);
    }
  }

  updateAdminHeader(profile) {
    const avatarEl = document.getElementById('adminAvatar');
    const nameEl = document.getElementById('adminDisplayName');
    const roleEl = document.getElementById('adminRoleName');

    if (nameEl) nameEl.textContent = profile.email?.split('@')[0] || 'Admin';
    if (roleEl) roleEl.textContent = profile.isSuperAdmin ? 'Super Administrator' : 'Administrator';
    if (avatarEl) {
      const email = profile.email || 'AD';
      avatarEl.textContent = email.substring(0, 2).toUpperCase();
    }
  }

  bindNavigation() {
    window.addEventListener('hashchange', () => this.handleRoute());

    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const view = link.getAttribute('data-view');
        if (view) {
          this.switchView(view);
        }
      });
    });
  }

  bindGlobalControls() {
    const refreshBtn = document.getElementById('globalRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshCurrentView());
    }

    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        AdminApiClient.clearSession();
        window.location.href = 'login.html';
      });
    }

    // User Search & Filters
    const userSearch = document.getElementById('userSearchInput');
    const userStatus = document.getElementById('userStatusFilter');
    const userPlan = document.getElementById('userPlanFilter');

    let debounceTimer;
    if (userSearch) {
      userSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.userPage = 1;
          this.renderUsers();
        }, 300);
      });
    }

    if (userStatus) userStatus.addEventListener('change', () => { this.userPage = 1; this.renderUsers(); });
    if (userPlan) userPlan.addEventListener('change', () => { this.userPage = 1; this.renderUsers(); });

    // Payment Filters
    const paySearch = document.getElementById('paymentSearchInput');
    const payStatus = document.getElementById('paymentStatusFilter');
    if (paySearch) {
      paySearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.paymentPage = 1;
          this.renderPayments();
        }, 300);
      });
    }
    if (payStatus) payStatus.addEventListener('change', () => { this.paymentPage = 1; this.renderPayments(); });

    // Class Buttons
    const createClassBtn = document.getElementById('createClassBtn');
    if (createClassBtn) {
      createClassBtn.addEventListener('click', () => this.openClassModal());
    }

    // Calendar Navigation
    const calPrev = document.getElementById('calPrevMonthBtn');
    const calNext = document.getElementById('calNextMonthBtn');
    const calToday = document.getElementById('calTodayBtn');

    if (calPrev) calPrev.addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
      this.renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
      this.renderCalendar();
    });
    if (calToday) calToday.addEventListener('click', () => {
      this.calendarDate = new Date();
      this.renderCalendar();
    });
  }

  bindFormListeners() {
    // User Action Form
    const userActionForm = document.getElementById('userActionForm');
    const actionTypeSelect = document.getElementById('userActionType');
    if (actionTypeSelect) {
      actionTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('roleSelectWrap').style.display = val === 'update_role' ? 'block' : 'none';
        document.getElementById('subSelectWrap').style.display = val === 'update_subscription' ? 'block' : 'none';
      });
    }

    if (userActionForm) {
      userActionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('actionUserId').value;
        const action = document.getElementById('userActionType').value;
        const role = document.getElementById('userRoleVal').value;
        const plan = document.getElementById('userPlanVal').value;

        const res = await AdminApiClient.executeUserAction(userId, action, { role, plan });
        if (res.success) {
          alert('User administrative action completed successfully.');
          this.closeModals();
          this.renderUsers();
        } else {
          alert('Action failed: ' + res.error);
        }
      });
    }

    // Notification Form
    const notifForm = document.getElementById('notificationForm');
    if (notifForm) {
      notifForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('notifTitle').value.trim();
        const message = document.getElementById('notifMessage').value.trim();
        const target_audience = document.getElementById('notifTarget').value;
        const type = document.getElementById('notifType').value;
        const action_url = document.getElementById('notifActionUrl').value.trim();

        const res = await AdminApiClient.sendNotification({ title, message, target_audience, type, action_url });
        if (res.success) {
          alert(res.message || 'Notification sent.');
          notifForm.reset();
          this.renderNotifications();
        } else {
          alert('Failed to send notification: ' + res.error);
        }
      });
    }

    // Email Form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipient_email = document.getElementById('emailRecipient').value.trim();
        const subject = document.getElementById('emailSubject').value.trim();
        const body_html = document.getElementById('emailBody').value.trim();

        const res = await AdminApiClient.sendEmail({ recipient_email, subject, body_html });
        if (res.success) {
          alert(res.message || 'Email sent.');
          emailForm.reset();
          this.renderEmails();
        } else {
          alert('Failed to send email: ' + res.error);
        }
      });
    }

    // Class Form
    const classForm = document.getElementById('classForm');
    if (classForm) {
      classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('classId').value;
        const title = document.getElementById('classTitleInput').value.trim();
        const instructor_name = document.getElementById('classInstructorInput').value.trim();
        const start_time = new Date(document.getElementById('classStartTime').value).toISOString();
        const end_time = new Date(document.getElementById('classEndTime').value).toISOString();
        const meeting_url = document.getElementById('classMeetingUrl').value.trim();
        const status = document.getElementById('classStatus').value;

        let res;
        if (id) {
          res = await AdminApiClient.updateClass({ id, title, instructor_name, start_time, end_time, meeting_url, status });
        } else {
          res = await AdminApiClient.createClass({ title, instructor_name, start_time, end_time, meeting_url, status });
        }

        if (res.success) {
          alert('Live class saved successfully.');
          this.closeModals();
          this.renderClasses();
        } else {
          alert('Error saving live class: ' + res.error);
        }
      });
    }
  }

  handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'overview';
    this.switchView(hash);
  }

  switchView(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Update active nav item
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show active view section
    document.querySelectorAll('.admin-view').forEach(sec => {
      sec.style.display = sec.id === `view-${viewName}` ? 'block' : 'none';
    });

    // Update Page Header Title
    const titleMap = {
      overview: 'Dashboard Overview',
      users: 'User Management Directory',
      payments: 'Payment & Transaction Ledger',
      subscriptions: 'Subscription Plan Management',
      notifications: 'Notification Broadcasting Center',
      emails: 'Email Dispatch Center',
      classes: 'Live Masterclass Management',
      calendar: 'Live Class Master Schedule',
      'audit-logs': 'Administrator Security Audit Trail',
      settings: 'Admin Platform Configuration'
    };

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titleMap[viewName] || 'Admin Workspace';

    this.refreshCurrentView();
  }

  refreshCurrentView() {
    switch (this.currentView) {
      case 'overview': this.renderOverview(); break;
      case 'users': this.renderUsers(); break;
      case 'payments': this.renderPayments(); break;
      case 'subscriptions': this.renderSubscriptions(); break;
      case 'notifications': this.renderNotifications(); break;
      case 'emails': this.renderEmails(); break;
      case 'classes': this.renderClasses(); break;
      case 'calendar': this.renderCalendar(); break;
      case 'audit-logs': this.renderAuditLogs(); break;
      case 'settings': this.renderSettings(); break;
    }
  }

  // 1. OVERVIEW VIEW
  async renderOverview() {
    const grid = document.getElementById('overviewStatsGrid');
    const recentAudit = document.getElementById('overviewRecentAuditTbody');

    if (grid) grid.innerHTML = '<div style="grid-column:1/-1; padding:20px; text-align:center;">Loading platform metrics...</div>';

    const res = await AdminApiClient.fetchOverview();
    if (!res || !res.success || !res.stats) {
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1; padding:20px; color:var(--accent-red);">Failed to load platform statistics.</div>';
      return;
    }

    const s = res.stats;
    grid.innerHTML = `
      <div class="stat-card">
        <span class="stat-card-title">Total Registered Users</span>
        <span class="stat-card-value">${s.totalUsers}</span>
        <span class="stat-card-sub">+${s.newUsers} new in last 30 days</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Active Users</span>
        <span class="stat-card-value" style="color: var(--accent-green);">${s.activeUsers}</span>
        <span class="stat-card-sub">Authenticated workspace users</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Active Subscriptions</span>
        <span class="stat-card-value" style="color: var(--accent-purple);">${s.activeSubscriptions}</span>
        <span class="stat-card-sub">${s.trialUsers} on trial • ${s.expiredSubscriptions} expired</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Total Revenue (USD)</span>
        <span class="stat-card-value">$${s.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="stat-card-sub">$${s.revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })} this month</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Successful Payments</span>
        <span class="stat-card-value" style="color: var(--accent-green);">${s.successfulPayments}</span>
        <span class="stat-card-sub">${s.pendingPayments} pending • ${s.failedPayments} failed</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-title">Upcoming Live Classes</span>
        <span class="stat-card-value" style="color: var(--accent-blue);">${s.upcomingLiveClasses}</span>
        <span class="stat-card-sub">Scheduled masterclasses</span>
      </div>
    `;

    // Render User Registration Trend Chart
    this.renderRegistrationTrend(res.registrationTrend || []);
  }

  renderRegistrationTrend(trendData = []) {
    const container = document.getElementById('registrationTrendContainer');
    if (!container) return;

    if (!Array.isArray(trendData) || trendData.length === 0 || trendData.every(d => Number(d.count || 0) === 0)) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:240px; color:var(--text-muted); text-align:center;">
          <span style="font-size:32px; margin-bottom:8px;">📊</span>
          <span style="font-size:14px; font-weight:600;">No registration data available for this period.</span>
        </div>
      `;
      return;
    }

    const width = 800;
    const height = 220;
    const padding = { top: 20, right: 30, bottom: 35, left: 40 };

    const counts = trendData.map(d => Number(d.count || 0));
    const maxVal = Math.max(5, ...counts);

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const points = trendData.map((d, i) => {
      const x = padding.left + (i / Math.max(1, trendData.length - 1)) * chartW;
      const y = padding.top + chartH - (Number(d.count || 0) / maxVal) * chartH;
      return { x, y, date: d.date, count: d.count };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const step = Math.max(1, Math.floor(trendData.length / 7));
    const xLabels = points.filter((_, i) => i % step === 0 || i === points.length - 1).map(p => {
      const parts = p.date.split('-');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : p.date;
      return `<text x="${p.x}" y="${height - 10}" fill="#94A3B8" font-size="10" text-anchor="middle" font-family="sans-serif">${label}</text>`;
    }).join('');

    const yGrid = [0, Math.round(maxVal / 2), maxVal].map(val => {
      const y = padding.top + chartH - (val / maxVal) * chartH;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 4" />
        <text x="${padding.left - 8}" y="${y + 3}" fill="#94A3B8" font-size="10" text-anchor="end" font-family="sans-serif">${val}</text>
      `;
    }).join('');

    const circles = points.map((p, i) => `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#2563EB" stroke="#FFFFFF" stroke-width="2" data-idx="${i}" style="cursor:pointer; transition:r 0.15s ease;" />
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
        <defs>
          <linearGradient id="regTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563EB" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        ${yGrid}
        <path d="${areaD}" fill="url(#regTrendGrad)" />
        <path d="${pathD}" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${circles}
        ${xLabels}
      </svg>
      <div id="chartTooltip" style="position:absolute; display:none; background:#0F172A; color:#FFFFFF; padding:6px 10px; border-radius:8px; font-size:12px; font-weight:700; border:1px solid rgba(255,255,255,0.15); pointer-events:none; box-shadow:0 4px 12px rgba(0,0,0,0.4); transform:translate(-50%, -120%); z-index:10;"></div>
    `;

    const tooltip = container.querySelector('#chartTooltip');
    const svgCircles = container.querySelectorAll('circle');

    svgCircles.forEach((circle, idx) => {
      circle.addEventListener('mouseenter', (e) => {
        circle.setAttribute('r', '6');
        const pt = points[idx];
        if (tooltip && pt) {
          tooltip.innerText = `${pt.date}: ${pt.count} registration${pt.count === 1 ? '' : 's'}`;
          tooltip.style.left = `${(pt.x / width) * 100}%`;
          tooltip.style.top = `${(pt.y / height) * 100}%`;
          tooltip.style.display = 'block';
        }
      });

      circle.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '4');
        if (tooltip) tooltip.style.display = 'none';
      });
    });
  }

  // 2. USERS VIEW
  async renderUsers() {
    const tbody = document.getElementById('usersTbody');
    const pagination = document.getElementById('usersPagination');

    const search = document.getElementById('userSearchInput')?.value || '';
    const status = document.getElementById('userStatusFilter')?.value || 'ALL';
    const plan = document.getElementById('userPlanFilter')?.value || 'ALL';

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">Fetching user directory...</td></tr>';

    const res = await AdminApiClient.fetchUsers({
      page: this.userPage,
      limit: 15,
      search,
      status,
      plan
    });

    if (!res || !res.success || !Array.isArray(res.users)) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--accent-red);">Error loading users.</td></tr>';
      return;
    }

    if (res.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No users match the search criteria.</td></tr>';
    } else {
      tbody.innerHTML = res.users.map(u => {
        const badgeStatusClass = u.status === 'active' ? 'badge-active' : (u.status === 'suspended' ? 'badge-suspended' : 'badge-failed');
        const rawPlan = u.subscription_plan || u.subscription_plan_id || 'Free';
        const badgePlanClass = String(rawPlan).toLowerCase().includes('vip') || String(rawPlan).toLowerCase().includes('elite') ? 'badge-vip' : (String(rawPlan).toLowerCase().includes('pro') || String(rawPlan).toLowerCase().includes('essential') ? 'badge-pro' : 'badge-free');

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-primary);">${u.full_name || u.email?.split('@')[0]}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${u.email}</div>
            </td>
            <td><span class="badge ${badgePlanClass}">${rawPlan}</span></td>
            <td><span class="badge ${badgeStatusClass}">${u.status || 'active'}</span></td>
            <td>${u.is_verified ? '✅ Verified' : '⏳ Pending'}</td>
            <td style="font-size: 12px; color: var(--text-muted);">${new Date(u.created_at).toLocaleDateString()}</td>
            <td style="font-size: 12px; color: var(--text-muted);">${u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</td>
            <td style="text-align: right;">
              <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="window.adminApp.openUserModal('${u.id}', '${u.status}', '${u.role}', '${u.subscription_plan}')">Manage</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    this.renderPagination(pagination, res.page, res.totalPages, (p) => {
      this.userPage = p;
      this.renderUsers();
    });
  }

  // 3. PAYMENTS VIEW
  async renderPayments() {
    const tbody = document.getElementById('paymentsTbody');
    const pagination = document.getElementById('paymentsPagination');

    const search = document.getElementById('paymentSearchInput')?.value || '';
    const status = document.getElementById('paymentStatusFilter')?.value || 'ALL';

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">Loading payment ledger...</td></tr>';

    const res = await AdminApiClient.fetchPayments({
      page: this.paymentPage,
      limit: 15,
      search,
      status
    });

    if (!res || !res.success || !Array.isArray(res.payments)) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--accent-red);">Error loading payment records.</td></tr>';
      return;
    }

    if (res.payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No payment records found.</td></tr>';
    } else {
      tbody.innerHTML = res.payments.map(p => {
        const badgeClass = p.status === 'completed' ? 'badge-completed' : (p.status === 'pending' ? 'badge-pending' : 'badge-failed');

        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-blue);">${p.reference}</td>
            <td>
              <div style="font-weight: 600;">${p.user_name || p.user_email || 'User'}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${p.user_email || ''}</div>
            </td>
            <td style="text-transform: uppercase; font-size: 11px; font-weight: 700;">${p.type}</td>
            <td style="font-family: var(--font-mono); font-weight: 700;">$${Number(p.amount_usd).toFixed(2)}</td>
            <td style="font-family: var(--font-mono); color: var(--text-muted);">KSh ${Number(p.amount_kes).toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${p.status}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${new Date(p.created_at).toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }

    this.renderPagination(pagination, res.page, res.totalPages, (p) => {
      this.paymentPage = p;
      this.renderPayments();
    });
  }

  // 4. SUBSCRIPTIONS VIEW
  async renderSubscriptions() {
    const tbody = document.getElementById('subscriptionsTbody');
    const pagination = document.getElementById('subscriptionsPagination');

    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px;">Loading subscriptions...</td></tr>';

    const res = await AdminApiClient.fetchSubscriptions({ page: this.subPage, limit: 15 });

    if (!res || !res.success || !Array.isArray(res.subscriptions)) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--accent-red);">Error loading subscriptions.</td></tr>';
      return;
    }

    if (res.subscriptions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No subscription records found.</td></tr>';
    } else {
      tbody.innerHTML = res.subscriptions.map(s => `
        <tr>
          <td>${s.user_email || s.user_id}</td>
          <td><span class="badge badge-pro">${s.plan_name}</span></td>
          <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-cancelled'}">${s.status}</span></td>
          <td style="text-transform: capitalize;">${s.billing_interval}</td>
          <td style="font-family: var(--font-mono);">$${Number(s.price_usd).toFixed(2)}</td>
          <td style="font-size: 12px; color: var(--text-muted);">${new Date(s.start_date).toLocaleDateString()}</td>
          <td style="font-size: 12px; color: var(--text-muted);">${s.expiration_date ? new Date(s.expiration_date).toLocaleDateString() : 'Lifetime'}</td>
          <td style="text-align: right;">
            ${s.status === 'active' ? `
              <button class="btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="window.adminApp.cancelSubscription('${s.user_id}')">Cancel</button>
            ` : '—'}
          </td>
        </tr>
      `).join('');
    }

    this.renderPagination(pagination, res.page, res.totalPages, (p) => {
      this.subPage = p;
      this.renderSubscriptions();
    });
  }

  async cancelSubscription(userId) {
    if (!confirm('Are you sure you want to cancel this user subscription?')) return;
    const res = await AdminApiClient.executeSubscriptionAction(userId, 'cancel');
    if (res.success) {
      alert('Subscription cancelled.');
      this.renderSubscriptions();
    } else {
      alert('Failed to cancel: ' + res.error);
    }
  }

  // 5. NOTIFICATIONS VIEW
  async renderNotifications() {
    const tbody = document.getElementById('notificationsTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading notifications...</td></tr>';

    const res = await AdminApiClient.fetchNotifications();
    if (tbody && res.success && Array.isArray(res.notifications)) {
      if (res.notifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No notification logs found.</td></tr>';
      } else {
        tbody.innerHTML = res.notifications.map(n => `
          <tr>
            <td style="font-weight: 700;">${n.title}</td>
            <td style="text-transform: capitalize;">${n.target_audience}</td>
            <td><span class="badge badge-active">${n.type}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${new Date(n.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    }
  }

  // 6. EMAILS VIEW
  async renderEmails() {
    const tbody = document.getElementById('emailsTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading email logs...</td></tr>';

    const res = await AdminApiClient.fetchEmailLogs();
    if (tbody && res.success && Array.isArray(res.emails)) {
      if (res.emails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No email logs found.</td></tr>';
      } else {
        tbody.innerHTML = res.emails.map(e => `
          <tr>
            <td>${e.recipient_email}</td>
            <td style="font-weight: 600;">${e.subject}</td>
            <td><span class="badge badge-success">${e.status}</span></td>
            <td style="font-size: 12px; color: var(--text-muted);">${new Date(e.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    }
  }

  // 7. LIVE CLASSES VIEW
  async renderClasses() {
    const tbody = document.getElementById('classesTbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">Loading live classes...</td></tr>';

    const res = await AdminApiClient.fetchClasses();
    if (tbody && res.success && Array.isArray(res.classes)) {
      if (res.classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No live classes scheduled.</td></tr>';
      } else {
        tbody.innerHTML = res.classes.map(c => `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-primary);">${c.title}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${c.description || ''}</div>
            </td>
            <td>${c.instructor_name}</td>
            <td style="font-size: 12px; font-family: var(--font-mono);">${new Date(c.start_time).toLocaleString()}</td>
            <td style="font-size: 12px; font-family: var(--font-mono);">${new Date(c.end_time).toLocaleString()}</td>
            <td><span class="badge ${c.status === 'live' ? 'badge-active' : 'badge-scheduled'}">${c.status}</span></td>
            <td>${c.is_published ? 'Yes' : 'No'}</td>
            <td style="text-align: right;">
              <button class="btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="window.adminApp.deleteClass('${c.id}')">Cancel</button>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  async deleteClass(id) {
    if (!confirm('Are you sure you want to cancel this live masterclass?')) return;
    const res = await AdminApiClient.deleteClass(id);
    if (res.success) {
      alert('Class cancelled.');
      this.renderClasses();
      this.renderCalendar();
    } else {
      alert('Failed: ' + res.error);
    }
  }

  // 8. LIVE CLASS CALENDAR VIEW
  async renderCalendar() {
    const monthLabel = document.getElementById('calendarMonthLabel');
    const daysGrid = document.getElementById('calendarDaysGrid');
    if (!daysGrid) return;

    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

    daysGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center;">Rendering masterclass schedule...</div>';

    // Fetch classes for schedule
    const res = await AdminApiClient.fetchClasses();
    const classes = (res.success && Array.isArray(res.classes)) ? res.classes : [];

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';

    // Empty lead cells
    for (let i = 0; i < firstDay; i++) {
      gridHtml += '<div class="calendar-day-cell" style="opacity:0.2;"></div>';
    }

    // Days cells
    for (let d = 1; d <= totalDays; d++) {
      const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayClasses = classes.filter(c => {
        const cDate = new Date(c.start_time).toISOString().split('T')[0];
        return cDate === currentDateStr;
      });

      gridHtml += `
        <div class="calendar-day-cell">
          <div class="calendar-day-num">${d}</div>
          ${dayClasses.map(c => `
            <div class="calendar-event-tag" title="${c.title} (${new Date(c.start_time).toLocaleTimeString()})" onclick="alert('Class: ${c.title}\\nInstructor: ${c.instructor_name}\\nMeeting: ${c.meeting_url}')">
              ${c.title}
            </div>
          `).join('')}
        </div>
      `;
    }

    daysGrid.innerHTML = gridHtml;
  }

  // 9. AUDIT LOGS VIEW
  async renderAuditLogs() {
    const tbody = document.getElementById('auditLogsTbody');
    const pagination = document.getElementById('auditPagination');

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">Loading audit logs...</td></tr>';

    const res = await AdminApiClient.fetchAuditLogs({ page: this.auditPage, limit: 15 });
    if (!res || !res.success || !Array.isArray(res.logs)) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--accent-red);">Error loading audit trail.</td></tr>';
      return;
    }

    if (res.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No security audit events recorded.</td></tr>';
    } else {
      tbody.innerHTML = res.logs.map(l => `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 11px;">${new Date(l.created_at).toLocaleString()}</td>
          <td>${l.admin_email}</td>
          <td><span class="badge badge-active">${l.action}</span></td>
          <td style="text-transform: capitalize;">${l.target_type}</td>
          <td>${l.target_id || '—'}</td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${l.ip_address || '127.0.0.1'}</td>
          <td>
            <button class="btn-secondary" style="padding: 2px 6px; font-size: 11px;" onclick="alert(JSON.stringify(${JSON.stringify(l.details_json)}, null, 2))">View Details</button>
          </td>
        </tr>
      `).join('');
    }

    this.renderPagination(pagination, res.page, res.totalPages, (p) => {
      this.auditPage = p;
      this.renderAuditLogs();
    });
  }

  // 10. SETTINGS VIEW
  async renderSettings() {
    const emailInput = document.getElementById('settingAdminEmail');
    const roleInput = document.getElementById('settingAdminRole');
    const sysContainer = document.getElementById('systemConfigContainer');

    const res = await AdminApiClient.fetchSettings();
    if (res && res.success) {
      if (emailInput) emailInput.value = res.adminProfile?.email || 'admin@arcadefx.live';
      if (roleInput) roleInput.value = res.adminProfile?.isSuperAdmin ? 'Super Administrator' : 'Administrator';

      if (sysContainer && res.systemConfig) {
        const c = res.systemConfig;
        sysContainer.innerHTML = `
          <div><strong>Platform Name:</strong> ${c.platformName}</div>
          <div><strong>System Version:</strong> ${c.version}</div>
          <div><strong>Email Provider:</strong> ${c.emailProviderStatus}</div>
          <div><strong>Payment Provider:</strong> ${c.paymentProviderStatus}</div>
          <div><strong>Database Engine:</strong> ${c.databaseDriver}</div>
        `;
      }
    }
  }

  // Modals & UI Helpers
  openUserModal(userId, currentStatus, currentRole, currentPlan) {
    document.getElementById('actionUserId').value = userId;
    document.getElementById('userActionType').value = 'activate';
    document.getElementById('roleSelectWrap').style.display = 'none';
    document.getElementById('subSelectWrap').style.display = 'none';
    document.getElementById('modalUserAction').classList.add('active');
  }

  openClassModal() {
    document.getElementById('classId').value = '';
    document.getElementById('classForm').reset();
    document.getElementById('modalClassForm').classList.add('active');
  }

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  renderPagination(container, page = 1, totalPages = 1, onPageChange) {
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = '<span>Showing all items</span>';
      return;
    }

    container.innerHTML = `
      <span>Page ${page} of ${totalPages}</span>
      <div class="pagination-controls">
        <button class="page-btn" id="prevPageBtn" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>
        <button class="page-btn" id="nextPageBtn" ${page >= totalPages ? 'disabled' : ''}>Next ›</button>
      </div>
    `;

    const prev = container.querySelector('#prevPageBtn');
    const next = container.querySelector('#nextPageBtn');

    if (prev) prev.addEventListener('click', () => onPageChange(page - 1));
    if (next) next.addEventListener('click', () => onPageChange(page + 1));
  }
}

// Instantiate and attach globally
document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminApp();
});
