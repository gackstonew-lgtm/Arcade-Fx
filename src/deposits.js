/**
 * Arcade FX — Deposit System & Kora M-Pesa STK Integration (src/deposits.js)
 * Manages deposit modal flow, Edge Function API calls, M-Pesa STK Push countdown,
 * and status verification.
 */

import { getSupabase } from './supabase.js';
import { AuthState, openAuthModal } from './auth.js';
import { fetchWallet } from './wallet.js';

const EXCHANGE_RATE = 129.00; // 1 USD = 129.00 KES

export function initDeposits() {
  setupDepositModalListeners();
}

export function openDepositModal() {
  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const backdrop = document.getElementById('depositModalBackdrop');
  if (backdrop) {
    backdrop.classList.add('active');
    resetDepositForm();
  }
}

export function closeDepositModal() {
  const backdrop = document.getElementById('depositModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function resetDepositForm() {
  const amountInput = document.getElementById('depositAmountKes');
  const phoneInput = document.getElementById('depositPhone');
  const errBox = document.getElementById('depositErrBox');
  const statusBox = document.getElementById('depositStatusBox');
  const btnSubmit = document.getElementById('btnSubmitDeposit');

  if (amountInput) amountInput.value = '1000';
  if (phoneInput && AuthState.getProfile()?.phone) {
    phoneInput.value = AuthState.getProfile().phone;
  }
  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Initiate M-Pesa Deposit</span> <span>→</span>';
  }

  updateDepositCalculations();
}

function updateDepositCalculations() {
  const amountInput = document.getElementById('depositAmountKes');
  const previewUsd = document.getElementById('depositPreviewUsd');

  if (!amountInput || !previewUsd) return;

  const kes = Number(amountInput.value) || 0;
  const usd = (kes / EXCHANGE_RATE).toFixed(2);
  previewUsd.textContent = `$${usd} USD (Rate: 1 USD = ${EXCHANGE_RATE} KES)`;
}

async function handleDepositSubmit(e) {
  e.preventDefault();

  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const amountKesInput = document.getElementById('depositAmountKes');
  const phoneInput = document.getElementById('depositPhone');
  const btnSubmit = document.getElementById('btnSubmitDeposit');
  const errBox = document.getElementById('depositErrBox');
  const statusBox = document.getElementById('depositStatusBox');
  const statusMsg = document.getElementById('depositStatusMsg');

  const amountKes = Number(amountKesInput?.value || 0);
  const phone = phoneInput?.value || '';

  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';

  if (amountKes < 10) {
    if (errBox) {
      errBox.textContent = 'Minimum deposit amount is KES 10.00';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-inline"></span> <span>Connecting to Kora M-Pesa...</span>';
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount_kes: amountKes,
        phone_number: phone
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to initiate M-Pesa payment');
    }

    // Success initiating STK Push -> Show countdown status box
    if (statusBox && statusMsg) {
      statusMsg.innerHTML = `<strong>M-Pesa STK Push Sent!</strong><br>Check phone <code>${result.phone_number}</code> and enter your M-Pesa PIN.<br>Ref: <code>${result.reference}</code>`;
      statusBox.style.display = 'block';
    }

    // Start polling status for 60 seconds
    pollDepositStatus(result.reference, token);

  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Payment initiation failed. Please try again.';
      errBox.style.display = 'block';
    }
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Initiate M-Pesa Deposit</span> <span>→</span>';
    }
  }
}

async function pollDepositStatus(reference, token) {
  const supabase = getSupabase();
  const statusMsg = document.getElementById('depositStatusMsg');
  const btnSubmit = document.getElementById('btnSubmitDeposit');
  let attempts = 0;
  const maxAttempts = 20; // 20 * 3s = 60 seconds

  const interval = setInterval(async () => {
    attempts++;

    try {
      const res = await fetch(`${supabase.supabaseUrl}/functions/v1/verify-deposit?reference=${reference}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.status === 'completed') {
        clearInterval(interval);
        if (statusMsg) {
          statusMsg.innerHTML = `🎉 <strong>Deposit Successful!</strong><br>$${data.amount_usd} USD credited to your wallet.`;
          statusMsg.style.borderColor = 'var(--accent-bull)';
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>Done</span>';
          btnSubmit.onclick = () => closeDepositModal();
        }

        // Refresh user wallet
        if (AuthState.getUser()) {
          fetchWallet(AuthState.getUser().id);
        }
        return;
      } else if (data.success && data.status === 'failed') {
        clearInterval(interval);
        if (statusMsg) {
          statusMsg.innerHTML = `❌ <strong>Deposit Failed or Cancelled.</strong><br>Please try again.`;
          statusMsg.style.borderColor = 'var(--accent-bear)';
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>Try Again</span>';
          btnSubmit.onclick = () => resetDepositForm();
        }
        return;
      }
    } catch (e) {
      console.warn('[Deposits] Status poll warning:', e);
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      if (statusMsg) {
        statusMsg.innerHTML = `⌛ <strong>Payment Pending Confirmation</strong><br>Your balance will update automatically as soon as payment is confirmed by M-Pesa.`;
      }
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Close Window</span>';
        btnSubmit.onclick = () => closeDepositModal();
      }
    }
  }, 3000);
}

function setupDepositModalListeners() {
  document.getElementById('depositModalCloseBtn')?.addEventListener('click', closeDepositModal);
  document.getElementById('depositAmountKes')?.addEventListener('input', updateDepositCalculations);
  document.getElementById('depositForm')?.addEventListener('submit', handleDepositSubmit);

  // Trigger deposit buttons in UI
  document.querySelectorAll('.btn-deposit-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDepositModal();
    });
  });
}
