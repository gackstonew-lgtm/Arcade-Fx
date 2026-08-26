export function deterministicBars(symbol, count, timeframe) {
  const bars = [];
  const now = Date.now();
  const interval = timeframe * 60_000;
  let current = Number(symbol.baseprice);
  let trend = 1;
  let state = hash(symbol.code);
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pip = Number(symbol.pipsize);
  const decimals = pip < 0.01 ? 5 : 2;
  for (let i = count - 1; i >= 0; i -= 1) {
    const time = now - i * interval;
    const hour = new Date(time).getUTCHours();
    if (i % 20 === 0) trend = random() > 0.45 ? 1 : -1;
    const volatility = pip * (hour >= 8 && hour <= 21 ? 14 : 6);
    const open = current;
    const close = open + (random() - 0.48 + trend * 0.05) * volatility;
    const high = Math.max(open, close) + random() * volatility * 1.5;
    const low = Math.min(open, close) - random() * volatility * 1.5;
    bars.push({
      time,
      isoTime: new Date(time).toISOString(),
      open: Number(open.toFixed(decimals)), high: Number(high.toFixed(decimals)),
      low: Number(low.toFixed(decimals)), close: Number(close.toFixed(decimals)),
      volume: Math.floor((400 + random() * 800) * (hour >= 8 && hour <= 21 ? 2.5 : 1))
    });
    current = close;
  }
  return bars;
}

function hash(value) {
  let result = 0;
  for (const char of value) result = ((result << 5) - result + char.charCodeAt(0)) | 0;
  return result >>> 0;
}
