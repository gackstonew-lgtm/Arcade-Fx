/**
 * AlertEngine.js — User Price Alert & SMC Event Evaluation Engine.
 * Evaluates live market ticks against user alerts (PRICE_ABOVE, PRICE_BELOW, MOVEMENT_PCT)
 * and SMC confluences with state-machine trigger protection (ACTIVE -> TRIGGERED -> REARM).
 */

export class AlertEngine {
  constructor() {
    this.triggeredStates = new Map(); // Prevents repeated notification spam
  }

  /**
   * Evaluates active user price alerts against live symbol price snapshot.
   */
  evaluateUserAlerts(userAlerts = [], currentPrices = {}) {
    const triggeredNotifications = [];

    userAlerts.forEach(alert => {
      if (!alert || !alert.is_active || alert.status === 'INACTIVE') return;

      const symbol = alert.symbol_code || alert.symbol;
      const currentPrice = currentPrices[symbol];
      if (!Number.isFinite(currentPrice)) return;

      const threshold = Number(alert.condition_val || alert.threshold);
      const alertType = (alert.alert_type || alert.condition || '').toUpperCase();
      const stateKey = `alert_${alert.id}_${threshold}`;

      let isConditionMet = false;
      let notificationMessage = '';

      if (alertType.includes('ABOVE') || alertType === 'PRICE_ABOVE') {
        isConditionMet = currentPrice >= threshold;
        notificationMessage = `${symbol} price ${currentPrice} rose ABOVE target threshold ${threshold}.`;
      } else if (alertType.includes('BELOW') || alertType === 'PRICE_BELOW') {
        isConditionMet = currentPrice <= threshold;
        notificationMessage = `${symbol} price ${currentPrice} dropped BELOW target threshold ${threshold}.`;
      }

      if (isConditionMet) {
        if (!this.triggeredStates.get(stateKey)) {
          this.triggeredStates.set(stateKey, true);
          triggeredNotifications.push({
            alertId: alert.id,
            symbol,
            type: alertType,
            threshold,
            currentPrice,
            message: notificationMessage,
            triggeredAt: new Date().toISOString()
          });
        }
      } else {
        // Reset trigger state when price moves back to rearm range
        this.triggeredStates.delete(stateKey);
      }
    });

    return triggeredNotifications;
  }

  /**
   * Evaluates technical SMC events (A+ Confluence, 5AM CRT, Liquidity Sweeps).
   */
  static checkAlerts(symbol, currentBar, scoring, crt, fvg, liquidity) {
    const alerts = [];
    const timeStr = new Date(currentBar.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (scoring && scoring.score >= 85) {
      alerts.push({
        id: `alert-sig-${currentBar.time}`,
        time: timeStr,
        title: `🎯 ${symbol} Grade A+ Signal (${scoring.score} pts)`,
        message: `${scoring.direction} confluence setup confirmed on ${symbol}.`,
        type: 'SIGNAL',
        severity: 'high'
      });
    }

    if (crt && (crt.status === 'LIQUIDITY_SWEPT_BULLISH' || crt.status === 'LIQUIDITY_SWEPT_BEARISH')) {
      alerts.push({
        id: `alert-crt-${currentBar.time}`,
        time: timeStr,
        title: `⏰ 5AM CRT Liquidity Sweep`,
        message: `${symbol} swept CRT ${crt.status.includes('BULLISH') ? 'Low' : 'High'} range.`,
        type: 'CRT',
        severity: 'medium'
      });
    }

    if (liquidity && liquidity.sweep) {
      alerts.push({
        id: `alert-liq-${currentBar.time}`,
        time: timeStr,
        title: `💧 HTF Liquidity Sweep`,
        message: `${liquidity.description}`,
        type: 'LIQUIDITY',
        severity: 'medium'
      });
    }

    return alerts;
  }
}
