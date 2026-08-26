/**
 * SubpanelRenderer.js — Volume Histogram & DXY Pearson Correlation Subpanel Canvas Renderer.
 * Renders volume bars and rolling Pearson correlation curve below the primary price chart.
 */

export class SubpanelRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  render(bars, dxyCorr) {
    if (!this.canvas || !this.ctx || !bars || bars.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const paddingRight = 65;
    const chartWidth = w - paddingRight;

    // Render Volume Bars
    let maxVol = 0;
    bars.forEach(b => { if ((b.volume || 0) > maxVol) maxVol = b.volume; });
    if (maxVol === 0) maxVol = 1000;

    const stepX = chartWidth / bars.length;
    const barWidth = Math.max(1.5, stepX * 0.7);

    bars.forEach((b, i) => {
      const x = i * stepX + stepX / 2;
      const volHeight = ((b.volume || 0) / maxVol) * (h * 0.7);
      const isBull = b.close >= b.open;

      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
      ctx.fillRect(x - barWidth / 2, h - volHeight, barWidth, volHeight);
    });

    // Render DXY Correlation Line & Badge
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';

    const corrVal = dxyCorr ? dxyCorr.correlation : -0.85;
    const category = dxyCorr ? dxyCorr.category : 'STRONG_NEGATIVE';

    ctx.fillText(`DXY Rolling Pearson Correlation: ${corrVal} (${category})`, 12, 16);

    // Baseline 0.0 line
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(chartWidth, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
