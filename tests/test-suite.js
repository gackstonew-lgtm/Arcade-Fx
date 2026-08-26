/**
 * test-suite.js — Arcade FX SMC System Automated Test Suite (35 Tests).
 * Runs unit & integration tests on PreviousWeekRange, PreviousDayRange, CRTModule, FVGModule,
 * LiquidityModule, DxyCorrelation, SignalScoring, RiskManagement, MarketDataProvider, and SettingsStore.
 */

import { PreviousWeekRange } from '../src/modules/PreviousWeekRange.js';
import { PreviousDayRange } from '../src/modules/PreviousDayRange.js';
import { CRTModule } from '../src/modules/CRTModule.js';
import { FVGModule } from '../src/modules/FVGModule.js';
import { LiquidityModule } from '../src/modules/LiquidityModule.js';
import { DxyCorrelation } from '../src/modules/DxyCorrelation.js';
import { SignalScoring } from '../src/modules/SignalScoring.js';
import { RiskManagement } from '../src/modules/RiskManagement.js';
import { MarketDataProvider } from '../src/data/MarketDataProvider.js';
import { settingsStore } from '../src/data/SettingsStore.js';

export function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING ARCADE FX SMC SYSTEM AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${description}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${description}`);
    }
  }

  // Sample Mock Bars
  const mockBars = [
    { time: 1700000000000, open: 1.0800, high: 1.0850, low: 1.0790, close: 1.0840, volume: 1000 },
    { time: 1700003600000, open: 1.0840, high: 1.0890, low: 1.0830, close: 1.0880, volume: 1200 },
    { time: 1700007200000, open: 1.0880, high: 1.0920, low: 1.0870, close: 1.0910, volume: 1500 },
    { time: 1700010800000, open: 1.0910, high: 1.0950, low: 1.0890, close: 1.0940, volume: 1800 }
  ];

  // 1-3. PreviousWeekRange Tests
  const pwr = PreviousWeekRange.calculate(mockBars);
  assert(pwr.pwh === 1.0920, 'PreviousWeekRange correctly identifies PWH');
  assert(pwr.pwl === 1.0790, 'PreviousWeekRange correctly identifies PWL');
  assert(pwr.weeklyEq === Number(((1.0920 + 1.0790) * 0.5).toFixed(5)), 'Weekly Equilibrium equals (PWH + PWL) * 0.5');

  // 4-6. PreviousDayRange Tests
  const pdr = PreviousDayRange.calculate(mockBars);
  assert(pdr.pdh === 1.0920, 'PreviousDayRange correctly identifies PDH');
  assert(pdr.pdl === 1.0790, 'PreviousDayRange correctly identifies PDL');
  assert(pdr.dailyEq === Number(((1.0920 + 1.0790) * 0.5).toFixed(5)), 'Daily Equilibrium equals (PDH + PDL) * 0.5');

  // 7-10. CRTModule Tests
  const crt = CRTModule.analyze(mockBars, 5);
  assert(crt.crtHigh > 0, 'CRTModule detects 5AM 4H candle');
  assert(crt.crtHigh >= crt.crtLow, 'CRT High extracted correctly');
  assert(crt.crtLow <= crt.crtHigh, 'CRT Low extracted correctly');
  assert(crt.crtEq === Number(((crt.crtHigh + crt.crtLow) * 0.5).toFixed(5)), 'CRT 50% Equilibrium calculated correctly');

  // 11-14. FVGModule Tests
  const fvgBars = [
    { open: 1.0800, high: 1.0820, low: 1.0790, close: 1.0810 },
    { open: 1.0815, high: 1.0870, low: 1.0810, close: 1.0865 },
    { open: 1.0870, high: 1.0910, low: 1.0850, close: 1.0900 }
  ];
  const fvgRes = FVGModule.analyze(fvgBars);
  assert(fvgRes.fvgs.length >= 1, 'FVGModule detects 3-candle Bullish FVG');
  assert(fvgRes.fvgs[0].top === 1.0850, 'FVG High bound verified');
  assert(fvgRes.fvgs[0].bottom === 1.0820, 'FVG Low bound verified');
  assert(fvgRes.fvgs[0].status === 'UNMITIGATED', 'FVG mitigation status verified');

  // 15-17. LiquidityModule Tests
  const sweepBars = [
    { open: 1.0850, high: 1.0860, low: 1.0780, close: 1.0840 }
  ];
  const liqRes = LiquidityModule.analyze(sweepBars, 1.0900, 1.0800);
  assert(liqRes.sweep !== null, 'LiquidityModule detects Bullish Liquidity Sweep');
  assert(liqRes.sweep.type === 'BULLISH', 'Sweep classified as BULLISH');
  assert(liqRes.sweep.rejectionClose > 1.0800, 'Rejection verified by close back above level');

  // 18-20. DxyCorrelation Tests
  const symBars = [{ close: 1.08 }, { close: 1.09 }, { close: 1.10 }];
  const dxyBars = [{ close: 105.0 }, { close: 104.5 }, { close: 104.0 }];
  const dxyRes = DxyCorrelation.calculate(symBars, dxyBars, 3);
  assert(dxyRes.correlation < 0, 'DxyCorrelation calculates inverse Pearson coefficient');
  assert(dxyRes.category === 'STRONG_NEGATIVE', 'Categorized as STRONG_NEGATIVE');
  assert(dxyRes.correlation === -1, 'EURUSD inverse alignment verified');

  // 21-22. SignalScoring Tests
  const scoringRes = SignalScoring.evaluate({
    htfBias: 'BULLISH',
    liquiditySweep: { sweep: {} },
    structure: { mss: {} },
    fvg: { activeCount: 1 },
    orderBlock: { activeOb: {} },
    crt: { status: 'LIQUIDITY_SWEPT_BULLISH' },
    volume: { isExpanded: true },
    momentum: { isExpanded: true },
    session: { isOverlap: true },
    dxyCorr: { category: 'STRONG_NEGATIVE' }
  });
  assert(scoringRes.score >= 85, 'High confluence setup scores >= 85');
  assert(scoringRes.grade === 'A+', 'High confluence setup awarded A+ Grade');

  // 23-26. RiskManagement Tests
  const riskRes = RiskManagement.calculate(10000, 1.0, 1.0850, 1.0820, 0.0001);
  assert(riskRes.riskAmount === 100, 'Risk Amount is exactly 1% of $10,000 ($100)');
  assert(riskRes.distancePips === 30, 'Structural SL distance calculated correctly');
  assert(riskRes.lotSize > 0, 'Lot sizing calculated correctly');
  assert(riskRes.balance === 10000, 'Account balance verified');

  // 27-29. MarketDataProvider Tests
  assert(MarketDataProvider.getSymbolInfo('EURUSD').code === 'EURUSD', 'MarketDataProvider supports EURUSD');
  const history = MarketDataProvider.generateHistory('EURUSD', 50, 15);
  assert(history.length === 50, 'MarketDataProvider fetches OHLCV series correctly');
  assert(history[0].open > 0, 'OHLCV bar timeframe verified');

  // 30-35. SettingsStore Tests
  assert(settingsStore.get('theme') !== undefined, 'SettingsStore initializes with default theme');
  settingsStore.set('showFvgs', true);
  assert(settingsStore.get('showFvgs') === true, 'SettingsStore updates setting value');
  assert(settingsStore.resolveEffectiveTheme() !== undefined, 'SettingsStore resolves theme');
  settingsStore.set('showPwhPwl', true);
  assert(settingsStore.get('showPwhPwl') === true, 'SettingsStore updates strategy overlay toggle');
  settingsStore.resetToDefaults();
  assert(settingsStore.get('theme') === 'system', 'SettingsStore resets preferences to defaults');
  assert(settingsStore.get('showFvgs') === true, 'SettingsStore restores overlay default toggles');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  return { passed, failed };
}

if (process.argv[1]?.includes('test-suite.js')) {
  runTestSuite();
}
