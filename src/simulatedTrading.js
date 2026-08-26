/**
 * simulatedTrading.js — Arcade FX Paper / Simulated Trading Core Engine
 * Manages virtual trading balance, simulated BUY/SELL orders, live P&L tracking,
 * position closing, and trade history ledger. Completely isolated from real payments.
 */

export const DEFAULT_DEMO_BALANCE = 10000;
const STORAGE_KEY = 'arcadefx_simulated_trading_account_v1';

class SimulatedTradingEngine {
  constructor() {
    this.listeners = new Set();
    this.symbolContractSizes = {
      EURUSD: 100000,
      GBPUSD: 100000,
      USDJPY: 100000,
      USDCHF: 100000,
      USDCAD: 100000,
      AUDUSD: 100000,
      NZDUSD: 100000,
      XAUUSD: 100,    // 100 oz per lot
      XAGUSD: 5000,   // 5000 oz per lot
      BTCUSD: 1,      // 1 BTC per lot
      ETHUSD: 1,      // 1 ETH per lot
      DXY: 100
    };

    this.symbolPrices = {
      EURUSD: 1.0850,
      GBPUSD: 1.2950,
      USDJPY: 154.20,
      USDCHF: 0.8840,
      USDCAD: 1.3520,
      AUDUSD: 0.6580,
      NZDUSD: 0.5980,
      XAUUSD: 2450.50,
      XAGUSD: 28.50,
      BTCUSD: 64200.00,
      ETHUSD: 3450.00,
      DXY: 104.20
    };

    this.state = this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.balance === 'number' && Array.isArray(parsed.positions)) {
          return {
            balance: parsed.balance,
            positions: parsed.positions,
            history: parsed.history || []
          };
        }
      }
    } catch (e) {
      console.warn('[SimulatedTradingEngine] Error loading state, fallback to default:', e.message);
    }

    return {
      balance: DEFAULT_DEMO_BALANCE,
      positions: [],
      history: []
    };
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance: this.state.balance,
        positions: this.state.positions,
        history: this.state.history
      }));
    } catch (e) {
      console.warn('[SimulatedTradingEngine] Error saving state:', e.message);
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getAccountSummary());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const summary = this.getAccountSummary();
    this.listeners.forEach(cb => {
      try { cb(summary); } catch (err) { console.error(err); }
    });
  }

  updateLivePrice(symbol, price) {
    if (!symbol || !Number.isFinite(price) || price <= 0) return;
    this.symbolPrices[symbol] = price;
    this.recalculatePnl();
    this.notify();
  }

  recalculatePnl() {
    this.state.positions.forEach(pos => {
      const currentPrice = this.symbolPrices[pos.symbol] || pos.entryPrice;
      pos.currentPrice = currentPrice;
      const contractSize = this.symbolContractSizes[pos.symbol] || 100000;

      if (pos.side === 'BUY') {
        pos.unrealizedPnl = (currentPrice - pos.entryPrice) * pos.lots * contractSize;
      } else {
        pos.unrealizedPnl = (pos.entryPrice - currentPrice) * pos.lots * contractSize;
      }
    });
  }

  getAccountSummary() {
    this.recalculatePnl();
    const totalUnrealizedPnl = this.state.positions.reduce((acc, pos) => acc + (pos.unrealizedPnl || 0), 0);
    const equity = this.state.balance + totalUnrealizedPnl;

    return {
      balance: this.state.balance,
      equity: equity,
      unrealizedPnl: totalUnrealizedPnl,
      positionsCount: this.state.positions.length,
      positions: [...this.state.positions],
      history: [...this.state.history]
    };
  }

  depositVirtualFunds(amount) {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) {
      return { success: false, error: 'Please enter a valid positive deposit amount.' };
    }

    this.state.balance += val;
    this.saveState();
    return {
      success: true,
      message: `Successfully deposited +$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} virtual funds.`,
      newBalance: this.state.balance
    };
  }

  executeTrade({ symbol, side, lots, entryPrice }) {
    if (!symbol || !['BUY', 'SELL'].includes(side)) {
      return { success: false, error: 'Invalid trading direction or instrument.' };
    }

    const lotVal = Number(lots);
    if (!Number.isFinite(lotVal) || lotVal <= 0 || lotVal > 100) {
      return { success: false, error: 'Lot size must be between 0.01 and 100 lots.' };
    }

    const price = Number(entryPrice) || this.symbolPrices[symbol] || 1.0;

    const newPosition = {
      id: 'SIM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      symbol: symbol,
      side: side,
      lots: lotVal,
      entryPrice: price,
      currentPrice: price,
      unrealizedPnl: 0,
      openedAt: new Date().toISOString()
    };

    this.state.positions.unshift(newPosition);
    this.saveState();

    return {
      success: true,
      message: `Executed simulated ${side} ${lotVal} ${symbol} at ${price.toFixed(symbol.endsWith('JPY') ? 2 : 4)}`,
      position: newPosition
    };
  }

  closePosition(positionId) {
    const index = this.state.positions.findIndex(p => p.id === positionId);
    if (index === -1) {
      return { success: false, error: 'Position not found.' };
    }

    const pos = this.state.positions[index];
    const exitPrice = this.symbolPrices[pos.symbol] || pos.currentPrice || pos.entryPrice;
    const contractSize = this.symbolContractSizes[pos.symbol] || 100000;

    let realizedPnl = 0;
    if (pos.side === 'BUY') {
      realizedPnl = (exitPrice - pos.entryPrice) * pos.lots * contractSize;
    } else {
      realizedPnl = (pos.entryPrice - exitPrice) * pos.lots * contractSize;
    }

    // Settle realized P&L into virtual balance
    this.state.balance += realizedPnl;

    const closedTrade = {
      id: pos.id,
      symbol: pos.symbol,
      side: pos.side,
      lots: pos.lots,
      entryPrice: pos.entryPrice,
      exitPrice: exitPrice,
      realizedPnl: realizedPnl,
      openedAt: pos.openedAt,
      closedAt: new Date().toISOString()
    };

    this.state.positions.splice(index, 1);
    this.state.history.unshift(closedTrade);
    this.saveState();

    return {
      success: true,
      message: `Closed ${pos.side} ${pos.symbol} position. Realized P/L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)}`,
      trade: closedTrade
    };
  }

  resetAccount() {
    this.state = {
      balance: DEFAULT_DEMO_BALANCE,
      positions: [],
      history: []
    };
    this.saveState();
  }
}

export const simulatedTrading = new SimulatedTradingEngine();
if (typeof window !== 'undefined') {
  window.simulatedTrading = simulatedTrading;
}
