const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) };
globalThis.window = {
  location: { href: 'http://localhost:3000', origin: 'http://localhost:3000', hostname: 'localhost' },
  matchMedia: () => ({ matches: false })
};
globalThis.document = {
  documentElement: { setAttribute: () => {}, removeAttribute: () => {} },
  body: { classList: { add: () => {}, remove: () => {} } }
};

const { runTestSuite } = await import('../tests/test-suite.js');

const result = runTestSuite();
if (result.failed > 0) process.exitCode = 1;
