/**
 * main.js — Main Application Entry Point & Web UI Controller.
 * Connects ArcadeEngine, TradingView Widget actions, Indicators dropdown menu,
 * Notifications popover, Fullscreen chart mode, Mode switcher (TV vs Arcade SMC),
 * playback controls, symbol & timeframe selectors, search box, mobile drawer menu,
 * Supabase Auth, User Wallets, Deposits, Withdrawals, and Transactions Ledger.
 */

import { ArcadeEngine } from './engine.js';
import { SettingsCenter } from './visualizer/SettingsCenter.js';
import { PWAManager } from './pwaManager.js';
import { settingsStore } from './data/SettingsStore.js';
import { ApiClient } from './data/apiClient.js';
import { DashboardEnhancement } from './dashboardEnhancement.js';
import { MotionEngine } from './motionEngine.js';

import { SignalsController } from './signalsController.js';
import { AlertsController } from './alertsController.js';
import { initSidebarLiveClock } from './liveClock.js';

import { initAuth } from './auth.js';
import { initWallet } from './wallet.js';
import { initDeposits } from './deposits.js';
import { initWithdrawals } from './withdrawals.js';
import { initTransactions } from './transactions.js';
import { initPayHeroPayments } from './payheroPayments.js';
import { entitlementManager } from './data/EntitlementManager.js';
import { initFloatingCommunityWidget } from './floatingCommunityWidget.js';

window.entitlementManager = entitlementManager;

document.addEventListener('DOMContentLoaded', () => {
  initFloatingCommunityWidget();
  initSidebarLiveClock();
  // Initialize Auth, Wallet & Financial Systems
  initAuth((user) => {
    initWallet(user);
  });
  initDeposits();
  initWithdrawals();
  initTransactions();
  initPayHeroPayments();

  // Global Trader Profile UI Synchronizer (Syncs custom name across Dashboard Greeting, Account Drawer & Header Avatars)
  window.syncTraderProfileUi = function() {
    const savedName = localStorage.getItem('arcadefx_trader_name') || (settingsStore ? settingsStore.get('traderName') : 'Trader') || 'Trader';
    const savedEmail = localStorage.getItem('arcadefx_trader_email') || (settingsStore ? settingsStore.get('traderEmail') : 'trader@arcadefx.io') || 'trader@arcadefx.io';

    // Welcome Greeting Name
    const nameEl = document.getElementById('userGreetingName');
    if (nameEl) nameEl.textContent = savedName;

    // Account Drawer Details
    const drawerNameEl = document.getElementById('drawerUserName');
    const drawerEmailEl = document.getElementById('drawerUserEmail');
    if (drawerNameEl) drawerNameEl.textContent = savedName;
    if (drawerEmailEl) drawerEmailEl.textContent = savedEmail;

    // Header Avatar Initials
    const avatars = document.querySelectorAll('.user-profile .avatar, .header-avatar, .user-avatar');
    if (avatars.length > 0) {
      const parts = savedName.trim().split(' ').filter(Boolean);
      let initials = 'TR';
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length > 0) {
        initials = parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
      }
      avatars.forEach(av => av.textContent = initials);
    }
  };

  window.syncTraderProfileUi();

  // Verify Market Intelligence Stream Status
  ApiClient.checkHealth().then(health => {
    if (health.status === 'healthy') {
      console.log(`[Arcade FX Market Intelligence Engine] Online — Live Stream Synchronised`);
    } else {
      console.warn('[Arcade FX Market Intelligence Engine] Operating in Offline Workspace Mode:', health.error);
    }
  });

  // Initialize Signals Grid Controller if on Signals page
  if (document.getElementById('signalsGridContainer')) {
    window.signalsController = new SignalsController();
  }

  // Initialize Alerts Workspace Controller if on Alerts page
  if (document.getElementById('activeAlertsContainer') || document.getElementById('createAlertForm')) {
    window.alertsController = new AlertsController();
  }

  // Initialize Core Orchestrator & Managers
  const engine = new ArcadeEngine();
  const dashEnhancement = new DashboardEnhancement(engine);
  const motionEngine = new MotionEngine();
  const pwaManager = new PWAManager();
  let settingsCenter = null;

  // View Navigation Router
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const dashboardWorkspace = document.getElementById('dashboardWorkspace');
  const genericWorkspace = document.getElementById('genericWorkspace');
  const settingsWorkspaceContainer = document.getElementById('settingsWorkspaceContainer');

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarNav = document.getElementById('sidebarNav');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');

  // Desktop sidebar preference: keep the compact rail choice across workspace routes.
  const sidebarPreferenceKey = 'arcadefx_sidebar_collapsed';
  const desktopSidebarQuery = window.matchMedia('(min-width: 1025px)');
  const setSidebarCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed && desktopSidebarQuery.matches);
    if (sidebarToggleBtn) {
      const action = collapsed ? 'Expand' : 'Collapse';
      sidebarToggleBtn.setAttribute('aria-expanded', String(!collapsed));
      sidebarToggleBtn.setAttribute('aria-label', `${action} sidebar`);
      sidebarToggleBtn.setAttribute('title', `${action} sidebar`);
    }
  };

  const savedSidebarPreference = localStorage.getItem(sidebarPreferenceKey) === 'true';
  setSidebarCollapsed(savedSidebarPreference);

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      const collapsed = !document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem(sidebarPreferenceKey, String(collapsed));
      setSidebarCollapsed(collapsed);
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 210);
    });
  }

  // Labels remain available to assistive technology; provide a native tooltip in rail mode.
  navItems.forEach((item) => {
    const label = item.querySelector('span')?.textContent?.trim();
    if (label) {
      item.setAttribute('aria-label', label);
      item.setAttribute('title', label);
    }
  });

  desktopSidebarQuery.addEventListener('change', () => setSidebarCollapsed(
    localStorage.getItem(sidebarPreferenceKey) === 'true'
  ));

  // Mobile Drawer Toggle Lifecycle & Scroll Lock
  const openMobileMenu = () => {
    if (sidebarNav) sidebarNav.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
    document.body.classList.add('menu-open');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
  };

  const closeMobileMenu = () => {
    if (sidebarNav) sidebarNav.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
    document.body.classList.remove('menu-open');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
  };

  const toggleMobileMenu = () => {
    if (sidebarNav && sidebarNav.classList.contains('open')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  if (mobileMenuBtn) mobileMenuBtn.onclick = toggleMobileMenu;
  if (sidebarOverlay) sidebarOverlay.onclick = closeMobileMenu;

  // Keyboard Accessibility — Close mobile menu/drawer on ESC key & Ctrl+K search focus
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) searchInput.focus();
    }
    if (e.key === 'Escape') {
      closeMobileMenu();
      if (notificationsPopover && notificationsPopover.classList.contains('show')) {
        notificationsPopover.classList.remove('show');
      }
    }
  });

  // Header User Profile & Account Drawer Click Binding
  const userProfileEl = document.querySelector('.user-profile');
  if (userProfileEl) {
    userProfileEl.style.cursor = 'pointer';
    userProfileEl.setAttribute('title', 'Open Trader Account Drawer');
    userProfileEl.addEventListener('click', () => {
      const drawer = document.getElementById('accountDrawerBackdrop');
      if (drawer) drawer.classList.add('show');
    });
  }

  // Navigation Click & Keyboard Handling
  const resolveTargetUrl = (href) => {
    if (!href) return '';
    return href.replace(/index\.php\?page=(\w+)/, 'index.html?page=$1')
               .replace(/\.php(\?.*)?$/, '.html$1');
  };

  navItems.forEach(item => {
    // Support Space / Enter key navigation
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });

    item.addEventListener('click', (e) => {
      const page = item.getAttribute('data-page');
      const action = item.getAttribute('data-action');
      const rawHref = item.getAttribute('href');

      if (page === 'logout') {
        // Handled dynamically by auth.js
        return;
      }

      if (action) {
        e.preventDefault();
        closeMobileMenu();
        if (action === 'account-drawer') {
          const drawer = document.getElementById('accountDrawerBackdrop');
          if (drawer) drawer.classList.add('show');
        } else if (action === 'deposit-modal') {
          const modal = document.getElementById('depositModalBackdrop');
          if (modal) modal.classList.add('show');
        } else if (action === 'withdraw-modal') {
          const modal = document.getElementById('withdrawalModalBackdrop');
          if (modal) modal.classList.add('show');
        } else if (action === 'transactions-modal') {
          const modal = document.getElementById('txHistoryModalBackdrop');
          if (modal) modal.classList.add('show');
        }
        return;
      }

      const currentPath = window.location.pathname;
      const currentFilename = currentPath.split('/').pop() || 'index.html';

      if (rawHref && rawHref.includes('#')) {
        const hashPart = rawHref.substring(rawHref.indexOf('#'));
        const filePart = rawHref.substring(0, rawHref.indexOf('#'));
        const targetFilename = filePart.split('/').pop() || 'index.html';

        if (targetFilename === currentFilename || !filePart) {
          e.preventDefault();
          closeMobileMenu();
          const targetEl = document.querySelector(hashPart);
          if (targetEl) {
            if (dashboardWorkspace) dashboardWorkspace.style.display = 'flex';
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        } else {
          e.preventDefault();
          window.location.href = resolveTargetUrl(rawHref);
          return;
        }
      }

      if (rawHref && !rawHref.startsWith('#')) {
        const targetUrl = resolveTargetUrl(rawHref);
        const targetFilename = targetUrl.split('?')[0].split('/').pop();

        // If target file is different from current page file, navigate to target page
        if (targetFilename && targetFilename !== currentFilename) {
          e.preventDefault();
          window.location.href = targetUrl;
          return;
        }
      }

      e.preventDefault();

      navItems.forEach(i => {
        i.classList.remove('active');
        i.removeAttribute('aria-current');
      });

      item.classList.add('active');
      item.setAttribute('aria-current', 'page');

      // Close mobile drawer on item select
      closeMobileMenu();

      // Hide all workspace views
      if (dashboardWorkspace) dashboardWorkspace.style.display = 'none';
      if (genericWorkspace) genericWorkspace.style.display = 'none';
      if (settingsWorkspaceContainer) settingsWorkspaceContainer.style.display = 'none';

      if (page === 'chart') {
        if (dashboardWorkspace) dashboardWorkspace.style.display = 'flex';
        
        const chartCard = document.getElementById('chartCard');
        if (chartCard) {
          if (chartCard.requestFullscreen) {
            chartCard.requestFullscreen().catch(() => {
              chartCard.classList.add('is-fullscreen');
            });
          } else {
            chartCard.classList.add('is-fullscreen');
          }
        }
      } else if (page === 'settings') {
        if (settingsWorkspaceContainer) settingsWorkspaceContainer.style.display = 'flex';
        if (!settingsCenter && settingsWorkspaceContainer) {
          settingsCenter = new SettingsCenter(settingsWorkspaceContainer);
        }
      } else if (page === 'dashboard' || page === 'smc' || page === 'top-signal' || page === 'market-intelligence') {
        if (dashboardWorkspace) dashboardWorkspace.style.display = 'flex';
      } else {
        if (genericWorkspace) {
          genericWorkspace.style.display = 'flex';
          renderGenericPage(page, genericWorkspace, engine);
        }
      }
    });
  });

  // Check initial URL parameters for page views (e.g. index.html?page=settings)
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = urlParams.get('page');
  if (initialPage) {
    const targetNavItem = document.querySelector(`.sidebar-nav .nav-item[data-page="${initialPage}"]`);
    if (targetNavItem) {
      targetNavItem.click();
    }
  }

  // Notifications Popover Toggle
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notificationsPopover = document.getElementById('notificationsPopover');

  if (notificationsBtn && notificationsPopover) {
    notificationsPopover.classList.remove('show');
    notificationsBtn.onclick = (e) => {
      e.stopPropagation();
      notificationsPopover.classList.toggle('show');
    };

    document.addEventListener('click', (e) => {
      if (!notificationsPopover.contains(e.target) && e.target !== notificationsBtn) {
        notificationsPopover.classList.remove('show');
      }
    });
  }

  // Chart Mode Switcher Buttons (TradingView vs Arcade SMC Canvas)
  const modeTvBtn = document.getElementById('modeTvBtn');
  const modeCanvasBtn = document.getElementById('modeCanvasBtn');

  if (modeTvBtn) modeTvBtn.onclick = () => engine.setEngineMode('TV');
  if (modeCanvasBtn) modeCanvasBtn.onclick = () => engine.setEngineMode('CANVAS');

  // Indicators Dropdown Menu
  const indicatorsMenuBtn = document.getElementById('indicatorsMenuBtn');
  const indicatorsDropdown = document.getElementById('indicatorsDropdown');

  if (indicatorsMenuBtn && indicatorsDropdown) {
    indicatorsMenuBtn.onclick = (e) => {
      e.stopPropagation();
      indicatorsDropdown.classList.toggle('show');
    };

    document.addEventListener('click', (e) => {
      if (!indicatorsDropdown.contains(e.target) && e.target !== indicatorsMenuBtn) {
        indicatorsDropdown.classList.remove('show');
      }
    });

    const studyItems = indicatorsDropdown.querySelectorAll('.dropdown-item');
    studyItems.forEach(item => {
      item.onclick = () => {
        const study = item.getAttribute('data-study');
        if (study && engine.tvManager) {
          engine.tvManager.toggleStudy(study);
        }
        indicatorsDropdown.classList.remove('show');
      };
    });
  }

  // Header Quick Theme Toggle Button
  const headerThemeToggleBtn = document.getElementById('headerThemeToggleBtn');
  const themeToggleIcon = document.getElementById('themeToggleIcon');

  const updateHeaderThemeIcon = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeToggleIcon) {
      themeToggleIcon.innerText = isDark ? '🌙' : '☀️';
    }
  };
  updateHeaderThemeIcon();

  if (headerThemeToggleBtn) {
    headerThemeToggleBtn.onclick = () => {
      const current = settingsStore.get('theme') || 'dark';
      const effective = settingsStore.resolveEffectiveTheme();
      const nextTheme = effective === 'dark' ? 'light' : 'dark';
      settingsStore.set('theme', nextTheme);
      updateHeaderThemeIcon();
    };
  }

  // Subscribe SettingsStore Theme Changes to Sync TradingView Widget & Chart Canvas
  settingsStore.subscribe(() => {
    updateHeaderThemeIcon();
    if (engine.tvManager) {
      engine.tvManager.createWidget();
    }
    if (engine.chartEngine) {
      engine.chartEngine.render();
    }
  });

  // Fullscreen Chart Button & Exit Fullscreen (Native & CSS Fallback)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const chartCard = document.getElementById('chartCard');

  if (fullscreenBtn && chartCard) {
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || chartCard.classList.contains('is-fullscreen'));
      
      if (isFS) {
        chartCard.classList.add('is-fullscreen');
        fullscreenBtn.innerText = '🗗 Exit Fullscreen';
        fullscreenBtn.setAttribute('aria-label', 'Exit fullscreen chart mode');
      } else {
        chartCard.classList.remove('is-fullscreen');
        fullscreenBtn.innerText = '⛶ Fullscreen';
        fullscreenBtn.setAttribute('aria-label', 'Open fullscreen chart mode');
      }

      // Trigger resize for both TV and SMC Canvas on SAME chart instance
      setTimeout(() => {
        if (engine.tvManager) engine.tvManager.createWidget();
        if (engine.chartEngine) engine.chartEngine.resizeCanvas();
      }, 50);
    };

    fullscreenBtn.onclick = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isFS && !chartCard.classList.contains('is-fullscreen')) {
        if (chartCard.requestFullscreen) {
          chartCard.requestFullscreen().catch(() => chartCard.classList.toggle('is-fullscreen'));
        } else if (chartCard.webkitRequestFullscreen) {
          chartCard.webkitRequestFullscreen();
        } else if (chartCard.mozRequestFullScreen) {
          chartCard.mozRequestFullScreen();
        } else if (chartCard.msRequestFullscreen) {
          chartCard.msRequestFullscreen();
        } else {
          chartCard.classList.toggle('is-fullscreen');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => chartCard.classList.remove('is-fullscreen'));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        chartCard.classList.remove('is-fullscreen');
      }
      handleFullscreenChange();
    };

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evtName => {
      document.addEventListener(evtName, handleFullscreenChange);
    });
  }

  // Chart Type Selector
  const chartTypeSelect = document.getElementById('chartTypeSelect');
  if (chartTypeSelect) {
    chartTypeSelect.value = settingsStore.get('chartType') || 'CANDLESTICK';
    chartTypeSelect.addEventListener('change', (e) => {
      engine.setChartType(e.target.value);
    });
  }

  // Symbol Selector
  const symbolSelect = document.getElementById('symbolSelect');
  if (symbolSelect) {
    symbolSelect.addEventListener('change', (e) => {
      engine.setSymbol(e.target.value);
    });
  }

  // Segmented Timeframe Buttons
  const tfBtns = document.querySelectorAll('.segmented-control .seg-btn');
  tfBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tfBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tf = btn.getAttribute('data-tf');
      if (tf) {
        engine.setTimeframe(tf);
      }
    });
  });

  // Playback Controls (for Arcade SMC Canvas Replay Mode)
  const playBtn = document.getElementById('playBtn');
  const stepBtn = document.getElementById('stepBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (engine.dataEngine.isPlaying) {
        engine.dataEngine.pause();
        playBtn.innerText = '▶️ Play';
        playBtn.classList.remove('active');
      } else {
        engine.dataEngine.play();
        playBtn.innerText = '⏸️ Pause';
        playBtn.classList.add('active');
      }
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      engine.dataEngine.pause();
      if (playBtn) playBtn.innerText = '▶️ Play';
      engine.dataEngine.step();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      engine.dataEngine.reset();
      if (playBtn) playBtn.innerText = '▶️ Play';
    });
  }

  // Global Search Input
  const globalSearchInput = document.getElementById('globalSearchInput');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toUpperCase();
      if (q && q.length >= 2) {
        const matchingSelect = Array.from(symbolSelect.options).find(opt => opt.value.includes(q) || opt.text.toUpperCase().includes(q));
        if (matchingSelect) {
          symbolSelect.value = matchingSelect.value;
          engine.setSymbol(matchingSelect.value);
        }
      }
    });
  }
});

function renderGenericPage(page, container, engine) {
  const symbol = engine.dataEngine.symbol;
  container.innerHTML = `
    <div class="card" style="padding: 24px;">
      <div class="card-heading" style="font-size: 16px; margin-bottom: 8px;">${page.toUpperCase()} WORKSPACE — ${symbol}</div>
      <div class="card-subheading">TradingView real-time institutional analysis view for ${page} on active symbol ${symbol}.</div>
      <div style="padding: 20px 0; color: var(--text-muted); font-size: 13px;">
        Institutional SMC multi-timeframe engine operating live. All TradingView indicators, 5AM CRT ranges, 1H FVGs, Order Blocks, and Pearson DXY correlation parameters active.
      </div>
      <button class="btn-primary" onclick="document.querySelector('[data-page=dashboard]').click()">Return to Main Dashboard</button>
    </div>
  `;
}
