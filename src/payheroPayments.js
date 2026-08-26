/**
 * ArcadeFX — PayHero Subscription & Payment Controller (src/payheroPayments.js)
 * Manages PayHero M-PESA STK Push & Card payment modal, phone validation,
 * status polling, and server-side entitlement synchronization.
 */

import { AuthState, openAuthModal } from './auth.js';
import { entitlementManager } from './data/EntitlementManager.js';

const SUBSCRIPTION_PLANS = {
  essential: { id: 'essential', name: 'Essential Signals', priceUsd: 15, priceKes: 1950, days: 30 },
  professional: { id: 'professional', name: 'Professional', priceUsd: 49, priceKes: 6320, days: 30 },
  pro: { id: 'professional', name: 'Professional', priceUsd: 49, priceKes: 6320, days: 30 },
  elite: { id: 'elite', name: 'Elite', priceUsd: 149, priceKes: 19200, days: 30 }
};

let currentSelectedPlanId = 'professional';
let currentSelectedMethod = 'mpesa';

export function initPayHeroPayments() {
  setupPayHeroModalListeners();
}

export function openPayHeroSubscriptionModal(planId = 'professional') {
  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const normalized = String(planId || 'professional').toLowerCase();
  currentSelectedPlanId = SUBSCRIPTION_PLANS[normalized] ? normalized : 'professional';

  const backdrop = document.getElementById('payheroSubModalBackdrop');
  if (backdrop) {
    backdrop.classList.add('show');
    backdrop.classList.add('active');
    resetPayHeroForm();
  }
}

export function closePayHeroSubscriptionModal() {
  const backdrop = document.getElementById('payheroSubModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('show');
    backdrop.classList.remove('active');
  }
}

function resetPayHeroForm() {
  const phoneInput = document.getElementById('payheroPhoneInput');
  const errBox = document.getElementById('payheroErrBox');
  const statusBox = document.getElementById('payheroStatusBox');
  const btnSubmitMpesa = document.getElementById('btnSubmitPayheroSub');
  const btnSubmitCard = document.getElementById('btnSubmitPayheroCard');
  const planSelect = document.getElementById('payheroPlanSelect');

  const planInfo = SUBSCRIPTION_PLANS[currentSelectedPlanId] || SUBSCRIPTION_PLANS.professional;
  if (planSelect) planSelect.value = planInfo.id;

  const modalBadge = document.querySelector('#payheroSubModalBackdrop .pwa-badge');
  if (modalBadge) {
    modalBadge.textContent = `${planInfo.name.toUpperCase()} • $${planInfo.priceUsd} / MONTH`;
  }

  const modalPrices = document.querySelectorAll('#payheroSubModalBackdrop .plan-price-display');
  modalPrices.forEach(el => {
    el.innerHTML = `$${planInfo.priceUsd} <span style="font-size: 10px; font-weight: 600; color: var(--text-muted);">/ mo</span>`;
  });

  const user = AuthState.getUser();
  const profile = AuthState.getProfile();
  if (phoneInput && profile?.phone) {
    phoneInput.value = profile.phone;
  }

  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';

  if (btnSubmitMpesa) {
    btnSubmitMpesa.disabled = false;
    btnSubmitMpesa.innerHTML = `<span>Pay with M-PESA STK Push ($${planInfo.priceUsd})</span> <span>→</span>`;
  }

  if (btnSubmitCard) {
    btnSubmitCard.disabled = false;
    btnSubmitCard.innerHTML = `<span>Pay $${planInfo.priceUsd} with Card</span> <span>→</span>`;
  }

  switchPaymentMethod('mpesa');
}

function switchPaymentMethod(method) {
  currentSelectedMethod = method;
  const mpesaCard = document.getElementById('payMethodMpesaCard');
  const cardPaymentCard = document.getElementById('payMethodCardPaymentCard');
  const mpesaForm = document.getElementById('payheroSubForm');
  const cardForm = document.getElementById('payheroCardForm');

  if (method === 'mpesa') {
    if (mpesaCard) {
      mpesaCard.style.border = '2px solid #2563EB';
      mpesaCard.style.background = 'rgba(37, 99, 235, 0.12)';
    }
    if (cardPaymentCard) {
      cardPaymentCard.style.border = '1px solid var(--border-card)';
      cardPaymentCard.style.background = 'var(--bg-card)';
    }
    if (mpesaForm) mpesaForm.style.display = 'block';
    if (cardForm) cardForm.style.display = 'none';
  } else {
    if (cardPaymentCard) {
      cardPaymentCard.style.border = '2px solid #2563EB';
      cardPaymentCard.style.background = 'rgba(37, 99, 235, 0.12)';
    }
    if (mpesaCard) {
      mpesaCard.style.border = '1px solid var(--border-card)';
      mpesaCard.style.background = 'var(--bg-card)';
    }
    if (cardForm) cardForm.style.display = 'block';
    if (mpesaForm) mpesaForm.style.display = 'none';
  }
}

async function handleMpesaSubmit(e) {
  e.preventDefault();

  const phoneInput = document.getElementById('payheroPhoneInput');
  const btnSubmit = document.getElementById('btnSubmitPayheroSub');
  const errBox = document.getElementById('payheroErrBox');
  const statusBox = document.getElementById('payheroStatusBox');
  const statusMsg = document.getElementById('payheroStatusMsg');

  const rawPhone = phoneInput?.value || '';
  const planInfo = SUBSCRIPTION_PLANS[currentSelectedPlanId] || SUBSCRIPTION_PLANS.professional;

  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';

  if (!rawPhone.trim()) {
    if (errBox) {
      errBox.textContent = 'Please enter your M-PESA phone number.';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-inline"></span> <span>Initiating PayHero STK Push...</span>';
  }

  try {
    const user = AuthState.getUser();
    const email = user?.email || localStorage.getItem('arcadefx_trader_email') || 'trader@arcadefx.io';

    const payload = {
      planId: planInfo.id,
      phoneNumber: rawPhone,
      email: email,
      userId: user?.id || 'user_' + Date.now()
    };

    const res = await fetch('/api/payhero-stk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to initiate PayHero M-PESA STK Push');
    }

    if (statusBox && statusMsg) {
      statusMsg.innerHTML = `
        <div style="text-align: center; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px;">
          <div style="font-size: 15px; font-weight: 800; color: #10B981; margin-bottom: 4px;">⚡ M-PESA STK Push Sent!</div>
          <div style="font-size: 13px; color: var(--text-dark);">Check phone <strong>${result.phoneNumber}</strong> and enter your M-PESA PIN for ${planInfo.name} ($${planInfo.priceUsd}).</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Reference: <code>${result.reference}</code></div>
        </div>
      `;
      statusBox.style.display = 'block';
    }

    pollPayHeroStatus(result.reference);

  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Payment request failed. Please try again.';
      errBox.style.display = 'block';
    }
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Pay with M-PESA STK Push ($${planInfo.priceUsd})</span> <span>→</span>`;
    }
  }
}

async function handleCardSubmit(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btnSubmitPayheroCard');
  const errBox = document.getElementById('payheroErrBox');
  const statusBox = document.getElementById('payheroStatusBox');
  const statusMsg = document.getElementById('payheroStatusMsg');
  const planInfo = SUBSCRIPTION_PLANS[currentSelectedPlanId] || SUBSCRIPTION_PLANS.professional;

  if (errBox) errBox.style.display = 'none';

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-inline"></span> <span>Connecting to PayHero Card Portal...</span>';
  }

  try {
    const user = AuthState.getUser();
    const email = user?.email || localStorage.getItem('arcadefx_trader_email') || 'trader@arcadefx.io';

    const payload = {
      planId: planInfo.id,
      paymentMethod: 'card',
      email: email,
      userId: user?.id || 'user_' + Date.now()
    };

    const res = await fetch('/api/payhero-stk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }

    if (statusBox && statusMsg) {
      statusMsg.innerHTML = `
        <div style="text-align: center; padding: 12px; background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 12px;">
          <div style="font-size: 15px; font-weight: 800; color: #3B82F6; margin-bottom: 4px;">💳 PayHero Card Portal Initiated</div>
          <div style="font-size: 13px; color: var(--text-dark);">Completing secure checkout for $${planInfo.priceUsd} USD...</div>
        </div>
      `;
      statusBox.style.display = 'block';
    }

    if (result.reference) {
      pollPayHeroStatus(result.reference);
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Card payment checkout error. Please try again.';
      errBox.style.display = 'block';
    }
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Pay $${planInfo.priceUsd} with Card</span> <span>→</span>`;
    }
  }
}

async function pollPayHeroStatus(reference) {
  const statusMsg = document.getElementById('payheroStatusMsg');
  const btnSubmit = document.getElementById('btnSubmitPayheroSub');
  const planInfo = SUBSCRIPTION_PLANS[currentSelectedPlanId] || SUBSCRIPTION_PLANS.professional;
  let attempts = 0;
  const maxAttempts = 20;

  const interval = setInterval(async () => {
    attempts++;

    try {
      const res = await fetch(`/api/payments?action=verify&reference=${encodeURIComponent(reference)}`);
      const data = await res.json();

      if (data.success && (data.status === 'completed' || data.status === 'SUCCESS')) {
        clearInterval(interval);

        await entitlementManager.checkEntitlement();

        if (statusMsg) {
          statusMsg.innerHTML = `
            <div style="text-align: center; padding: 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 12px;">
              <div style="font-size: 20px; font-weight: 800; color: #10B981;">🎉 PAYMENT SUCCESSFUL!</div>
              <div style="font-size: 14px; color: var(--text-dark); margin-top: 6px;">Your ArcadeFX ${planInfo.name} subscription is now active ($${planInfo.priceUsd}/month).</div>
            </div>
          `;
        }

        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>🚀 ACCESS PLATFORM NOW</span>';
          btnSubmit.onclick = () => {
            closePayHeroSubscriptionModal();
            if (window.signalsController) {
              window.signalsController.fetchLiveSignals();
            }
          };
        }
        return;
      } else if (data.success && (data.status === 'failed' || data.status === 'CANCELLED')) {
        clearInterval(interval);
        if (statusMsg) {
          statusMsg.innerHTML = `<div style="padding: 12px; color: #EF4444;">❌ <strong>PAYMENT FAILED.</strong><br>Your payment could not be completed. Please try again.</div>`;
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>TRY AGAIN</span>';
          btnSubmit.onclick = () => resetPayHeroForm();
        }
        return;
      }
    } catch (e) {
      console.warn('[PayHero] Status poll warning:', e);
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      if (statusMsg) {
        statusMsg.innerHTML = `<div style="padding: 12px; color: #F59E0B;">⌛ <strong>PAYMENT PROCESSING...</strong><br>We are waiting for payment confirmation from M-Pesa. Your access will update automatically once verified.</div>`;
      }
    }
  }, 3000);
}

function setupPayHeroModalListeners() {
  document.getElementById('payheroSubModalCloseBtn')?.addEventListener('click', closePayHeroSubscriptionModal);
  document.getElementById('payMethodMpesaCard')?.addEventListener('click', () => switchPaymentMethod('mpesa'));
  document.getElementById('payMethodCardPaymentCard')?.addEventListener('click', () => switchPaymentMethod('card'));
  document.getElementById('payheroSubForm')?.addEventListener('submit', handleMpesaSubmit);
  document.getElementById('payheroCardForm')?.addEventListener('submit', handleCardSubmit);

  document.querySelectorAll('.btn-trigger-payhero-sub, .btn-payhero-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = btn.getAttribute('data-plan') || 'professional';
      openPayHeroSubscriptionModal(plan);
    });
  });
}
