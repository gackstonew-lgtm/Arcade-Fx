/**
 * tools.js — Arcade FX Functional Trading Tools Engine
 * Handles deterministic mathematical calculations with explicit [ Calculate ] buttons.
 */

import { RiskManagement } from './modules/RiskManagement.js';
import './workspaceShell.js';

const $ = (id) => document.getElementById(id);
const num = (id) => {
  const el = $(id);
  return el ? parseFloat(el.value) : NaN;
};
const str = (id) => {
  const el = $(id);
  return el ? el.value : '';
};

// 1. Pip Value Calculation
function calculatePipValue() {
  const lots = num('pipLots');
  const symbol = str('pipSymbol');
  const resultEl = $('pipResult');
  if (!resultEl) return;

  if (!Number.isFinite(lots) || lots <= 0) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter a positive lot size (e.g. 1.00).</span>';
    return;
  }

  let pipValPerLot = 10;
  if (symbol.endsWith('JPY')) {
    pipValPerLot = 6.48; // Approx USDJPY 154.20
  } else if (symbol === 'XAUUSD') {
    pipValPerLot = 10; // $0.10 per 0.01 change * 100 oz = $10/pip
  } else if (symbol === 'BTCUSD') {
    pipValPerLot = 1; // $1.00 per $1 price move per BTC
  }

  const totalPipVal = pipValPerLot * lots;
  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">⚡ Pip Value: <span style="color:#10B981;">$${totalPipVal.toFixed(2)} per pip</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      Standard Lot (1.0): $${pipValPerLot.toFixed(2)}/pip · Mini Lot (0.1): $${(pipValPerLot / 10).toFixed(2)}/pip · Micro Lot (0.01): $${(pipValPerLot / 100).toFixed(2)}/pip
    </div>
  `;
}

// 2. Risk-To-Reward Calculation
function calculateRiskReward() {
  const direction = str('rrDirection');
  const entry = num('rrEntry');
  const stop = num('rrStop');
  const target = num('rrTarget');
  const resultEl = $('rrResult');
  if (!resultEl) return;

  if (![entry, stop, target].every(Number.isFinite)) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter valid entry, stop loss, and take profit prices.</span>';
    return;
  }

  const isValid = direction === 'BUY' ? (stop < entry && target > entry) : (stop > entry && target < entry);
  if (!isValid) {
    resultEl.innerHTML = `<span style="color:#EF4444; font-weight:700;">⚠️ For a ${direction}, ${direction === 'BUY' ? 'stop must be below entry and target above entry' : 'stop must be above entry and target below entry'}.</span>`;
    return;
  }

  const riskDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  const rrRatio = rewardDist / riskDist;

  const isForex = entry < 50;
  const multiplier = isForex ? 10000 : 10;
  const riskPips = riskDist * multiplier;
  const rewardPips = rewardDist * multiplier;

  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">🎯 Risk:Reward Ratio: <span style="color:#60A5FA;">1 : ${rrRatio.toFixed(2)}</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      Risk Distance: ${riskPips.toFixed(1)} pips (${riskDist.toFixed(4)}) | Reward Distance: ${rewardPips.toFixed(1)} pips (${rewardDist.toFixed(4)})
    </div>
  `;
}

// 3. Position Size Calculation
function calculatePositionSize() {
  const balance = num('positionBalance');
  const riskPct = num('positionRisk');
  const entry = num('positionEntry');
  const stop = num('positionStop');
  const resultEl = $('positionResult');
  if (!resultEl) return;

  if (![balance, riskPct, entry, stop].every(Number.isFinite) || balance <= 0 || riskPct <= 0 || entry === stop) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter positive balance, risk %, and valid entry & stop loss prices.</span>';
    return;
  }

  const calc = RiskManagement.calculate(balance, riskPct, entry, stop);
  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">📐 Recommended Size: <span style="color:#10B981;">${calc.lotSize} Standard Lots</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      Max Cash Risk: $${calc.riskAmount.toFixed(2)} (${riskPct}%) | Stop Distance: ${calc.distancePips} pips
    </div>
  `;
}

// 4. Profit / Loss Calculation
function calculateProfitLoss() {
  const side = str('profitSide');
  const lots = num('profitLots');
  const openPrice = num('profitOpen');
  const closePrice = num('profitClose');
  const resultEl = $('profitResult');
  if (!resultEl) return;

  if (![lots, openPrice, closePrice].every(Number.isFinite) || lots <= 0) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter positive lot size and valid open & close prices.</span>';
    return;
  }

  const contractSize = openPrice > 1000 ? 100 : 100000;
  const pnl = side === 'BUY'
    ? (closePrice - openPrice) * lots * contractSize
    : (openPrice - closePrice) * lots * contractSize;

  const isProfit = pnl >= 0;
  const diffPips = Math.abs(closePrice - openPrice) * (openPrice < 50 ? 10000 : 10);

  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">💰 Estimated Net P&L: <span style="color:${isProfit ? '#10B981' : '#EF4444'};">${isProfit ? '+' : ''}$${pnl.toFixed(2)}</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      Market Move: ${diffPips.toFixed(1)} pips | Trade Volume: ${lots} lot(s)
    </div>
  `;
}

// 5. Required Margin Calculation
function calculateRequiredMargin() {
  const leverage = num('marginLeverage');
  const lots = num('marginLots');
  const price = num('marginPrice');
  const resultEl = $('marginResult');
  if (!resultEl) return;

  if (![leverage, lots, price].every(Number.isFinite) || lots <= 0 || leverage <= 0) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter valid leverage, lot size, and price.</span>';
    return;
  }

  const contractSize = price > 1000 ? 100 : 100000;
  const requiredMargin = (lots * contractSize * price) / leverage;

  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">⚖️ Required Margin: <span style="color:#60A5FA;">$${requiredMargin.toFixed(2)} USD</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      Notional Value: $${(lots * contractSize * price).toLocaleString('en-US', { maximumFractionDigits: 2 })} | Leverage: 1:${leverage}
    </div>
  `;
}

// 6. Currency Converter Calculation
function calculateCurrencyConversion() {
  const from = str('convertFrom');
  const to = str('convertTo');
  const amount = num('convertAmount');
  const resultEl = $('convertResult');
  if (!resultEl) return;

  if (!Number.isFinite(amount) || amount <= 0) {
    resultEl.innerHTML = '<span style="color:#EF4444; font-weight:700;">⚠️ Please enter a positive conversion amount.</span>';
    return;
  }

  const ratesToUsd = {
    USD: 1.0,
    EUR: 1.0850,
    GBP: 1.2950,
    KES: 1 / 129.50
  };

  const fromRate = ratesToUsd[from] || 1.0;
  const toRate = ratesToUsd[to] || 1.0;
  const usdAmount = amount * fromRate;
  const converted = usdAmount / toRate;
  const effectiveRate = fromRate / toRate;

  resultEl.innerHTML = `
    <div style="color:var(--text-dark); font-weight:800; font-size:13px;">💱 Converted Value: <span style="color:#10B981;">${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}</span></div>
    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">
      ${amount} ${from} @ Exchange Rate 1 ${from} = ${effectiveRate.toFixed(4)} ${to}
    </div>
  `;
}

// Bind Calculate Buttons
document.addEventListener('DOMContentLoaded', () => {
  const btnPip = $('btnCalcPip');
  if (btnPip) btnPip.addEventListener('click', calculatePipValue);

  const btnRR = $('btnCalcRR');
  if (btnRR) btnRR.addEventListener('click', calculateRiskReward);

  const btnPosition = $('btnCalcPosition');
  if (btnPosition) btnPosition.addEventListener('click', calculatePositionSize);

  const btnProfit = $('btnCalcProfit');
  if (btnProfit) btnProfit.addEventListener('click', calculateProfitLoss);

  const btnMargin = $('btnCalcMargin');
  if (btnMargin) btnMargin.addEventListener('click', calculateRequiredMargin);

  const btnConvert = $('btnCalcConvert');
  if (btnConvert) btnConvert.addEventListener('click', calculateCurrencyConversion);

  // Initial calculation run
  calculatePipValue();
  calculateRiskReward();
  calculatePositionSize();
  calculateProfitLoss();
  calculateRequiredMargin();
  calculateCurrencyConversion();
});
