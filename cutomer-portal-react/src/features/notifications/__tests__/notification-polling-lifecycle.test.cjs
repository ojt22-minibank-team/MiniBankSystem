// Real React/Router/dropdown, token store, Axios interceptors, logout, timeout and
// WebSocket hooks. HTTP/WebSocket transports and time are controlled. No live DB
// or browser, and synthetic JWTs here do not verify backend signatures/lastSeenAt.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window', 'document', 'HTMLElement', 'Event', 'MouseEvent', 'CustomEvent', 'sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react');
const { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const router = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const A = '11111111-1111-4111-8111-111111111111', B = '33333333-3333-4333-8333-333333333333';
const SID = '22222222-2222-4222-8222-222222222222';

async function setup(t, { authenticated = true, provider = false, handler: initialHandler } = {}) {
  sessionStorage.clear(); sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-sentinel');
  const originalAdapter = axios.defaults.adapter, originalNow = Date.now;
  const originals = Object.fromEntries(['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'addEventListener', 'removeEventListener'].map(key => [key, window[key]]));
  let now = originalNow(), timerId = 0, subscriptions = 0, sequence = 0, logout, mounted = false, handler = initialHandler;
  const timers = new Map(), listeners = new Map(), calls = [], sockets = [], cache = new Map();
  Date.now = () => now;
  const timer = (fn, delay, interval) => { const id = ++timerId; timers.set(id, { fn, at: now + Number(delay), interval }); return id; };
  window.setTimeout = (fn, delay) => timer(fn, delay, 0);
  window.setInterval = (fn, delay) => timer(fn, delay, Number(delay));
  window.clearTimeout = window.clearInterval = id => timers.delete(id);
  const trackedEvents = new Set(['new-notification-event', 'open-notification-dropdown', 'storage', 'online', 'individual-session-timeout']);
  window.addEventListener = (name, fn, ...rest) => {
    if (trackedEvents.has(name)) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); }
    originals.addEventListener.call(window, name, fn, ...rest);
  };
  window.removeEventListener = (name, fn, ...rest) => {
    listeners.get(name)?.delete(fn); originals.removeEventListener.call(window, name, fn, ...rest);
  };
  const token = (customer = A) => [Buffer.from('{"alg":"HS256"}').toString('base64url'),
    Buffer.from(JSON.stringify({ sub: customer, sid: SID, subjectType: 'CUSTOMER', tokenType: 'ACCESS',
      exp: Math.floor(now / 1000) + 3600, jti: 'synthetic-' + ++sequence })).toString('base64url'), 'synthetic-signature'].join('.');
  const item = (title, notificationId = 1) => ({ notificationId, title, message: 'Synthetic notification', isRead: false, createdAt: new Date().toISOString() });
  const ok = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const unauthorized = (config, code) => { throw new axios.AxiosError('Synthetic unauthorized', 'ERR_BAD_REQUEST', config, null,
    { config, status: 401, headers: {}, data: { code, message: 'Synthetic session expiration' } }); };
  axios.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, auth: config.headers.Authorization, at: now });
    if (handler) { const result = handler(config, { ok, unauthorized, item }); if (result !== undefined) return result; }
    const customerB = config.headers.Authorization && JSON.parse(Buffer.from(config.headers.Authorization.split('.')[1], 'base64url')).sub === B;
    if (config.url === '/notifications/unread-count') return ok(config, { unreadCount: customerB ? 2 : 3 });
    if (config.url === '/notifications') return ok(config, [item(customerB ? 'Customer B notification' : 'Customer A notification')]);
    return ok(config, { success: true, updatedCount: 1 });
  };
  class FakeWebSocket {
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(data) { this.onmessage?.({ data: JSON.stringify({ type: 'NOTIFICATION', data }) }); }
    close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
    send() { assert.equal(this.readyState, 1); }
  }
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
      if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    }, window, document, sessionStorage, Date, atob, CustomEvent: window.CustomEvent, WebSocket: FakeWebSocket, console }, { filename: file });
    return module.exports;
  }
  const tokens = load('src/utils/tokenStorage.ts');
  const subscribe = tokens.subscribeToAuthenticationChanges;
  tokens.subscribeToAuthenticationChanges = fn => { subscriptions++; const unsubscribe = subscribe(fn); return () => { subscriptions--; unsubscribe(); }; };
  if (authenticated) tokens.saveTokens(token(), 'synthetic-refresh-A');
  const Dropdown = load('src/features/notifications/components/NotificationDropdown.tsx').NotificationDropdown;
  const useLogout = load('src/features/auth/hooks/useIndividualLogout.ts').useIndividualLogout;
  const Provider = load('src/features/auth/components/SessionTimeoutProvider.tsx').default;
  function Probe() { logout = useLogout(); return React.createElement(Dropdown); }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  const unmount = async () => { if (mounted) { await perform(() => root.unmount()); mounted = false; } };
  t.after(async () => {
    await unmount(); container.remove();
    assert.equal(subscriptions, 0); assert.equal(timers.size, 0);
    for (const [name, registered] of listeners) assert.equal(registered.size, 0, name + ' listener leaked');
    Object.assign(window, originals); Date.now = originalNow; axios.defaults.adapter = originalAdapter;
  });
  await perform(() => {
    mounted = true;
    const child = React.createElement(Probe);
    root.render(React.createElement(router.MemoryRouter, null, provider ? React.createElement(Provider, null, child) : child));
  });
  const tick = async ms => {
    const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, value] = next; now = value.at;
      if (value.interval) value.at += value.interval; else timers.delete(id);
      await perform(value.fn);
    }
    now = end; await perform(() => {});
  };
  return { tokens, calls, sockets, container, timers, perform, tick, unmount, ok, item,
    pollingTimers: () => [...timers.values()].filter(value => value.interval === 20000),
    gets: () => calls.filter(value => value.method === 'get' && value.url.startsWith('/notifications')),
    counts: () => calls.filter(value => value.url === '/notifications/unread-count'),
    badge: () => container.querySelector('button[aria-label="Notifications"] span')?.textContent,
    click: element => perform(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))),
    open: () => perform(() => container.querySelector('button[aria-label="Notifications"]').click()),
    event: name => perform(() => window.dispatchEvent(new CustomEvent(name))),
    loginB: () => perform(() => tokens.saveTokens(token(B), 'synthetic-refresh-B')),
    setHandler: fn => { handler = fn; },
    beginLogout: async () => { let promise; await perform(() => { promise = logout(); }); return { promise }; },
  };
}

test('authenticated unread polling runs every 20 seconds without refresh or keep-alive', async t => {
  const h = await setup(t); assert.equal(h.counts().length, 1); assert.equal(h.pollingTimers().length, 1);
  await h.tick(19999); assert.equal(h.counts().length, 1);
  await h.tick(1); assert.equal(h.counts().length, 2);
  await h.tick(40000); assert.equal(h.counts().length, 4);
  assert.ok(h.calls.every(value => value.url === '/notifications/unread-count'));
});

test('opening and closing the dropdown does not restart polling or add mount fetches', async t => {
  const h = await setup(t); await h.tick(10000); await h.open();
  assert.equal(h.counts().length, 2); assert.equal(h.gets().filter(x => x.url === '/notifications').length, 1);
  await h.tick(10000); assert.equal(h.counts().length, 3); assert.equal(h.gets().filter(x => x.url === '/notifications').length, 2);
  await h.open(); await h.tick(20000);
  assert.equal(h.counts().length, 4); assert.equal(h.gets().filter(x => x.url === '/notifications').length, 2);
});

test('five-minute timeout stops polling while the mounted dropdown remains behind the modal', async t => {
  const h = await setup(t, { provider: true }); await h.tick(300000);
  assert.ok(h.container.querySelector('[data-timeout]')); assert.ok(h.container.querySelector('[aria-label="Notifications"]'));
  assert.equal(h.tokens.hasTokens(), false); assert.equal(h.pollingTimers().length, 0);
  const before = h.gets().length; await h.tick(120000);
  await h.event('new-notification-event'); await h.event('open-notification-dropdown');
  assert.equal(h.gets().length, before);
});

test('logout invalidation stops polling before backend completion, even while tokens are retained', async t => {
  const h = await setup(t); const pending = deferred(); let finish;
  h.setHandler((config, { ok }) => {
    if (config.url === '/auth/logout') { finish = () => pending.resolve(ok(config, 'Logged out')); return pending.promise; }
  });
  const logout = await h.beginLogout(); assert.equal(h.tokens.hasTokens(), true);
  assert.equal(h.pollingTimers().length, 0); assert.equal(h.sockets[0].readyState, 3);
  const before = h.gets().length; await h.tick(120000); await h.event('new-notification-event');
  assert.equal(h.gets().length, before);
  await h.perform(finish); await logout.promise; assert.equal(h.tokens.hasTokens(), false);
});

test('401 polling never refreshes and invalidation prevents repeated unauthorized requests', async t => {
  const h = await setup(t); h.setHandler((config, { unauthorized }) => unauthorized(config));
  await h.tick(20000); assert.equal(h.counts().length, 2);
  await h.perform(() => h.tokens.invalidateAuthenticationGeneration());
  await h.tick(120000); await h.event('open-notification-dropdown');
  assert.equal(h.counts().length, 2); assert.ok(h.calls.every(x => x.url === '/notifications/unread-count'));
});

test('backend SESSION_EXPIRED stops polling and preserves the timeout modal', async t => {
  const h = await setup(t, { provider: true });
  h.setHandler((config, { unauthorized }) => unauthorized(config, 'SESSION_EXPIRED'));
  await h.tick(20000); assert.ok(h.container.querySelector('[data-timeout]'));
  assert.equal(h.pollingTimers().length, 0); assert.equal(h.tokens.hasTokens(), false);
  const before = h.calls.length; await h.tick(120000); assert.equal(h.calls.length, before);
});

test('new Individual login resumes one polling interval; token rotation does not restart it', async t => {
  const h = await setup(t); await h.perform(() => h.tokens.clearTokens());
  await h.tick(60000); assert.equal(h.counts().length, 1);
  await h.loginB(); assert.equal(h.counts().length, 2); assert.equal(h.badge(), '2');
  assert.equal(h.pollingTimers().length, 1);
  await h.tick(10000);
  await h.perform(() => h.tokens.saveTokens(h.tokens.getAccessToken(), 'synthetic-rotated-refresh', h.tokens.getAuthenticationGeneration()));
  assert.equal(h.counts().length, 2); assert.equal(h.pollingTimers().length, 1);
  await h.tick(10000); assert.equal(h.counts().length, 3);
});

test('late A count/list responses cannot populate B notifications', async t => {
  const count = deferred(), list = deferred(); let countConfig, listConfig;
  const h = await setup(t, { handler: config => {
    if (config.url.endsWith('/unread-count')) { countConfig = config; return count.promise; }
    if (config.url === '/notifications') { listConfig = config; return list.promise; }
  } });
  await h.open(); h.setHandler(undefined); await h.loginB(); await h.open();
  assert.ok(h.container.textContent.includes('Customer B notification'));
  await h.perform(() => { count.resolve(h.ok(countConfig, { unreadCount: 99 })); list.resolve(h.ok(listConfig, [h.item('Private old A notification')])); });
  assert.equal(h.badge(), '2'); assert.ok(h.container.textContent.includes('Customer B notification'));
  assert.ok(!h.container.textContent.includes('Private old A notification'));
});

test('late A failures/finally cannot replace B error or loading state', async t => {
  const a = deferred(), b = deferred(); let bConfig;
  const h = await setup(t); h.setHandler(config => config.url === '/notifications' ? a.promise : undefined);
  await h.open(); h.setHandler(config => { if (config.url === '/notifications') { bConfig = config; return b.promise; } });
  await h.loginB(); await h.open(); assert.ok(h.container.textContent.includes('Loading notifications'));
  await h.perform(() => a.reject(new Error('Private old A error')));
  assert.ok(h.container.textContent.includes('Loading notifications')); assert.ok(!h.container.textContent.includes('Private old A error'));
  await h.perform(() => b.resolve(h.ok(bConfig, [h.item('B loaded')]))); assert.ok(h.container.textContent.includes('B loaded'));
});

test('late A mark-all completion cannot mark B read or release its pending action', async t => {
  const h = await setup(t); const pending = [];
  h.setHandler(config => { if (config.method === 'put') { const value = deferred(); pending.push({ ...value, config }); return value.promise; } });
  await h.open(); await h.click(h.container.querySelector('[title="Mark all as read"]'));
  await h.loginB(); await h.open(); await h.click(h.container.querySelector('[title="Mark all as read"]'));
  await h.perform(() => pending[0].resolve(h.ok(pending[0].config, { updatedCount: 1 })));
  assert.equal(h.badge(), '2'); assert.equal(h.container.querySelector('[title="Mark all as read"]').disabled, true);
  await h.perform(() => pending[1].resolve(h.ok(pending[1].config, { updatedCount: 1 }))); assert.equal(h.badge(), undefined);
});

test('Corporate-only/unauthenticated mounts and custom events cannot fetch or open the dropdown', async t => {
  const h = await setup(t, { authenticated: false });
  await h.tick(60000); await h.event('new-notification-event'); await h.event('open-notification-dropdown'); await h.open();
  assert.equal(h.calls.length, 0); assert.equal(h.pollingTimers().length, 0); assert.equal(h.sockets.length, 0);
  assert.equal(h.container.querySelector('h3'), null);
  assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-sentinel');
});

test('authenticated custom events fetch normally but cannot fetch after invalidation', async t => {
  const h = await setup(t); await h.event('open-notification-dropdown');
  assert.ok(h.container.querySelector('h3')); assert.equal(h.gets().length, 3);
  await h.event('new-notification-event'); assert.equal(h.gets().length, 5);
  await h.perform(() => h.tokens.invalidateAuthenticationGeneration());
  assert.equal(h.container.querySelector('h3'), null); assert.equal(h.badge(), undefined);
  await h.event('new-notification-event'); await h.event('open-notification-dropdown'); await h.tick(60000);
  assert.equal(h.gets().length, 5);
});

test('unmount removes polling, WebSocket timers and auth/event subscriptions', async t => {
  const pending = deferred(); let config;
  const h = await setup(t, { handler: value => { config = value; return pending.promise; } });
  await h.unmount(); assert.equal(h.timers.size, 0);
  const before = h.calls.length; await h.loginB(); await h.tick(60000); await h.event('new-notification-event');
  await h.perform(() => pending.resolve(h.ok(config, { unreadCount: 99 })));
  assert.equal(h.calls.length, before);
});
