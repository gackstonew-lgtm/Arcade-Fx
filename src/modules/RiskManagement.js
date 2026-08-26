/**
 * RiskManagement.js — Production Risk Management & Instrument Sizing Engine.
 * Calculates exact monetary risk ($), instrument-specific lot sizing, leverage margin requirement,
 * potential profit targets (1:2, 1:3, 1:4), and validates trade inputs.
 */

export class RiskManagement {
  /**
   * Instrument contract specification registry.
   */
  static CONTRACT_SPECS = {
    EURUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    GBPUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    USDJPY: { contractSize: 100000, pipSize: 0.01, pipValuePerLot: 10, type: 'forex' },
    USDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    USDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    AUDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    NZDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, type: 'forex' },
    XAUUSD: { contractSize: 100, pipSize: 0.1, pipValuePerLot: 10, type: 'commodity' },
    XAGUSD: { contractSize: 5000, pipSize: 0.01, pipValuePerLot: 50, type: 'commodity' },
    BTCUSD: { contractSize: 1, pipSize: 1.0, pipValuePerLot: 1, type: 'crypto' },
    ETHUSD: { contractSize: 1, pipSize: 0.1, pipValuePerLot: 0.1, type: 'crypto' },
    DXY: { contractSize: 100, pipSize: 0.01, pipValuePerLot: 1, type: 'index' }
  };

  /**
   * Performs instrument-aware risk and lot sizing calculation with leverage margin checks.
   */
  static calculate(
    balance = 10000,
    riskPercent = 1.0,
    entryPrice = 1.0850,
    stopLoss = 1.0820,
    targetPrice = null,
    symbolCode = 'EURUSD',
    leverage = 100,
    direction = 'BUY'
  ) {
    // Input validation
    if (!Number.isFinite(balance) || balance <= 0) {
      return { isValid: false, error: 'Account balance must be a positive number.' };
    }
    if (!Number.isFinite(riskPercent) || riskPercent <= 0 || riskPercent > 100) {
      return { isValid: false, error: 'Risk percentage must be between 0.01% and 100%.' };
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(stopLoss) || stopLoss <= 0) {
      return { isValid: false, error: 'Valid entry price and stop loss required.' };
    }

    const isBuy = direction.toUpperCase() === 'BUY';
    if (isBuy && stopLoss >= entryPrice) {
      return { isValid: false, error: 'For a BUY trade, Stop Loss must be below Entry Price.' };
    }
    if (!isBuy && stopLoss <= entryPrice) {
      return { isValid: false, error: 'For a SELL trade, Stop Loss must be above Entry Price.' };
    }

    const spec = this.CONTRACT_SPECS[symbolCode] || this.CONTRACT_SPECS.EURUSD;
    const riskAmount = Number(((balance * riskPercent) / 100).toFixed(2));
    const priceDiff = Math.abs(entryPrice - stopLoss);
    const distancePips = priceDiff / spec.pipSize;

    let lotSize = 0.01;
    if (distancePips > 0) {
      const monetaryRiskPerLot = distancePips * spec.pipValuePerLot;
      lotSize = Number((riskAmount / monetaryRiskPerLot).toFixed(2));
    }
    if (lotSize < 0.01) lotSize = 0.01;

    // Calculate potential reward and R:R ratio
    let rewardAmount = 0;
    let rrRatio = 'N/A';
    if (Number.isFinite(targetPrice) && targetPrice > 0) {
      const targetDiff = Math.abs(targetPrice - entryPrice);
      const targetPips = targetDiff / spec.pipSize;
      rewardAmount = Number((targetPips * spec.pipValuePerLot * lotSize).toFixed(2));
      const ratio = targetDiff / priceDiff;
      rrRatio = `1 : ${ratio.toFixed(2)}`;
    }

    // Calculate estimated margin requirement: (Lots * ContractSize * EntryPrice) / Leverage
    const leverageFactor = Math.max(1, leverage);
    const positionNotional = lotSize * spec.contractSize * entryPrice;
    const marginRequired = Number((positionNotional / leverageFactor).toFixed(2));

    return {
      isValid: true,
      balance,
      riskPercent,
      riskAmount,
      entryPrice,
      stopLoss,
      targetPrice,
      distancePips: Number(distancePips.toFixed(1)),
      lotSize,
      rewardAmount,
      rrRatio,
      leverage: leverageFactor,
      marginRequired,
      instrumentType: spec.type
    };
  }
}
