/**
 * IntelligenceWorkspace — a presentation layer over verified ArcadeEngine output.
 * It intentionally never creates prices, signals, news, calendar events, or AI claims.
 */
import { RiskManagement } from '../modules/RiskManagement.js';
import { MarketDataProvider } from '../data/MarketDataProvider.js';

const FACTORS = [
  'HTF Bias Aligned', 'Liquidity Sweep Swept Level', 'Market Structure Shift (MSS)',
  '1H FVG Active Zone', '1H Order Block Validated', '5AM CRT Range Aligned',
  'Volume SMA Expansion', 'ATR Body Expansion', 'Session Killzone Active', 'DXY Inverse Pearson Correlation'
];

export class IntelligenceWorkspace {
  constructor(container) {
    this.container = container;
    this.snapshot = null;
    this.renderShell();
  }

  renderShell() {
    this.container.innerHTML = `
      <section class="intelligence-grid" aria-label="Trading intelligence workspace">
        <article class="card intelligence-card">
          <div class="card-title"><span>SMART SETUP SCANNER</span><span id="scannerState" class="table-badge">WAITING</span></div>
          <p id="scannerBody" class="intelligence-empty">Waiting for validated analysis from the active workspace.</p>
        </article>
        <article class="card intelligence-card">
          <div class="card-title"><span>EXPLAINABLE CONFLUENCE</span><strong id="confluenceScore">—</strong></div>
          <div id="confluenceFactors" class="confluence-list"><p class="intelligence-empty">No analysis available.</p></div>
        </article>
        <article class="card intelligence-card">
          <div class="card-title"><span>TRADE PLAN</span><span id="planState" class="table-badge">NO SETUP</span></div>
          <div id="tradePlan" class="intelligence-empty">A plan is available only after the current engine validates a setup.</div>
        </article>
        <article class="card intelligence-card risk-calculator">
          <div class="card-title"><span>ADVANCED RISK CALCULATOR</span><span>Educational sizing only</span></div>
          <div class="risk-input-grid">
            <label>Balance<input id="riskBalance" type="number" min="0" step="0.01" value="10000"></label>
            <label>Risk %<input id="riskPercent" type="number" min="0.01" max="100" step="0.01" value="1"></label>
            <label>Entry<input id="riskEntry" type="number" min="0" step="any"></label>
            <label>Stop loss<input id="riskStop" type="number" min="0" step="any"></label>
            <label>Take profit<input id="riskTarget" type="number" min="0" step="any"></label>
          </div>
          <div id="riskResults" class="risk-results">Enter a valid entry and stop-loss to calculate risk.</div>
        </article>
        <article class="card intelligence-card copilot-card">
          <div class="card-title"><span>ARCADEFX MARKET COPILOT</span><span>Engine-grounded</span></div>
          <div id="copilotResponse" class="copilot-response">Ask about the active symbol's bias, confluence, session, or current trade plan. Provider-backed live data is not assumed.</div>
          <form id="copilotForm" class="copilot-form"><input id="copilotQuestion" aria-label="Ask the market copilot" placeholder="What is the current bias?"><button class="btn-primary" type="submit">Ask</button></form>
        </article>
        <article class="card intelligence-card unavailable-card">
          <div class="card-title"><span>ECONOMIC CALENDAR & NEWS SENTIMENT</span><span>Provider status</span></div>
          <p>Live calendar and news providers are not configured. No events, headlines, or sentiment are displayed until a verified server-side provider is connected.</p>
        </article>
      </section>`;
    this.bindRiskCalculator();
    this.bindCopilot();
  }

  update(snapshot) {
    this.snapshot = snapshot;
    const { symbol, scoring, entry, session } = snapshot;
    const score = this.container.querySelector('#confluenceScore');
    const scannerState = this.container.querySelector('#scannerState');
    const scannerBody = this.container.querySelector('#scannerBody');
    const factors = this.container.querySelector('#confluenceFactors');
    score.textContent = `${scoring.score}/100 · ${scoring.grade}`;
    factors.innerHTML = FACTORS.map((name) => {
      const active = scoring.factors.some((factor) => factor.name === name);
      const points = scoring.factors.find((factor) => factor.name === name)?.points || 0;
      return `<div class="confluence-factor ${active ? 'is-active' : ''}"><span>${active ? '✓' : '—'} ${name}</span><strong>${active ? `+${points}` : 'Missing'}</strong></div>`;
    }).join('');
    if (scoring.isTradeable) {
      scannerState.className = `table-badge ${scoring.direction}`;
      scannerState.textContent = `${scoring.grade} · ${scoring.score}`;
      scannerBody.textContent = `${symbol} ${scoring.direction} — ${scoring.factors.map((factor) => factor.name.replace(' Aligned', '')).slice(0, 3).join(' · ')}. Session: ${session.activeSession.replaceAll('_', ' ')}.`;
    } else {
      scannerState.className = 'table-badge';
      scannerState.textContent = 'NO VALID SETUP';
      scannerBody.textContent = `${symbol} has not met the configured confluence threshold. No setup is published.`;
    }
    this.renderPlan(entry, symbol);
    if (entry.isValid) this.prefillRisk(entry);
  }

  renderPlan(entry, symbol) {
    const state = this.container.querySelector('#planState');
    const plan = this.container.querySelector('#tradePlan');
    if (!entry.isValid) { state.textContent = 'NO SETUP'; plan.textContent = entry.reason || 'No validated trade plan.'; return; }
    state.className = `table-badge ${entry.direction}`;
    state.textContent = `${entry.grade} VALIDATED`;
    plan.innerHTML = `<dl class="plan-grid"><div><dt>Instrument</dt><dd>${symbol}</dd></div><div><dt>Direction</dt><dd>${entry.direction}</dd></div><div><dt>Entry</dt><dd>${entry.entryPrice}</dd></div><div><dt>Stop loss</dt><dd>${entry.stopLoss}</dd></div><div><dt>TP1</dt><dd>${entry.takeProfit1}</dd></div><div><dt>TP2</dt><dd>${entry.takeProfit2}</dd></div><div><dt>R:R</dt><dd>${entry.riskRewardRatio}</dd></div><div><dt>Invalidation</dt><dd>Stop-loss reached</dd></div></dl>`;
  }

  prefillRisk(entry) {
    this.container.querySelector('#riskEntry').value = entry.entryPrice;
    this.container.querySelector('#riskStop').value = entry.stopLoss;
    this.container.querySelector('#riskTarget').value = entry.takeProfit2;
    this.calculateRisk();
  }

  bindRiskCalculator() {
    this.container.querySelectorAll('#riskBalance, #riskPercent, #riskEntry, #riskStop, #riskTarget').forEach((input) => input.addEventListener('input', () => this.calculateRisk()));
  }

  calculateRisk() {
    const value = (id) => Number(this.container.querySelector(id).value);
    const balance = value('#riskBalance'), riskPercent = value('#riskPercent'), entry = value('#riskEntry'), stop = value('#riskStop'), target = value('#riskTarget');
    const output = this.container.querySelector('#riskResults');
    const symbol = MarketDataProvider.getSymbolInfo(this.snapshot?.symbol || 'EURUSD');
    if (![balance, riskPercent, entry, stop].every(Number.isFinite) || balance <= 0 || riskPercent <= 0 || entry === stop) { output.textContent = 'Enter a valid balance, risk percentage, entry, and stop-loss.'; return; }
    const result = RiskManagement.calculate(balance, riskPercent, entry, stop, symbol.pipSize);
    const rewardPips = Number.isFinite(target) && target > 0 ? Math.abs(target - entry) / symbol.pipSize : null;
    const rr = rewardPips && result.distancePips ? rewardPips / result.distancePips : null;
    output.innerHTML = `<strong>Risk amount: $${result.riskAmount.toFixed(2)}</strong><span>${result.distancePips} pips risk · ${result.lotSize} lots</span>${rr ? `<span>Potential R:R: 1:${rr.toFixed(2)} · illustrative potential: $${(result.riskAmount * rr).toFixed(2)}</span>` : ''}<small>Position sizing is indicative only; confirm contract specifications with your broker.</small>`;
  }

  bindCopilot() {
    this.container.querySelector('#copilotForm').addEventListener('submit', (event) => {
      event.preventDefault(); const question = this.container.querySelector('#copilotQuestion').value.toLowerCase(); const response = this.container.querySelector('#copilotResponse');
      if (!this.snapshot) { response.textContent = 'Live market data unavailable. The workspace has not produced an analysis snapshot.'; return; }
      const { symbol, scoring, structure, liquidity, crt, session, entry } = this.snapshot;
      if (/bias|structure|xau|eur|gbp|symbol/.test(question)) response.textContent = `${symbol}: ${structure.bias} structure. Liquidity: ${liquidity.sweep?.levelName || 'no confirmed sweep'}. CRT: ${crt.status}. Current session: ${session.activeSession.replaceAll('_', ' ')}. This is technical context, not a prediction.`;
      else if (/plan|entry|stop|target/.test(question)) response.textContent = entry.isValid ? `${symbol} ${entry.direction} plan: entry ${entry.entryPrice}, stop ${entry.stopLoss}, TP1 ${entry.takeProfit1}, TP2 ${entry.takeProfit2}. Invalidation: stop-loss reached.` : 'No validated trade plan is available because the current confluence threshold has not been met.';
      else response.textContent = `${symbol} confluence is ${scoring.score}/100 (${scoring.grade}). Confirmations: ${scoring.factors.map((factor) => factor.name).join(', ') || 'none'}. Live news, calendar, and sentiment data are unavailable without configured providers.`;
    });
  }
}
