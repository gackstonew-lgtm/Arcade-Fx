/**
 * TradingViewWidget.js — Official TradingView Advanced Charting Solution Integration.
 * Manages TradingView.widget lifecycle, symbol mapping, timeframe mapping, indicator studies,
 * theme syncing (dark/light), drawing toolbars, and graceful offline fallback.
 */

import { settingsStore } from '../data/SettingsStore.js';

export class TradingViewWidgetManager {
  constructor(containerId = 'tradingview_chart_container') {
    this.containerId = containerId;
    this.widget = null;
    this.currentSymbol = 'EURUSD';
    this.currentTimeframe = '15M';
    this.currentChartType = 'CANDLESTICK';
    this.activeStudies = ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'];
    this.isLoaded = false;
  }

  static getTradingViewSymbol(symbolCode) {
    const map = {
      'EURUSD': 'FX:EURUSD',
      'GBPUSD': 'FX:GBPUSD',
      'USDJPY': 'FX:USDJPY',
      'USDCHF': 'FX:USDCHF',
      'USDCAD': 'FX:USDCAD',
      'AUDUSD': 'FX:AUDUSD',
      'NZDUSD': 'FX:NZDUSD',
      'XAUUSD': 'OANDA:XAUUSD',
      'XAGUSD': 'OANDA:XAGUSD',
      'BTCUSD': 'BITSTAMP:BTCUSD',
      'ETHUSD': 'BITSTAMP:ETHUSD',
      'DXY': 'CAPITALCOM:DXY'
    };
    return map[symbolCode] || `FX:${symbolCode}`;
  }

  static getTradingViewInterval(tf) {
    const map = {
      '1M': '1',
      '5M': '5',
      '15M': '15',
      '30M': '30',
      '1H': '60',
      '4H': '240',
      '1D': 'D',
      '1W': 'W'
    };
    return map[tf] || '15';
  }

  static getTradingViewStyle(chartType) {
    const map = {
      'BARS': 0,
      'CANDLESTICK': 1,
      'LINE': 2,
      'AREA': 3,
      'HEIKIN_ASHI': 8
    };
    return map[chartType] !== undefined ? map[chartType] : 1;
  }

  init(symbol = 'EURUSD', timeframe = '15M', chartType = 'CANDLESTICK') {
    this.currentSymbol = symbol;
    this.currentTimeframe = timeframe;
    this.currentChartType = chartType;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Check if TradingView script is loaded
    if (typeof TradingView === 'undefined') {
      console.warn('[TradingView] Script not loaded yet. Will load fallback or retry.');
      this.loadScriptAndInit();
      return;
    }

    this.createWidget();
  }

  loadScriptAndInit() {
    if (document.getElementById('tv-script-tag')) return;

    const script = document.createElement('script');
    script.id = 'tv-script-tag';
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      console.log('[TradingView] Advanced Chart library loaded successfully.');
      this.createWidget();
    };
    script.onerror = () => {
      console.warn('[TradingView] Failed to load script online. Using Arcade SMC Canvas Engine fallback.');
    };
    document.head.appendChild(script);
  }

  createWidget() {
    if (typeof TradingView === 'undefined') return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = '';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tvSymbol = TradingViewWidgetManager.getTradingViewSymbol(this.currentSymbol);
    const tvInterval = TradingViewWidgetManager.getTradingViewInterval(this.currentTimeframe);
    const tvStyle = TradingViewWidgetManager.getTradingViewStyle(this.currentChartType);

    try {
      this.widget = new TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: 'Etc/UTC',
        theme: isDark ? 'dark' : 'light',
        style: tvStyle,
        locale: 'en',
        toolbar_bg: isDark ? '#0f172a' : '#f8fafc',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: true,
        container_id: this.containerId,
        studies: this.activeStudies,
        overrides: {
          "mainSeriesProperties.style": tvStyle
        }
      });
      this.isLoaded = true;
    } catch (e) {
      console.warn('[TradingView] Exception creating widget:', e);
      this.isLoaded = false;
    }
  }

  setSymbol(symbol) {
    if (this.currentSymbol === symbol) return;
    this.currentSymbol = symbol;
    this.createWidget();
  }

  setTimeframe(tf) {
    if (this.currentTimeframe === tf) return;
    this.currentTimeframe = tf;
    this.createWidget();
  }

  setChartType(type) {
    if (this.currentChartType === type) return;
    this.currentChartType = type;
    this.createWidget();
  }

  toggleStudy(studyName) {
    const studyMap = {
      'MA': 'MASimple@tv-basicstudies',
      'EMA': 'MAExp@tv-basicstudies',
      'RSI': 'RSI@tv-basicstudies',
      'MACD': 'MACD@tv-basicstudies',
      'BB': 'BollingerBands@tv-basicstudies',
      'VOL': 'Volume@tv-basicstudies',
      'STOCH': 'Stochastic@tv-basicstudies',
      'ATR': 'ATR@tv-basicstudies'
    };

    const target = studyMap[studyName] || studyName;
    const idx = this.activeStudies.indexOf(target);

    if (idx >= 0) {
      this.activeStudies.splice(idx, 1);
    } else {
      this.activeStudies.push(target);
    }
    this.createWidget();
  }
}
