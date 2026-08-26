/**
 * ChartEngine.js — High Performance HTML5 Canvas Interactive Charting Engine.
 * Renders Candlesticks, OHLC Bars, Line, and Area chart styles with zoom, pan, crosshair HUD,
 * retina high-DPI scaling, price scale grid, and time axis.
 */

export class ChartEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.bars = [];
    this.chartType = 'CANDLESTICK';
    this.symbol = 'EURUSD';
    this.timeframe = '15M';

    this.crosshair = { x: -1, y: -1, visible: false, bar: null, price: null };
    this.zoomLevel = 1.0;
    this.panOffset = 0;

    this.overlays = null;

    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  initEvents() {
    if (!this.canvas) return;

    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = e.clientX - rect.left;
      this.crosshair.y = e.clientY - rect.top;
      this.crosshair.visible = true;
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.crosshair.visible = false;
      this.render();
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomLevel = Math.min(2.5, this.zoomLevel * 1.08);
      } else {
        this.zoomLevel = Math.max(0.5, this.zoomLevel / 1.08);
      }
      this.render();
    });
  }

  updateData(bars, chartType = 'CANDLESTICK', overlays = null, symbol = this.symbol, timeframe = this.timeframe) {
    this.bars = bars || [];
    this.chartType = chartType;
    this.overlays = overlays;
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.render();
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const w = this.width;
    const h = this.height;

    if (!w || !h) return;

    const ctx = this.ctx;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Clear background
    ctx.fillStyle = isDark ? '#0b0e14' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (!this.bars || this.bars.length === 0) {
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading Market Chart Stream...', w / 2, h / 2);
      return;
    }

    const paddingRight = 65;
    const paddingBottom = 26;
    const chartWidth = w - paddingRight;
    const chartHeight = h - paddingBottom;

    // Calculate price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    const visibleCount = Math.floor(Math.min(this.bars.length, Math.max(20, (chartWidth / 12) * this.zoomLevel)));
    const startIndex = Math.max(0, this.bars.length - visibleCount);
    const visibleBars = this.bars.slice(startIndex);

    for (const b of visibleBars) {
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.low < minPrice) minPrice = b.low;
    }

    const priceMargin = (maxPrice - minPrice) * 0.08 || 0.001;
    maxPrice += priceMargin;
    minPrice -= priceMargin;

    const getY = (price) => {
      return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
    };

    const candleWidth = Math.max(2, (chartWidth / visibleBars.length) * 0.7);
    const stepX = chartWidth / visibleBars.length;

    // Render Grid lines
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = (chartHeight / gridSteps) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);

      const priceVal = maxPrice - ((maxPrice - minPrice) / gridSteps) * i;
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal.toFixed(4), chartWidth + 6, y + 3);
    }
    ctx.stroke();

    // Render Chart Series
    visibleBars.forEach((bar, index) => {
      const x = index * stepX + stepX / 2;
      const openY = getY(bar.open);
      const closeY = getY(bar.close);
      const highY = getY(bar.high);
      const lowY = getY(bar.low);

      const isBull = bar.close >= bar.open;
      const bullColor = '#10b981';
      const bearColor = '#ef4444';

      if (this.chartType === 'CANDLESTICK') {
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.fillStyle = isBull ? bullColor : bearColor;

        // Wick
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      } else if (this.chartType === 'BARS') {
        ctx.strokeStyle = isBull ? bullColor : bearColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.moveTo(x - candleWidth / 2, openY);
        ctx.lineTo(x, openY);
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + candleWidth / 2, closeY);
        ctx.stroke();
      } else if (this.chartType === 'LINE' || this.chartType === 'AREA') {
        if (index === 0) {
          ctx.beginPath();
          ctx.moveTo(x, closeY);
        } else {
          ctx.lineTo(x, closeY);
        }
      }
    });

    if (this.chartType === 'LINE') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.chartType === 'AREA') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      const lastX = (visibleBars.length - 1) * stepX + stepX / 2;
      ctx.lineTo(lastX, chartHeight);
      ctx.lineTo(stepX / 2, chartHeight);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Render Overlays if present
    if (this.overlays) {
      this.renderOverlays(ctx, visibleBars, stepX, getY, chartWidth, isDark);
    }

    // Render Crosshair & HUD
    if (this.crosshair.visible && this.crosshair.x <= chartWidth && this.crosshair.y <= chartHeight) {
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(this.crosshair.x, 0);
      ctx.lineTo(this.crosshair.x, chartHeight);
      ctx.moveTo(0, this.crosshair.y);
      ctx.lineTo(chartWidth, this.crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const barIndex = Math.floor(this.crosshair.x / stepX);
      if (barIndex >= 0 && barIndex < visibleBars.length) {
        const bar = visibleBars[barIndex];
        this.renderTooltip(ctx, bar, chartWidth, chartHeight, isDark);
      }
    }
  }

  renderTooltip(ctx, bar, chartWidth, chartHeight, isDark) {
    const pad = 10;
    const tooltipWidth = 214;
    const tooltipHeight = 72;
    const x = Math.max(pad, Math.min(chartWidth - tooltipWidth - pad, this.crosshair.x + 14));
    const y = this.crosshair.y > tooltipHeight + 20 ? this.crosshair.y - tooltipHeight - 12 : this.crosshair.y + 12;
    const time = bar.time ? new Date(bar.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : this.timeframe;

    ctx.save();
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(15, 23, 42, 0.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.roundRect(x, y, tooltipWidth, tooltipHeight, 9);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(30, 41, 59, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.symbol} · ${this.timeframe} · ${time}`, x + 10, y + 16);
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`O ${bar.open}    H ${bar.high}    L ${bar.low}    C ${bar.close}`, x + 10, y + 38);
    ctx.fillText(`Volume ${bar.volume ?? '—'}`, x + 10, y + 57);
    ctx.restore();
  }

  renderOverlays(ctx, visibleBars, stepX, getY, chartWidth, isDark) {
    const { pwhPwl, pdhPdl, crt, fvg } = this.overlays;

    // 1. PWH / PWL
    if (pwhPwl && pwhPwl.pwh && pwhPwl.pwl) {
      const pwhY = getY(pwhPwl.pwh);
      const pwlY = getY(pwhPwl.pwl);

      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, pwhY); ctx.lineTo(chartWidth, pwhY);
      ctx.moveTo(0, pwlY); ctx.lineTo(chartWidth, pwlY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#8b5cf6';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`PWH: ${pwhPwl.pwh}`, chartWidth - 100, pwhY - 4);
      ctx.fillText(`PWL: ${pwhPwl.pwl}`, chartWidth - 100, pwlY + 12);
    }

    // 2. PDH / PDL
    if (pdhPdl && pdhPdl.pdh && pdhPdl.pdl) {
      const pdhY = getY(pdhPdl.pdh);
      const pdlY = getY(pdhPdl.pdl);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, pdhY); ctx.lineTo(chartWidth, pdhY);
      ctx.moveTo(0, pdlY); ctx.lineTo(chartWidth, pdlY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`PDH: ${pdhPdl.pdh}`, chartWidth - 180, pdhY - 4);
      ctx.fillText(`PDL: ${pdhPdl.pdl}`, chartWidth - 180, pdlY + 12);
    }

    // 3. 5AM CRT Zone
    if (crt && crt.crtHigh && crt.crtLow) {
      const crtHighY = getY(crt.crtHigh);
      const crtLowY = getY(crt.crtLow);
      const crtEqY = getY(crt.crtEq);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(0, crtHighY, chartWidth, crtLowY - crtHighY);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, crtHighY); ctx.lineTo(chartWidth, crtHighY);
      ctx.moveTo(0, crtLowY); ctx.lineTo(chartWidth, crtLowY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, crtEqY); ctx.lineTo(chartWidth, crtEqY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`5AM CRT 50%: ${crt.crtEq}`, 12, crtEqY - 4);
    }
  }
}
