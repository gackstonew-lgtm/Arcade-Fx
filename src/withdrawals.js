/**
 * Arcade FX — Withdrawal System (src/withdrawals.js)
 * Manages user withdrawal requests, available balance checks,
 * Edge Function payout calls, and security validations.
 */

import { getSupabase } from './supabase.js';
import { AuthState, openAuthModal } from './auth.js';
import { WalletState, fetchWallet } from './wallet.js';

const EXCHANGE_RATE = 129.00; // 1 USD = 129.00 KES

export function initWithdrawals() {
  setupWithdrawalModalListeners();
}

export function openWithdrawalModal() {
  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const backdrop = document.getElementById('withdrawalModalBackdrop');
  if (backdrop) {
    backdrop.classList.add('active');
    resetWithdrawalForm();
  }
}

export function closeWithdrawalModal() {
  const backdrop = document.getElementById('withdrawalModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function resetWithdrawalForm() {
  const availBalance = WalletState.getAvailableBalance();
  const availElem = document.getElementById('wthAvailableVal');
  const amountInput = document.getElementById('wthAmountUsd');
  const phoneInput = document.getElementById('wthPhone');
  const errBox = document.getElementById('wthErrBox');
  const statusBox = document.getElementById('wthStatusBox');
  const btnSubmit = document.getElementById('btnSubmitWithdrawal');

  if (availElem) {
    availElem.textContent = `$${availBalance.toFixed(2)} USD`;
  }
  if (amountInput) amountInput.value = '10';
  if (phoneInput && AuthState.getProfile()?.phone) {
    phoneInput.value = AuthState.getProfile().phone;
  }
  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Request M-Pesa Payout</span> <span>→</span>';
  }

  updateWithdrawalCalculations();
}

function updateWithdrawalCalculations() {
  const amountInput = document.getElementById('wthAmountUsd');
  const previewKes = document.getElementById('wthPreviewKes');

  if (!amountInput || !previewKes) return;

  const usd = Number(amountInput.value) || 0;
  const kes = (usd * EXCHANGE_RATE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  previewKes.textContent = `≈ KES ${kes} (Rate: 1 USD = ${EXCHANGE_RATE} KES)`;
}

async function handleWithdrawalSubmit(e) {
  e.preventDefault();

  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  const amountUsdInput = document.getElementById('wthAmountUsd');
  const phoneInput = document.getElementById('wthPhone');
  const btnSubmit = document.getElementById('btnSubmitWithdrawal');
  const errBox = document.getElementById('wthErrBox');
  const statusBox = document.getElementById('wthStatusBox');

  const amountUsd = Number(amountUsdInput?.value || 0);
  const phone = phoneInput?.value || '';
  const availBalance = WalletState.getAvailableBalance();

  if (errBox) errBox.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';

  if (amountUsd < 5.00) {
    if (errBox) {
      errBox.textContent = 'Minimum withdrawal amount is $5.00 USD';
      errBox.style.display = 'block';
    }
    return;
  }

  if (amountUsd > availBalance) {
    if (errBox) {
      errBox.textContent = `Requested amount ($${amountUsd.toFixed(2)}) exceeds available balance ($${availBalance.toFixed(2)})`;
      errBox.style.display = 'block';
    }
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-inline"></span> <span>Processing Withdrawal...</span>';
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount_usd: amountUsd,
        phone_number: phone
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Withdrawal request failed');
    }

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.style.borderColor = 'var(--accent-bull)';
      statusBox.innerHTML = `🎉 <strong>Withdrawal Request Submitted!</strong><br>Payout of <strong>KES ${result.amount_kes.toLocaleString()}</strong> is being transferred to <code>${result.phone_number}</code>.<br>Ref: <code>${result.reference}</code>`;
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Done</span>';
      btnSubmit.onclick = () => closeWithdrawalModal();
    }

    // Refresh wallet
    if (AuthState.getUser()) {
      fetchWallet(AuthState.getUser().id);
    }

  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message || 'Withdrawal submission failed. Please try again.';
      errBox.style.display = 'block';
    }
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Request M-Pesa Payout</span> <span>→</span>';
    }
  }
}

function setupWithdrawalModalListeners() {
  document.getElementById('wthModalCloseBtn')?.addEventListener('click', closeWithdrawalModal);
  document.getElementById('wthAmountUsd')?.addEventListener('input', updateWithdrawalCalculations);
  document.getElementById('wthForm')?.addEventListener('submit', handleWithdrawalSubmit);

  document.querySelectorAll('.btn-withdraw-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openWithdrawalModal();
    });
  });
}
