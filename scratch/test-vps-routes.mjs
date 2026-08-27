async function testVpsRoutes() {
  const vps = 'http://157.173.193.93:5000';
  const routes = [
    '/api/signals',
    '/signals',
    '/api/prices',
    '/prices',
    '/api/strength',
    '/strength',
    '/api/health',
    '/health'
  ];

  for (const r of routes) {
    try {
      const res = await fetch(`${vps}${r}`, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch(e) {}
      console.log(`[${r}] HTTP ${res.status}:`, json ? (Array.isArray(json) ? `Array(${json.length})` : Object.keys(json)) : text.substring(0, 60));
    } catch(err) {
      console.log(`[${r}] Error:`, err.message);
    }
  }
}

testVpsRoutes();
