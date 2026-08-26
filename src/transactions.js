/**
 * Arcade FX — Transaction Ledger History (src/transactions.js)
 * Fetches and renders financial history from wallet_transactions table.
 */

import { getSupabase } from './supabase.js';
import { AuthState, openAuthModal } from './auth.js';

export function initTransactions() {
  setupTransactionModalListeners();
}

export function openTransactionsModal() {
  if (!AuthState.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const backdrop = document.getElementById('txHistoryModalBackdrop');
  if (backdrop) {
    backdrop.classList.add('active');
    loadTransactions();
  }
}

export function closeTransactionsModal() {
  const backdrop = document.getElementById('txHistoryModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

export async function loadTransactions() {
  const supabase = getSupabase();
  const user = AuthState.getUser();
  const listContainer = document.getElementById('txHistoryList');
  const loadingElem = document.getElementById('txHistoryLoading');

  if (!supabase || !user || !listContainer) return;

  if (loadingElem) loadingElem.style.display = 'block';

  try {
    const { data: txs, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (loadingElem) loadingElem.style.display = 'none';

    if (error) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--accent-bear); padding: 20px;">Failed to load transaction history.</div>`;
      return;
    }

    if (!txs || txs.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px 10px;">No financial transactions found. Your deposits and withdrawals will appear here.</div>`;
      return;
    }

    let html = `
      <table class="tx-history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Reference</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
    `;

    txs.forEach(tx => {
      const dateStr = new Date(tx.created_at).toLocaleString();
      const isPositive = tx.type === 'deposit' || tx.type === 'withdrawal_refund' || tx.type === 'bonus';
      const amountStr = `${isPositive ? '+' : '-'}$${Number(tx.amount).toFixed(2)}`;
      const amountClass = isPositive ? 'tx-positive' : 'tx-negative';
      const statusClass = `status-badge status-${tx.status}`;

      html += `
        <tr>
          <td style="font-size: 11px; color: var(--text-muted);">${dateStr}</td>
          <td><span class="tx-type-tag type-${tx.type}">${formatTxType(tx.type)}</span></td>
          <td class="${amountClass}" style="font-weight: 700;">${amountStr}</td>
          <td><span class="${statusClass}">${tx.status}</span></td>
          <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${tx.reference}</td>
          <td style="font-size: 12px;">${tx.description || '-'}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    listContainer.innerHTML = html;

  } catch (err) {
    if (loadingElem) loadingElem.style.display = 'none';
    listContainer.innerHTML = `<div style="text-align: center; color: var(--accent-bear); padding: 20px;">Error fetching ledger history.</div>`;
  }
}

function formatTxType(type) {
  switch (type) {
    case 'deposit': return 'Deposit';
    case 'withdrawal': return 'Withdrawal';
    case 'withdrawal_refund': return 'Refund';
    case 'adjustment': return 'Adjustment';
    case 'bonus': return 'Bonus';
    case 'fee': return 'Fee';
    default: return type;
  }
}

function setupTransactionModalListeners() {
  document.getElementById('txHistoryModalCloseBtn')?.addEventListener('click', closeTransactionsModal);

  document.querySelectorAll('.btn-transactions-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openTransactionsModal();
    });
  });
}
