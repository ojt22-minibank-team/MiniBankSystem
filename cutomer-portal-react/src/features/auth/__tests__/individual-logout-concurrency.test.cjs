// Actual React/MemoryRouter, logout hook, token storage, service, Axios interceptors
// and WebSocket hook. Deferred HTTP and WebSocket transports are synthetic; these
// tests do not prove server-side revocation or real browser/network behavior.
// Most tests observe dispatches through a Redux mock; realStore tests additionally
// execute the actual root reducer and customer slices, without mounting MainLayout.
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
const reactI18next = require(project + '/node_modules/react-i18next');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const A = '11111111-1111-4111-8111-111111111111', B = '33333333-3333-4333-8333-333333333333';
const SID_A = '22222222-2222-4222-8222-222222222222', SID_B = '44444444-4444-4444-8444-444444444444';
const temporaryKeys = ['challengeGroupId', 'maskedEmail', 'passwordResetChallengeGroupId', 'passwordResetMaskedEmail',
  'verifiedPasswordResetChallengeGroupId', 'pinResetChallengeGroupId', 'pinResetMaskedEmail', 'verifiedPinResetChallengeGroupId'];

async function setup(t, { sidebar = false, realStore = false } = {}) {
  sessionStorage.clear();
  sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-access');
  sessionStorage.setItem('corporateRefreshToken', 'synthetic-corporate-refresh');
  sessionStorage.setItem('unrelated', 'preserve');
  const i18n = sidebar ? require(project + '/node_modules/i18next').createInstance() : null;
  if (i18n) await i18n.init({
    lng: 'en', fallbackLng: 'en', defaultNS: 'common',
    resources: { en: { common: require(project + '/src/i18n/locales/en/common.json') } },
    interpolation: { escapeValue: false },
  });
  const originalAdapter = axios.defaults.adapter;
  const cache = new Map(), calls = [], logouts = [], refreshes = [], sockets = [], delivered = [], resets = [];
  const revoked = new Set();
  let logout, otherLogout, location, sequence = 0;
  const token = (sub = A, sid = SID_A) => [Buffer.from('{"alg":"HS256"}').toString('base64url'),
    Buffer.from(JSON.stringify({ sub, sid, subjectType: 'CUSTOMER', tokenType: 'ACCESS',
      exp: Math.floor(Date.now() / 1000) + 3600, jti: 'synthetic-' + ++sequence })).toString('base64url'), 'synthetic-signature'].join('.');
  const ok = (config, data = 'Logged out') => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const unauthorized = config => { throw new axios.AxiosError('Synthetic unauthorized', 'ERR_BAD_REQUEST', config, null,
    { config, status: 401, headers: {}, data: {} }); };
  axios.defaults.adapter = config => {
    calls.push({ url: config.url, auth: config.headers.Authorization, retry: config._retry });
    if (config.url === '/auth/logout') {
      const pending = deferred();
      logouts.push({ config, resetsAtRequest: resets.length, resolve: () => { revoked.add(config.headers.Authorization); pending.resolve(ok(config)); },
        fail: () => pending.reject(new Error('Synthetic offline backend')), unauthorized: () => {
          try { unauthorized(config); } catch (error) { pending.reject(error); }
        } });
      return pending.promise;
    }
    if (config.url === '/auth/refresh') {
      const pending = deferred();
      refreshes.push({ config, resolve: data => pending.resolve(ok(config, data)), fail: () => pending.reject(new Error('Synthetic failed refresh')) });
      return pending.promise;
    }
    if (config.url === '/protected' && !config._retry) {
      try { unauthorized(config); } catch (error) { return Promise.reject(error); }
    }
    return Promise.resolve(ok(config));
  };
  class FakeWebSocket {
    static OPEN = 1;
    constructor(url) { this.url = url; this.readyState = 0; this.closes = []; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(data) { this.onmessage?.({ data: JSON.stringify({ type: 'NOTIFICATION', data }) }); }
    close(code = 1000) { this.closes.push(code); this.readyState = 3; this.onclose?.({ code }); }
    send() { assert.equal(this.readyState, 1); }
  }
  const dispatch = action => {
    if (action.type === 'customer/resetState') {
      resets.push({ generation: tokens.getAuthenticationGeneration(), requests: logouts.length });
    }
    if (realStore) return cache.get(path.resolve(project, 'src/lib/redux.ts')).exports.store.dispatch(action);
    return action;
  };
  function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (file.endsWith('/lib/redux.ts') && !realStore) {
      module.exports = { resetCustomerState: () => ({ type: 'customer/resetState' }),
        useAppDispatch: () => dispatch, useAppSelector: fn => fn({ announcements: { announcements: [] } }) };
      return module.exports;
    }
    if (file.endsWith('/announcements/store/announcementSlice.ts') && !realStore) {
      module.exports = { fetchAnnouncements: () => ({ type: 'synthetic-announcements' }) };
      return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return router;
      if (name === 'react-i18next') return reactI18next;
      if (name === 'axios') return axios;
      if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
      if (name === '@reduxjs/toolkit' || name === 'react-redux') return require(project + '/node_modules/' + name);
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    }, window, sessionStorage, localStorage: window.localStorage, Date, atob, CustomEvent: window.CustomEvent, WebSocket: FakeWebSocket, console }, { filename: file });
    if (file.endsWith('/lib/redux.ts') && realStore) {
      // Keep the hook fixture provider-free while dispatching into the real store.
      module.exports.useAppDispatch = () => dispatch;
      module.exports.useAppSelector = fn => fn(module.exports.store.getState());
    }
    return module.exports;
  }
  const tokens = load('src/utils/tokenStorage.ts');
  const accessA = token(); tokens.saveTokens(accessA, 'synthetic-refresh-A');
  const hook = load('src/features/auth/hooks/useIndividualLogout.ts');
  const api = load('src/config/api.ts').default;
  const service = load('src/services/authService.ts');
  const useWebSocket = load('src/features/notifications/hooks/useNotificationWebSocket.ts').useNotificationWebSocket;
  const Sidebar = sidebar ? load('src/components/layout/Sidebar.tsx').default : null;
  function Probe() {
    logout = hook.useIndividualLogout(); otherLogout = hook.useIndividualLogout();
    location = router.useLocation().pathname;
    useWebSocket({ onNotificationReceived: notification => delivered.push(notification) });
    return Sidebar ? React.createElement(Sidebar) : React.createElement('p', null, location);
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount()); container.remove();
    axios.defaults.adapter = originalAdapter;
  });
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  await perform(() => root.render(React.createElement(router.MemoryRouter, { initialEntries: ['/dashboard'] },
    i18n ? React.createElement(reactI18next.I18nextProvider, { i18n }, React.createElement(Probe)) : React.createElement(Probe))));
  const seedTemporary = value => temporaryKeys.forEach(key => sessionStorage.setItem(key, value));
  const assertTemporary = value => temporaryKeys.forEach(key => assert.equal(sessionStorage.getItem(key), value));
  const assertIsolated = () => {
    assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-access');
    assert.equal(sessionStorage.getItem('corporateRefreshToken'), 'synthetic-corporate-refresh');
    assert.equal(sessionStorage.getItem('unrelated'), 'preserve');
  };
  return { tokens, api, service, hook, calls, logouts, refreshes, sockets, delivered, revoked, accessA, token, resets, load,
    redux: realStore ? load('src/lib/redux.ts') : null,
    perform, container, seedTemporary, assertTemporary, assertIsolated, location: () => location,
    invokeLogout: () => logout(),
    begin: async (other = false) => { let promise; await perform(() => { promise = (other ? otherLogout : logout)(); }); return { promise }; },
    loginB: async () => { const accessB = token(B, SID_B); await perform(() => tokens.saveTokens(accessB, 'synthetic-refresh-B')); return accessB; },
  };
}

test('same-session logout clicks across consumers share one request and invalidation', async t => {
  const h = await setup(t); h.seedTemporary('A');
  const a = await h.begin(); const generation = h.tokens.getAuthenticationGeneration(); const duplicate = await h.begin(true);
  assert.equal(h.resets.length, 1); assert.equal(h.resets[0].generation, generation);
  assert.equal(h.resets[0].requests, 0); assert.equal(h.logouts[0].resetsAtRequest, 1);
  assert.equal(h.logouts.length, 1); assert.equal(h.tokens.getAuthenticationGeneration(), generation);
  assert.equal(h.hook.isIndividualLogoutInProgress(), true);
  assert.equal(h.logouts[0].config.headers.Authorization, 'Bearer ' + h.accessA);
  await h.perform(() => h.logouts[0].resolve()); await Promise.all([a.promise, duplicate.promise]);
  assert.equal(h.tokens.hasTokens(), false); h.assertTemporary(null); h.assertIsolated();
  assert.equal(h.location(), '/login'); assert.equal(h.hook.isIndividualLogoutInProgress(), false);
  assert.equal(h.resets.length, 1, 'completion and joined callers must not reset again');
});

test('Session B logs out independently while A is pending, with its own captured token', async t => {
  const h = await setup(t); const a = await h.begin(); const accessB = await h.loginB();
  assert.equal(h.hook.isIndividualLogoutInProgress(), false);
  const b = await h.begin(); assert.equal(h.logouts.length, 2);
  assert.equal(h.resets.length, 2, 'one reset for each distinct logout generation');
  assert.deepEqual(h.logouts.map(x => x.config.headers.Authorization), ['Bearer ' + h.accessA, 'Bearer ' + accessB]);
  await h.perform(() => h.logouts[1].resolve()); await b.promise;
  assert.equal(h.revoked.has('Bearer ' + accessB), true); assert.equal(h.tokens.hasTokens(), false);
  await h.perform(() => h.logouts[0].resolve()); await a.promise; h.assertIsolated();
});

test('a failed B logout still ends B locally while the older A operation is pending', async t => {
  const h = await setup(t); const a = await h.begin(); await h.loginB(); h.seedTemporary('B'); const b = await h.begin();
  await h.perform(() => h.logouts[1].fail()); await b.promise;
  assert.equal(h.tokens.hasTokens(), false); h.assertTemporary(null); assert.equal(h.location(), '/login');
  assert.equal(h.hook.isIndividualLogoutInProgress(), false);
  await h.perform(() => h.logouts[0].fail()); await a.promise; h.assertIsolated();
});

test('starting a new login protects its challenge/recovery data before new tokens arrive', async t => {
  const h = await setup(t); const a = await h.begin();
  await h.perform(() => { h.service.loginCustomer({}).catch(() => {}); });
  h.seedTemporary('new-login');
  await h.perform(() => h.logouts[0].resolve()); await a.promise;
  h.assertTemporary('new-login'); assert.equal(h.location(), '/dashboard');
});

for (const failure of [false, true]) {
  test(`late A ${failure ? 'failure' : 'success'} cannot clear B tokens, temporary data, route, or socket`, async t => {
    const h = await setup(t); const a = await h.begin(); const accessB = await h.loginB(); h.seedTemporary('B');
    const socketB = h.sockets.at(-1); await h.perform(() => socketB.open());
    await h.perform(() => failure ? h.logouts[0].fail() : h.logouts[0].resolve()); await a.promise;
    assert.equal(h.tokens.getAccessToken(), accessB); assert.equal(h.tokens.getRefreshToken(), 'synthetic-refresh-B');
    h.assertTemporary('B'); h.assertIsolated(); assert.equal(h.location(), '/dashboard');
    assert.equal(socketB.readyState, 1); assert.equal(socketB.closes.length, 0);
    assert.equal(h.resets.length, 1, 'late A completion must not dispatch a reset for B');
  });
  test(`older A ${failure ? 'failure' : 'success'} cannot release B's pending logout coordination`, async t => {
    const h = await setup(t); const a = await h.begin(); await h.loginB(); const b = await h.begin();
    await h.perform(() => failure ? h.logouts[0].fail() : h.logouts[0].resolve()); await a.promise;
    assert.equal(h.hook.isIndividualLogoutInProgress(), true);
    const duplicateB = await h.begin(true); assert.equal(h.logouts.length, 2);
    await h.perform(() => h.logouts[1].resolve()); await Promise.all([b.promise, duplicateB.promise]);
    assert.equal(h.tokens.hasTokens(), false); assert.equal(h.location(), '/login');
  });
}

test('Axios cannot replace a delayed Session A logout header with Session B credentials', async t => {
  const h = await setup(t); const gate = deferred();
  const id = h.api.interceptors.request.use(async config => {
    if (config.url === '/auth/logout' && config.headers.Authorization === 'Bearer ' + h.accessA) await gate.promise;
    return config;
  });
  const a = await h.begin(); assert.equal(h.logouts.length, 0);
  const accessB = await h.loginB(); const b = await h.begin();
  assert.equal(h.logouts[0].config.headers.Authorization, 'Bearer ' + accessB);
  await h.perform(() => gate.resolve());
  assert.equal(h.logouts[1].config.headers.Authorization, 'Bearer ' + h.accessA);
  await h.perform(() => h.logouts[1].resolve()); await a.promise;
  assert.equal(h.tokens.getAccessToken(), accessB);
  await h.perform(() => h.logouts[0].resolve()); await b.promise;
  h.api.interceptors.request.eject(id);
});

test('service default captures the token before asynchronous Axios dispatch; null never borrows B', async t => {
  const h = await setup(t);
  const a = h.service.logoutCustomer(); const accessB = await h.loginB();
  assert.equal(h.logouts[0].config.headers.Authorization, 'Bearer ' + h.accessA);
  await h.perform(() => h.logouts[0].resolve()); await a;
  const missing = h.service.logoutCustomer(null); await h.perform(() => {});
  assert.equal(h.logouts[1].config.headers.Authorization, undefined);
  const rejected = assert.rejects(missing);
  await h.perform(() => h.logouts[1].unauthorized()); await rejected;
  assert.equal(h.tokens.getAccessToken(), accessB); assert.equal(h.refreshes.length, 0);
});

for (const response of ['network failure', '401']) {
  test(`logout ${response} clears this session locally without refresh/retry or Corporate cleanup`, async t => {
    const h = await setup(t); h.seedTemporary('A'); const a = await h.begin();
    assert.equal(h.resets.length, 1, 'reset already happened while backend request is pending');
    await h.perform(() => response === '401' ? h.logouts[0].unauthorized() : h.logouts[0].fail()); await a.promise;
    assert.equal(h.tokens.hasTokens(), false); h.assertTemporary(null); h.assertIsolated();
    assert.equal(h.location(), '/login'); assert.equal(h.refreshes.length, 0); assert.equal(h.logouts.length, 1);
    assert.equal(h.resets.length, 1);
  });
}

test('a newer login between cleanup and navigation is not redirected by the completed logout', async t => {
  const h = await setup(t); let notices = 0; const accessB = h.token(B, SID_B);
  const unsubscribe = h.tokens.subscribeToAuthenticationChanges(() => {
    if (++notices === 2) Promise.resolve().then(() => { h.tokens.saveTokens(accessB, 'synthetic-refresh-B'); h.seedTemporary('B'); });
  });
  const a = await h.begin(); await h.perform(() => h.logouts[0].resolve()); await a.promise; unsubscribe();
  assert.equal(h.tokens.getAccessToken(), accessB); h.assertTemporary('B'); assert.equal(h.location(), '/dashboard');
});

for (const failure of [false, true]) {
  test(`late refresh ${failure ? 'failure' : 'success'} after logout cannot restore A, retry, or clear B`, async t => {
    const h = await setup(t); let pending;
    await h.perform(() => { pending = h.api.get('/protected').then(() => null, error => error); });
    assert.equal(h.refreshes.length, 1);
    const a = await h.begin(); await h.perform(() => h.logouts[0].resolve()); await a.promise;
    const accessB = await h.loginB(); h.seedTemporary('B');
    await h.perform(() => failure ? h.refreshes[0].fail() : h.refreshes[0].resolve({ accessToken: h.token(), refreshToken: 'stale-refresh' }));
    assert.ok(await pending); assert.equal(h.tokens.getAccessToken(), accessB); h.assertTemporary('B');
    assert.equal(h.calls.filter(x => x.url === '/protected').length, 1); h.assertIsolated();
  });
}

test('normal concurrent 401s still share refresh, rotate tokens and retry', async t => {
  const h = await setup(t); let first, second;
  await h.perform(() => { first = h.api.get('/protected'); second = h.api.get('/protected'); });
  assert.equal(h.refreshes.length, 1); const rotated = h.token();
  await h.perform(() => h.refreshes[0].resolve({ accessToken: rotated, refreshToken: 'rotated-refresh' }));
  await Promise.all([first, second]);
  assert.equal(h.tokens.getAccessToken(), rotated); assert.equal(h.tokens.getRefreshToken(), 'rotated-refresh');
  assert.equal(h.calls.filter(x => x.url === '/protected' && x.retry).length, 2);
  assert.equal(h.resets.length, 0, 'ordinary refresh rotation must not reset Redux');
});

test('logout immediately closes its socket and stale A frames cannot reach the new B session', async t => {
  const h = await setup(t); const socketA = h.sockets[0]; await h.perform(() => socketA.open());
  const a = await h.begin(); assert.equal(socketA.readyState, 3);
  await h.loginB(); const socketB = h.sockets.at(-1); await h.perform(() => socketB.open());
  await h.perform(() => { socketA.message({ notificationId: 'stale-A' }); socketA.onopen?.({}); });
  assert.equal(h.delivered.length, 0); assert.equal(socketB.readyState, 1);
  const b = await h.begin(); assert.equal(socketB.readyState, 3);
  await h.perform(() => { h.logouts[0].resolve(); h.logouts[1].resolve(); }); await Promise.all([a.promise, b.promise]);
});

test('Sidebar logout and another hook consumer use the same safe session operation', async t => {
  const h = await setup(t, { sidebar: true });
  const button = [...h.container.querySelectorAll('button')].find(x => x.querySelector('p')?.textContent?.trim() === 'Logout');
  assert.ok(button);
  await h.perform(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const duplicate = await h.begin(); assert.equal(h.logouts.length, 1);
  assert.equal(h.resets.length, 1, 'Sidebar and the other consumer must share one Redux reset');
  assert.equal(button.disabled, true);
  await h.loginB(); h.seedTemporary('B');
  assert.equal(button.disabled, false, 'Session A must not disable the new session logout button');
  await h.perform(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(h.logouts.length, 2); assert.equal(button.disabled, true);
  await h.perform(() => h.logouts[0].resolve()); await duplicate.promise;
  assert.equal(h.location(), '/dashboard'); assert.equal(h.tokens.hasTokens(), true); h.assertTemporary('B');
  assert.equal(button.disabled, true, 'A completion must not release B button coordination');
  assert.equal(h.resets.length, 2, 'late A completion must not reset B again');
  await h.perform(() => h.logouts[1].resolve()); assert.equal(h.location(), '/login');
  h.assertIsolated();
});

test('without an access token, logout clears local Individual data without sending another session token', async t => {
  const h = await setup(t); await h.perform(() => sessionStorage.removeItem('accessToken')); h.seedTemporary('A');
  const a = await h.begin(); await a.promise;
  assert.equal(h.logouts.length, 0); assert.equal(h.tokens.hasTokens(), false); h.assertTemporary(null); h.assertIsolated();
  assert.equal(h.location(), '/login');
  assert.equal(h.resets.length, 1);
});

test('logout synchronously resets actual customer slices while preserving Settings and captured credentials', async t => {
  const h = await setup(t, { realStore: true });
  const store = h.redux.store;
  const initial = store.getState();
  const profile = h.load('src/features/customer-account/profile/store/ProfileSlice.ts');
  const settings = h.load('src/features/customer-account/settings/store/SettingsSlice.ts');
  const accounts = h.load('src/features/customer-account/accounts/stores/accountsSlice.ts');
  const dashboard = h.load('src/features/customer-account/dashboard/store/dashboardSlice.ts');
  const announcements = h.load('src/features/customer-account/announcements/store/announcementSlice.ts');
  const transfer = h.load('src/features/transfer/store/transferSlice.ts');
  store.dispatch(profile.setProfile({ customerCode: 'synthetic-A' }));
  store.dispatch(settings.setTheme('dark'));
  store.dispatch(settings.setLanguage('my'));
  store.dispatch(settings.setNotificationsEnabled(false));
  store.dispatch(accounts.fetchMyAccounts.pending('accounts-A'));
  store.dispatch(accounts.fetchMyAccounts.fulfilled([{ accountNumber: 'synthetic-A', availableBalance: 25 }], 'accounts-A'));
  store.dispatch(dashboard.setDashboard({ marker: 'synthetic-A' }));
  store.dispatch(announcements.fetchAnnouncements.pending('announcements-A'));
  store.dispatch(announcements.fetchAnnouncements.fulfilled([{ announcementId: 1, title: 'synthetic-A' }], 'announcements-A'));
  store.dispatch(transfer.submitP2PTransfer.fulfilled({ transactionId: 'synthetic-A' }, 'transfer-A'));
  const preservedSettings = store.getState().settings;
  for (const key of ['profile', 'accounts', 'dashboard', 'announcements', 'transfer']) {
    assert.notDeepEqual(store.getState()[key], initial[key], key + ' must contain pre-logout data');
  }
  let pending;
  await h.perform(() => {
    const previousGeneration = h.tokens.getAuthenticationGeneration();
    assert.equal(h.resets.length, 0);
    assert.equal(h.tokens.isAuthenticationGenerationCurrent(previousGeneration), true);
    pending = h.invokeLogout();
    assert.equal(h.resets.length, 1, 'dispatch must happen synchronously in the logout call');
    assert.equal(h.resets[0].generation, previousGeneration + 1);
    for (const key of ['profile', 'accounts', 'dashboard', 'announcements', 'transfer']) {
      assert.deepEqual(store.getState()[key], initial[key], key);
    }
    assert.strictEqual(store.getState().settings, preservedSettings);
  });
  assert.equal(h.resets.length, 1);
  assert.equal(h.tokens.isAuthenticationGenerationCurrent(h.resets[0].generation), false);
  assert.equal(h.tokens.getAccessToken(), h.accessA, 'retain captured credentials until existing revocation completes');
  assert.equal(h.location(), '/dashboard', 'navigation timing must remain unchanged');
  for (const key of ['profile', 'accounts', 'dashboard', 'announcements', 'transfer']) {
    assert.deepEqual(store.getState()[key], initial[key], key);
  }
  assert.strictEqual(store.getState().settings, preservedSettings);
  assert.equal(h.logouts[0].resetsAtRequest, 1);
  await h.perform(() => h.logouts[0].resolve()); await pending;
  assert.equal(h.resets.length, 1); h.assertIsolated();
});

for (const failure of [false, true]) {
  test(`late A logout ${failure ? 'failure' : 'success'} preserves B's actual Redux state`, async t => {
    const h = await setup(t, { realStore: true });
    const a = await h.begin(); await h.loginB();
    h.redux.store.dispatch(h.load('src/features/customer-account/profile/store/ProfileSlice.ts').setProfile({ customerCode: 'synthetic-B' }));
    const stateB = h.redux.store.getState();
    await h.perform(() => failure ? h.logouts[0].fail() : h.logouts[0].resolve()); await a.promise;
    assert.strictEqual(h.redux.store.getState(), stateB);
    assert.equal(h.resets.length, 1); assert.equal(h.location(), '/dashboard'); h.assertIsolated();
  });
}
