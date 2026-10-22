// React/jsdom hook and router behavior, real Axios interceptors/token storage/logout,
// controlled WebSocket transport/HTTP adapter/clock. No live backend or JWT signature
// verification here; backend tests verify real signed JWTs separately.
// Run with CORPORATE_TEST_JSDOM pointing to the existing isolated jsdom dependency.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window', 'document', 'HTMLElement', 'Event', 'CustomEvent', 'sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react');
const { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const router = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const A = '11111111-1111-4111-8111-111111111111', B = '33333333-3333-4333-8333-333333333333';
const SID = '22222222-2222-4222-8222-222222222222', SID_B = '44444444-4444-4444-8444-444444444444';
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function setup({ kind = 'CUSTOMER', type = 'ACCESS', expired = false, token: initialToken, provider = false } = {}) {
  sessionStorage.clear(); sessionStorage.setItem('corporateAccessToken', 'corporate-sentinel');
  const originalNow = Date.now, originalAdapter = axios.defaults.adapter;
  const originalSet = window.setTimeout, originalClear = window.clearTimeout;
  const originalInterval = window.setInterval, originalClearInterval = window.clearInterval;
  let now = Math.floor(originalNow() / 1000) * 1000, nextTimer = 0, sequence = 0;
  Date.now = () => now;
  const timers = new Map(), calls = [], sockets = [], notifications = [], events = [], cache = new Map();
  let handler, latest, logout, location, closed = false;
  const token = (sub = A, sid = SID, subjectType = 'CUSTOMER', tokenType = 'ACCESS', lifetime = 900) =>
    [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub, sid, subjectType, tokenType, exp: Math.floor(now / 1000) + lifetime, jti: 'synthetic-' + ++sequence })).toString('base64url'), 'synthetic-test-signature'].join('.');
  const addTimer = (fn, delay, interval) => { const id = ++nextTimer; timers.set(id, { fn, at: now + Number(delay), interval }); return id; };
  window.setTimeout = (fn, delay) => addTimer(fn, delay, 0);
  window.clearTimeout = id => timers.delete(id);
  window.setInterval = (fn, delay) => addTimer(fn, delay, Number(delay));
  window.clearInterval = id => timers.delete(id);
  class FakeWebSocket {
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; this.closes = []; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(data) { this.onmessage?.({ data: JSON.stringify({ type: 'NOTIFICATION', data }) }); }
    close(code = 1000, reason = '') { this.closes.push({ code, reason }); this.readyState = 3; this.onclose?.({ code }); }
    fail(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
    send(value) { assert.equal(this.readyState, 1); this.sent.push(value); }
  }
  const ok = (config, data = { success: true }) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const unauthorized = (config, code) => { throw new axios.AxiosError('Synthetic unauthorized', 'ERR_BAD_REQUEST', config, null,
    { config, status: 401, headers: {}, data: code ? { code, message: 'Synthetic session expiration' } : {} }); };
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, auth: config.headers.Authorization });
    if (handler) { const result = handler(config, { ok, unauthorized }); if (result !== undefined) return result; }
    return ok(config);
  };
  function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (file.endsWith('/SessionTimeoutModal.tsx')) {
      module.exports = { __esModule: true, default: props => props.open ? React.createElement('div', { 'data-timeout': true }, props.message) : null };
      return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return router;
      if (name === 'axios') return axios;
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    }, window, sessionStorage, Date, atob, CustomEvent: window.CustomEvent, WebSocket: FakeWebSocket, console }, { filename: file });
    return module.exports;
  }
  const tokens = load('src/utils/tokenStorage.ts');
  let activeSubscriptions = 0;
  const subscribe = tokens.subscribeToAuthenticationChanges;
  tokens.subscribeToAuthenticationChanges = listener => {
    activeSubscriptions++;
    const unsubscribe = subscribe(listener);
    return () => { activeSubscriptions--; unsubscribe(); };
  };
  const originalToken = initialToken ?? token(A, SID, kind, type, expired ? -1 : 900);
  tokens.saveTokens(originalToken, 'synthetic-refresh-never-sent-to-websocket');
  const api = load('src/config/api.ts').default;
  const baselineInterceptors = () => ({ request: api.interceptors.request.handlers.filter(Boolean).length, response: api.interceptors.response.handlers.filter(Boolean).length });
  const beforeInterceptors = baselineInterceptors();
  const useWebSocket = load('src/features/notifications/hooks/useNotificationWebSocket.ts').useNotificationWebSocket;
  const useLogout = load('src/features/auth/hooks/useIndividualLogout.ts').useIndividualLogout;
  const TimeoutProvider = load('src/features/auth/components/SessionTimeoutProvider.tsx').default;
  function Probe() {
    latest = useWebSocket({ onNotificationReceived: value => notifications.push(value) });
    logout = useLogout(); location = router.useLocation().pathname;
    return React.createElement('div', { 'data-connected': latest.isConnected });
  }
  const received = e => events.push(e.detail);
  window.addEventListener('ws-notification-received', received);
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    const probe = React.createElement(Probe);
    root.render(React.createElement(router.MemoryRouter, { initialEntries: ['/dashboard'] },
      provider ? React.createElement(TimeoutProvider, null, probe) : probe));
    await flush();
  });
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  const tick = async ms => {
    const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, timer] = next; now = timer.at;
      if (timer.interval) timer.at += timer.interval; else timers.delete(id);
      await perform(timer.fn);
    }
    now = end; await perform(() => {});
  };
  const cleanup = async () => {
    if (closed) return; closed = true;
    await act(async () => root.unmount()); container.remove();
    window.removeEventListener('ws-notification-received', received);
    assert.deepEqual(baselineInterceptors(), beforeInterceptors);
    assert.equal(activeSubscriptions, 0);
    assert.equal(timers.size, 0);
    window.setTimeout = originalSet; window.clearTimeout = originalClear;
    window.setInterval = originalInterval; window.clearInterval = originalClearInterval;
    Date.now = originalNow; axios.defaults.adapter = originalAdapter;
  };
  return { tokens, api, calls, sockets, notifications, events, token, originalToken, timers, container,
    connected: () => latest.isConnected, location: () => location, perform, tick, cleanup,
    setHandler: fn => { handler = fn; }, logout: () => logout(),
    http: async fn => { let response; await act(async () => { response = await fn(); await flush(); }); return response; },
  };
}

test('valid customer access connects and delivers the existing notification payload without HTTP activity', async t => {
  const h = await setup(); t.after(h.cleanup);
  assert.equal(h.sockets.length, 1);
  assert.equal(new URL(h.sockets[0].url).searchParams.get('token'), h.originalToken);
  assert.ok(!h.sockets[0].url.includes('synthetic-refresh'));
  await h.perform(() => h.sockets[0].open()); assert.equal(h.connected(), true);
  await h.perform(() => h.sockets[0].message({ notificationId: 1, title: 'Synthetic' }));
  assert.equal(h.notifications[0].title, 'Synthetic'); assert.equal(h.events.length, 1);
  await h.tick(60000); assert.deepEqual(h.sockets[0].sent, ['PING', 'PING']); assert.equal(h.calls.length, 0);
});

for (const scenario of [
  { name: 'Corporate', kind: 'CORPORATE_USER' }, { name: 'refresh', type: 'REFRESH' },
  { name: 'expired', expired: true }, { name: 'malformed', token: 'synthetic-invalid-token' },
]) {
  test(`${scenario.name} token cannot start an Individual socket or refresh request`, async t => {
    const h = await setup(scenario); t.after(h.cleanup);
    await h.tick(90000); assert.equal(h.sockets.length, 0); assert.equal(h.calls.length, 0);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), 'corporate-sentinel');
  });
}

test('logout closes immediately even while backend logout is pending and rejects stale frames/reconnects', async t => {
  const h = await setup(); t.after(h.cleanup); const pending = deferred();
  const ws = h.sockets[0]; await h.perform(() => ws.open());
  h.setHandler((c, { ok }) => c.url === '/auth/logout' ? pending.promise.then(() => ok(c)) : undefined);
  let logout;
  await h.perform(() => { logout = h.logout(); });
  assert.equal(ws.closes.length, 1);
  await h.perform(() => ws.message({ title: 'Must not deliver' }));
  await h.tick(90000); assert.equal(h.notifications.length, 0); assert.equal(h.sockets.length, 1);
  await h.perform(() => pending.resolve()); await logout;
  assert.equal(h.location(), '/login'); assert.equal(sessionStorage.getItem('accessToken'), null);
});

test('five-minute frontend idle timeout closes the socket and heartbeat never sends keep-alive or refresh', async t => {
  const h = await setup({ provider: true }); t.after(h.cleanup);
  await h.perform(() => h.sockets[0].open()); await h.tick(299999);
  assert.equal(h.sockets[0].closes.length, 0);
  await h.tick(1); assert.equal(h.sockets[0].closes.length, 1);
  assert.ok(h.container.querySelector('[data-timeout]')); assert.equal(sessionStorage.getItem('accessToken'), null);
  await h.tick(90000); assert.equal(h.sockets.length, 1); assert.equal(h.calls.length, 0);
});

test('backend session expiration from polling closes the socket without automatic refresh or reconnect', async t => {
  const h = await setup({ provider: true }); t.after(h.cleanup);
  await h.perform(() => h.sockets[0].open());
  h.setHandler((c, { unauthorized }) => unauthorized(c, 'SESSION_EXPIRED'));
  await h.http(() => assert.rejects(h.api.get('/notifications')));
  assert.equal(h.sockets[0].closes.length, 1);
  await h.tick(60000); assert.equal(h.sockets.length, 1);
  assert.deepEqual(h.calls.map(c => c.url), ['/notifications']);
});

test('customer B gets a new socket and delayed customer A events cannot affect it', async t => {
  const h = await setup(); t.after(h.cleanup); const old = h.sockets[0];
  await h.perform(() => old.open());
  const b = h.token(B, SID_B);
  h.tokens.saveTokens(b, 'synthetic-refresh-B'); await h.http(() => h.api.get('/notifications'));
  const current = h.sockets[1]; assert.equal(new URL(current.url).searchParams.get('token'), b);
  await h.perform(() => current.open());
  await h.perform(() => { old.message({ title: 'Customer A stale' }); old.fail(); old.open(); });
  assert.equal(h.connected(), true); assert.equal(h.notifications.length, 0);
  await h.perform(() => current.message({ title: 'Customer B' }));
  assert.equal(h.notifications[0].title, 'Customer B'); assert.equal(h.sockets.length, 2);
});

test('late handshake completion cannot reopen a socket after logout begins', async t => {
  const h = await setup(); t.after(h.cleanup); const old = h.sockets[0];
  await h.perform(() => { h.tokens.invalidateAuthenticationGeneration(); });
  await h.perform(() => old.open()); assert.equal(h.connected(), false);
  await h.tick(60000); assert.equal(h.sockets.length, 1);
});

test('15-minute expiry waits for the existing foreground refresh and reconnects with its rotated token', async t => {
  const h = await setup(); t.after(h.cleanup); const old = h.sockets[0];
  await h.perform(() => old.open()); await h.tick(900000);
  assert.equal(old.closes.length, 1); assert.equal(h.calls.length, 0);
  h.setHandler((c, { ok, unauthorized }) => {
    if (c.url === '/accounts' && !c._retry) return unauthorized(c);
    if (c.url === '/auth/refresh') return ok(c, { accessToken: h.token(), refreshToken: 'synthetic-rotated-refresh' });
  });
  await h.http(() => h.api.get('/accounts'));
  assert.deepEqual(h.calls.map(c => c.url), ['/accounts', '/auth/refresh', '/accounts']);
  assert.equal(h.sockets.length, 2);
  assert.equal(new URL(h.sockets[1].url).searchParams.get('token'), sessionStorage.getItem('accessToken'));
  await h.perform(() => h.sockets[1].open()); assert.equal(h.connected(), true);
});

test('same-generation rotation replaces the socket without a separate WebSocket refresh flow', async t => {
  const h = await setup(); t.after(h.cleanup); await h.perform(() => h.sockets[0].open());
  const generation = h.tokens.getAuthenticationGeneration();
  const replacement = h.token(); h.tokens.saveTokens(replacement, 'synthetic-rotation', generation);
  await h.http(() => h.api.get('/notifications'));
  assert.equal(h.tokens.getAuthenticationGeneration(), generation); assert.equal(h.sockets.length, 2);
  assert.equal(h.sockets[0].closes.length, 1); assert.deepEqual(h.calls.map(c => c.url), ['/notifications']);
});

test('policy rejection blocks the same token even on online events, until a newer login is established', async t => {
  const h = await setup(); t.after(h.cleanup); await h.perform(() => h.sockets[0].open());
  await h.perform(() => h.sockets[0].fail(1008));
  await h.tick(90000); await h.perform(() => window.dispatchEvent(new Event('online')));
  await h.http(() => h.api.get('/notifications'));
  assert.equal(h.sockets.length, 1);
  h.tokens.saveTokens(h.token(B, SID_B), 'synthetic-new-login');
  await h.http(() => h.api.get('/notifications')); assert.equal(h.sockets.length, 2);
});

test('failed handshakes have bounded retries and unmount removes timers and lifecycle subscriptions', async t => {
  const h = await setup(); t.after(h.cleanup);
  for (let i = 0; i < 5; i++) {
    assert.equal(h.sockets.length, i + 1);
    await h.perform(() => h.sockets.at(-1).fail(1006)); await h.tick(40000);
  }
  await h.tick(90000); assert.equal(h.sockets.length, 5); assert.equal(h.calls.length, 0);
});

test('pending reconnect is cancelled by authentication ending', async t => {
  const h = await setup(); t.after(h.cleanup); await h.perform(() => h.sockets[0].fail());
  h.tokens.clearTokens(); await h.tick(90000); assert.equal(h.sockets.length, 1);
  assert.equal(h.calls.length, 0); assert.equal(sessionStorage.getItem('corporateAccessToken'), 'corporate-sentinel');
});

test('a failing observer cannot interrupt token rotation, generation invalidation, or cleanup', async t => {
  const h = await setup(); t.after(h.cleanup);
  const unsubscribe = h.tokens.subscribeToAuthenticationChanges(() => { throw new Error('Synthetic observer failure'); });
  try {
  const generation = h.tokens.getAuthenticationGeneration();
  const rotated = h.token();
  await h.perform(() => h.tokens.saveTokens(rotated, 'synthetic-rotated-refresh', generation));
  assert.equal(sessionStorage.getItem('accessToken'), rotated);
  assert.equal(h.tokens.getAuthenticationGeneration(), generation);
  let invalidated;
  await h.perform(() => { invalidated = h.tokens.invalidateAuthenticationGeneration(); });
  assert.equal(invalidated, generation + 1);
  await h.perform(() => h.tokens.clearTokens());
  assert.equal(sessionStorage.getItem('accessToken'), null);
  assert.equal(sessionStorage.getItem('refreshToken'), null);
  assert.equal(sessionStorage.getItem('corporateAccessToken'), 'corporate-sentinel');
  } finally { unsubscribe(); }
});
