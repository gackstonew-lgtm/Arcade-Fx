/**
 * SignalScoring.js — Weighted 10-Factor Confluence Signal Scoring & Grading Engine.
 * Grades setups into A+ (>=85 pts), A (>=70 pts), B (>=50 pts), or NO_TRADE (<50 pts).
 */

export class SignalScoring {
  static evaluate(context) {
    const {
      htfBias = 'BULLISH',
      liquiditySweep = null,
      structure = null,
      fvg = null,
      orderBlock = null,
      crt = null,
      volume = null,
      momentum = null,
      session = null,
      dxyCorr = null
    } = context;

    let score = 0;
    const factors = [];

    // 1. HTF Alignment (+15 pts)
    if (htfBias === 'BULLISH' || htfBias === 'BEARISH') {
      score += 15;
      factors.push({ name: 'HTF Bias Aligned', points: 15 });
    }

    // 2. Liquidity Sweep (+15 pts)
    if (liquiditySweep && liquiditySweep.sweep) {
      score += 15;
      factors.push({ name: 'Liquidity Sweep Swept Level', points: 15 });
    }

    // 3. Market Structure Shift MSS (+15 pts)
    if (structure && structure.mss) {
      score += 15;
      factors.push({ name: 'Market Structure Shift (MSS)', points: 15 });
    }

    // 4. 1H FVG (+10 pts)
    if (fvg && fvg.activeCount > 0) {
      score += 10;
      factors.push({ name: '1H FVG Active Zone', points: 10 });
    }

    // 5. 1H Order Block (+10 pts)
    if (orderBlock && orderBlock.activeOb) {
      score += 10;
      factors.push({ name: '1H Order Block Validated', points: 10 });
    }

    // 6. 5AM CRT Range Alignment (+10 pts)
    if (crt && (crt.status === 'LIQUIDITY_SWEPT_BULLISH' || crt.status === 'LIQUIDITY_SWEPT_BEARISH' || crt.status === 'BULLISH_EXPANSION')) {
      score += 10;
      factors.push({ name: '5AM CRT Range Aligned', points: 10 });
    }

    // 7. Volume Expansion (+5 pts)
    if (volume && volume.isExpanded) {
      score += 5;
      factors.push({ name: 'Volume SMA Expansion', points: 5 });
    }

    // 8. Momentum ATR (+5 pts)
    if (momentum && momentum.isExpanded) {
      score += 5;
      factors.push({ name: 'ATR Body Expansion', points: 5 });
    }

    // 9. Session Overlap (+5 pts)
    if (session && (session.isOverlap || session.isLondon || session.isNY)) {
      score += 5;
      factors.push({ name: 'Session Killzone Active', points: 5 });
    }

    // 10. DXY Correlation (+10 pts)
    if (dxyCorr && dxyCorr.category === 'STRONG_NEGATIVE') {
      score += 10;
      factors.push({ name: 'DXY Inverse Pearson Correlation', points: 10 });
    }

    let grade = 'NO_TRADE';
    let direction = htfBias === 'BEARISH' ? 'SHORT' : 'LONG';
    const whyNotTradeReasons = [];

    if (!htfBias || htfBias === 'NEUTRAL') whyNotTradeReasons.push('HTF Structure Bias is neutral or unaligned');
    if (!liquiditySweep || !liquiditySweep.sweep) whyNotTradeReasons.push('No HTF/LTF Liquidity Sweep detected');
    if (!structure || !structure.mss) whyNotTradeReasons.push('No Market Structure Shift (MSS) confirmation');
    if (!fvg || fvg.activeCount === 0) whyNotTradeReasons.push('No active Fair Value Gap (FVG) zone');
    if (!orderBlock || !orderBlock.activeOb) whyNotTradeReasons.push('No validated Order Block in zone');
    if (!session || (!session.isOverlap && !session.isLondon && !session.isNY)) whyNotTradeReasons.push('Outside prime session Killzones (London/NY Overlap)');
    if (!dxyCorr || dxyCorr.category !== 'STRONG_NEGATIVE') whyNotTradeReasons.push('DXY correlation unaligned or data unavailable');

    if (score >= 85) {
      grade = 'A+';
    } else if (score >= 70) {
      grade = 'A';
    } else if (score >= 50) {
      grade = 'B';
    }

    const state = score >= 85 ? 'VALIDATED' : score >= 70 ? 'FORMING' : score >= 50 ? 'WATCH' : 'NO_TRADE';

    return {
      score,
      grade,
      direction,
      state,
      factors,
      auditTrail: factors.map(f => `${f.name} (+${f.points})`).join(' • '),
      whyNotTradeReasons: score < 70 ? whyNotTradeReasons : [],
      isTradeable: score >= 70
    };
  }
}
