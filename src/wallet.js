/**
 * Arcade FX — Wallet & Account Balance System (src/wallet.js)
 * Manages user balance, locked balance, realtime database subscriptions,
 * and currency displays.
 */

import { getSupabase } from './supabase.js';

let currentWallet = {
  id: null,
  balance: 0.00,
  locked_balance: 0.00,
  currency: 'USD'
};

let realtimeSubscription = null;

export const WalletState = {
  getWallet: () => currentWallet,
  getBalance: () => currentWallet.balance,
  getAvailableBalance: () => Math.max(0, currentWallet.balance - currentWallet.locked_balance),
  getLockedBalance: () => currentWallet.locked_balance,
  getCurrency: () => currentWallet.currency
};

export async function initWallet(user) {
  if (!user) {
    resetWalletUI();
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;

  // 1. Fetch initial wallet
  await fetchWallet(user.id);

  // 2. Subscribe to Realtime Postgres Changes on user's wallet
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
  }

  realtimeSubscription = supabase
    .channel(`wallet_changes_${user.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'wallets',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      if (payload.new) {
        currentWallet = {
          id: payload.new.id,
          balance: Number(payload.new.balance || 0),
          locked_balance: Number(payload.new.locked_balance || 0),
          currency: payload.new.currency || 'USD'
        };
        updateWalletUI();
      }
    })
    .subscribe();
}

export async function fetchWallet(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;

  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Wallet row not created yet -> create fallback
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: userId, currency: 'USD', balance: 0.00, locked_balance: 0.00 })
        .select()
        .single();

      if (newWallet) {
        currentWallet = {
          id: newWallet.id,
          balance: Number(newWallet.balance || 0),
          locked_balance: Number(newWallet.locked_balance || 0),
          currency: newWallet.currency || 'USD'
        };
      }
    } else if (wallet) {
      currentWallet = {
        id: wallet.id,
        balance: Number(wallet.balance || 0),
        locked_balance: Number(wallet.locked_balance || 0),
        currency: wallet.currency || 'USD'
      };
    }
  } catch (err) {
    console.error('[Wallet] Error fetching wallet balance:', err);
  }

  updateWalletUI();
}

export function updateWalletUI() {
  const formattedBalance = `$${currentWallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const availBalance = WalletState.getAvailableBalance();
  const formattedAvailable = `$${availBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Header balance in .user-profile
  const headerBalanceElem = document.getElementById('headerBalanceDisplay') || document.querySelector('.user-profile div div:last-child');
  if (headerBalanceElem) {
    headerBalanceElem.textContent = formattedBalance;
  }

  // Dashboard account balance DOM elements
  const dispAccountBal = document.getElementById('disp_accountBalanceVal');
  const accountBal = document.getElementById('accountBalanceVal');
  if (dispAccountBal) dispAccountBal.textContent = formattedBalance;
  if (accountBal) accountBal.textContent = formattedBalance;

  // Account Equity calculation (Cash Balance + Open Positions PnL)
  const equityValElem = document.getElementById('accountEquityVal');
  const dispEquityValElem = document.getElementById('disp_accountEquityVal');
  const equity = currentWallet.balance;
  const formattedEquity = `$${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (equityValElem) equityValElem.textContent = formattedEquity;
  if (dispEquityValElem) dispEquityValElem.textContent = formattedEquity;

  // Position Sizing Tools inputs
  const positionBalanceInput = document.getElementById('positionBalance');
  if (positionBalanceInput && currentWallet.balance > 0) {
    positionBalanceInput.value = currentWallet.balance;
  }

  const riskBalanceInput = document.getElementById('riskBalance');
  if (riskBalanceInput && currentWallet.balance > 0) {
    riskBalanceInput.value = currentWallet.balance;
  }

  // Drawer values
  const drawerBal = document.getElementById('drawerWalletBalance');
  const drawerAvail = document.getElementById('drawerAvailableBalance');
  const drawerLocked = document.getElementById('drawerLockedBalance');

  if (drawerBal) drawerBal.textContent = formattedBalance;
  if (drawerAvail) drawerAvail.textContent = formattedAvailable;
  if (drawerLocked) drawerLocked.textContent = `$${currentWallet.locked_balance.toFixed(2)}`;
}

export function resetWalletUI() {
  currentWallet = { id: null, balance: 0.00, locked_balance: 0.00, currency: 'USD' };
  const formattedBalance = '$0.00';

  const headerBalanceElem = document.querySelector('.user-profile div div:last-child');
  if (headerBalanceElem) headerBalanceElem.textContent = formattedBalance;

  const dispAccountBal = document.getElementById('disp_accountBalanceVal');
  const accountBal = document.getElementById('accountBalanceVal');
  if (dispAccountBal) dispAccountBal.textContent = formattedBalance;
  if (accountBal) accountBal.textContent = formattedBalance;
}
