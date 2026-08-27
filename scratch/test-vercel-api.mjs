import signalsRoute from '../api/signals.mjs';
import healthRoute from '../api/health.mjs';
import pricesRoute from '../api/prices.mjs';
import strengthRoute from '../api/strength.mjs';

function createMockReqRes(url = '/api/signals', method = 'GET') {
  const req = {
    url,
    method,
    headers: {
      host: 'arcadefx.live',
      'user-agent': 'VercelTest/1.0'
    },
    query: {}
  };

  let statusCode = 200;
  const headers = {};
  let bodyData = '';

  const res = {
    get statusCode() { return statusCode; },
    set statusCode(code) { statusCode = code; },
    setHeader(key, val) { headers[key] = val; },
    getHeader(key) { return headers[key]; },
    end(data) {
      if (data) bodyData = data;
    },
    json(data) {
      bodyData = JSON.stringify(data);
    }
  };

  return { req, res, getOutput: () => ({ statusCode, headers, body: bodyData }) };
}

async function runTests() {
  console.log('=== TESTING VERCEL SERVERLESS ROUTE HANDLERS ===');

  // Test 1: GET /api/signals
  console.log('\n[1] Testing GET /api/signals ...');
  const test1 = createMockReqRes('/api/signals', 'GET');
  await signalsRoute(test1.req, test1.res);
  const out1 = test1.getOutput();
  console.log('Status:', out1.statusCode);
  const payload1 = JSON.parse(out1.body);
  console.log('Success:', payload1.success);
  console.log('Signal Access:', payload1.signal_access);
  console.log('Signals Count:', payload1.count);
  if (payload1.signals && payload1.signals.length > 0) {
    console.log('Sample Signal Pair:', payload1.signals[0].symbol);
    console.log('Sample Signal Status:', payload1.signals[0].status);
  }

  // Test 2: GET /api/signals?force=1
  console.log('\n[2] Testing GET /api/signals?force=1 ...');
  const test2 = createMockReqRes('/api/signals?force=1', 'GET');
  await signalsRoute(test2.req, test2.res);
  const out2 = test2.getOutput();
  console.log('Status:', out2.statusCode);
  const payload2 = JSON.parse(out2.body);
  console.log('Success:', payload2.success);
  console.log('Signals Count:', payload2.count);

  // Test 3: GET /api/health
  console.log('\n[3] Testing GET /api/health ...');
  const test3 = createMockReqRes('/api/health', 'GET');
  await healthRoute(test3.req, test3.res);
  const out3 = test3.getOutput();
  console.log('Status:', out3.statusCode);
  const payload3 = JSON.parse(out3.body);
  console.log('Health Status:', payload3.status);
  console.log('Signal Engine Status:', payload3.signalEngine?.status);

  // Test 4: GET /api/prices
  console.log('\n[4] Testing GET /api/prices ...');
  const test4 = createMockReqRes('/api/prices', 'GET');
  await pricesRoute(test4.req, test4.res);
  const out4 = test4.getOutput();
  console.log('Status:', out4.statusCode);
  const payload4 = JSON.parse(out4.body);
  console.log('Prices Count:', payload4.prices?.length || 0);

  // Test 5: GET /api/strength
  console.log('\n[5] Testing GET /api/strength ...');
  const test5 = createMockReqRes('/api/strength', 'GET');
  await strengthRoute(test5.req, test5.res);
  const out5 = test5.getOutput();
  console.log('Status:', out5.statusCode);
  const payload5 = JSON.parse(out5.body);
  console.log('Strength Count:', payload5.strength?.length || 0);

  console.log('\n=== ALL VERCEL ROUTE TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
