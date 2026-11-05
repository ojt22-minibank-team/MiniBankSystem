// Real Axios, token lifecycle, Redux reducers and selected mounted fetching effects.
// All HTTP uses an in-process adapter; no backend, SMTP or real financial action.
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
const reactRedux = require(project + '/node_modules/react-redux');
const toolkit = require(project + '/node_modules/@reduxjs/toolkit');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function setup(t) {
  sessionStorage.clear();
  sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-access');
  sessionStorage.setItem('corporateRefreshToken', 'synthetic-corporate-refresh');
  const cache = new Map(), calls = [], events = [], actions = [];
  const originalAdapter = axios.defaults.adapter;
  let handler, root, container, announcementsPending = 0;
  const ok = (config, data = { marker: 'synthetic' }) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const fail = (config, status, data = {}) => new axios.AxiosError('Synthetic rejected response', 'ERR_BAD_RESPONSE', config, null,
    { config, data, status, statusText: 'Error', headers: {} });
  axios.defaults.adapter = config => {
    calls.push({ url: config.url, auth: config.headers.Authorization, generation: config._authGeneration, retry: config._retry });
    return handler ? handler(config) : Promise.resolve(ok(config));
  };
  const onTimeout = event => events.push(event.detail);
  window.addEventListener('minibank:session-timeout', onTimeout);
  const observe = () => next => action => {
    actions.push(action);
    if (action.type === 'announcements/fetchAnnouncements/pending' && ++announcementsPending > 12) {
      // Bound an actual mounted retry loop so this diagnostic cannot hang CI.
      // The integration test below still FAILS if repeated dispatches occurred.
      throw new Error('Mounted Announcements retry-loop diagnostic safety bound reached.');
    }
    return next(action);
  };
  const testToolkit = { ...toolkit, configureStore: options => toolkit.configureStore({
    ...options, middleware: getDefault => getDefault().concat(observe),
  }) };
  function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    // Only decorative/layout children are stubbed. Fetching effects and reducers
    // in MainLayout and AnnouncementsPage execute their real production code.
    if (file.endsWith('/components/layout/Navbar.tsx') || file.endsWith('/components/layout/Sidebar.tsx') ||
        file.endsWith('/announcements/components/AnnouncementList.tsx')) {
      module.exports = { __esModule: true, default: () => null }; return module.exports;
    }
    if (file.endsWith('/notifications/components/ToastContainer.tsx')) {
      module.exports = { ToastContainer: () => null }; return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return router;
      if (name === 'react-redux') return reactRedux;
      if (name === '@reduxjs/toolkit') return testToolkit;
      if (name === 'axios') return axios;
      if (!name.startsWith('.')) return require(project + '/node_modules/' + name);
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    }, window, document, sessionStorage, localStorage: window.localStorage, Date, atob,
    AbortController, CustomEvent: window.CustomEvent, console }, { filename: file });
    return module.exports;
  }
  const tokens = load('src/utils/tokenStorage.ts');
  tokens.saveTokens('synthetic-access-A', 'synthetic-refresh-A');
  const api = load('src/config/api.ts').default;
  const isolated = () => {
    assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-access');
    assert.equal(sessionStorage.getItem('corporateRefreshToken'), 'synthetic-corporate-refresh');
  };
  t.after(async () => {
    try { if (root) await act(async () => root.unmount()); }
    finally {
      container?.remove(); axios.defaults.adapter = originalAdapter;
      window.removeEventListener('minibank:session-timeout', onTimeout); isolated();
    }
  });
  return { api, tokens, load, calls, events, actions, ok, fail, isolated,
    setHandler: value => { handler = value; },
    loginB: () => tokens.saveTokens('synthetic-access-B', 'synthetic-refresh-B'),
    mount: async (Component, store) => {
      container = document.createElement('div'); document.body.append(container); root = createRoot(container);
      await act(async () => {
        root.render(React.createElement(reactRedux.Provider, { store }, React.createElement(router.MemoryRouter, null, React.createElement(Component))));
        await flush();
      });
    },
  };
}

test('normal protected requests and responses retain their originating generation', async t => {
  const h = setup(t); const generation = h.tokens.getAuthenticationGeneration();
  assert.equal((await h.api.get('/profile')).data.marker, 'synthetic');
  assert.deepEqual(h.calls, [{ url: '/profile', auth: 'Bearer synthetic-access-A', generation, retry: undefined }]);
});

for (const url of ['/profile', '/accounts', '/dashboard', '/announcements', '/transfers/p2p']) {
  test('initial protected request is blocked before the adapter after invalidation: ' + url, async t => {
    const h = setup(t); h.tokens.invalidateAuthenticationGeneration();
    assert.equal(h.tokens.getAccessToken(), 'synthetic-access-A');
    await assert.rejects(h.api.request({ url, method: url === '/transfers/p2p' ? 'post' : 'get' }), error => axios.isCancel(error));
    assert.equal(h.calls.length, 0); assert.equal(h.events.length, 0);
  });
}

for (const method of ['get', 'post', 'request', 'callable']) {
  test('queued A request cannot acquire B credentials through ' + method, async t => {
    const h = setup(t), gate = deferred(); const generationA = h.tokens.getAuthenticationGeneration();
    const id = h.api.interceptors.request.use(async config => { await gate.promise; return config; });
    const request = method === 'callable' ? h.api({ url: '/profile' }) : method === 'request'
      ? h.api.request({ url: '/profile' }) : h.api[method]('/profile');
    const rejected = assert.rejects(request, error => axios.isCancel(error) && error.config._authGeneration === generationA);
    h.loginB(); gate.resolve(); await rejected; h.api.interceptors.request.eject(id);
    assert.equal(h.calls.length, 0);
    await h.api.get('/profile'); assert.equal(h.calls[0].auth, 'Bearer synthetic-access-B');
  });
}

test('explicit stale retry generation is never replaced with the current B generation', async t => {
  const h = setup(t), generationA = h.tokens.getAuthenticationGeneration(); h.loginB();
  await assert.rejects(h.api.get('/accounts', { _retry: true, _authGeneration: generationA,
    headers: { Authorization: 'Bearer synthetic-access-A' } }), error => axios.isCancel(error));
  assert.equal(h.calls.length, 0); await h.api.get('/accounts');
  assert.equal(h.calls[0].auth, 'Bearer synthetic-access-B');
});

for (const replace of [false, true]) {
  test('stale successful response is rejected after ' + (replace ? 'B login' : 'logout invalidation'), async t => {
    const h = setup(t), pending = deferred(); let original;
    h.setHandler(config => { original = config; return pending.promise; });
    const request = h.api.get('/profile'); const rejected = assert.rejects(request, error => axios.isCancel(error));
    await flush(); h.tokens.invalidateAuthenticationGeneration(); if (replace) h.loginB();
    pending.resolve(h.ok(original, { privateProfile: 'synthetic-A' })); await rejected;
    assert.equal(h.events.length, 0); assert.equal(h.calls.length, 1);
    assert.equal(h.tokens.getAccessToken(), replace ? 'synthetic-access-B' : 'synthetic-access-A');
    assert.equal(window.location.pathname, '/');
  });
}

for (const status of [401, 500, 'network']) {
  test('stale ' + status + ' failure cannot refresh, clear B or emit a timeout', async t => {
    const h = setup(t), pending = deferred(); let original;
    h.setHandler(config => { original = config; return pending.promise; });
    const request = h.api.get('/profile'); const rejected = assert.rejects(request);
    await flush(); h.tokens.invalidateAuthenticationGeneration(); h.loginB();
    pending.reject(status === 'network' ? new Error('Synthetic network failure') : h.fail(original, status, { code: 'SESSION_EXPIRED' }));
    await rejected;
    assert.equal(h.calls.length, 1); assert.equal(h.events.length, 0);
    assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B'); assert.equal(h.tokens.getRefreshToken(), 'synthetic-refresh-B');
    assert.equal(window.location.pathname, '/');
  });
}

test('captured-token logout remains exempt even when delayed behind B login', async t => {
  const h = setup(t), gate = deferred();
  h.api.interceptors.request.use(async config => { if (config.url === '/auth/logout') await gate.promise; return config; });
  h.tokens.invalidateAuthenticationGeneration();
  const request = h.load('src/services/authService.ts').logoutCustomer('synthetic-access-A');
  h.loginB(); gate.resolve(); await request;
  assert.equal(h.calls[0].url, '/auth/logout'); assert.equal(h.calls[0].auth, 'Bearer synthetic-access-A');
  assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B'); assert.equal(h.events.length, 0);
});

test('normal concurrent refresh rotates once; same-generation old-token responses remain valid', async t => {
  const h = setup(t), refresh = deferred(), delayed = deferred(); let refreshConfig, delayedConfig;
  const generation = h.tokens.getAuthenticationGeneration();
  h.setHandler(config => {
    if (config.url === '/delayed') { delayedConfig = config; return delayed.promise; }
    if (config.url === '/auth/refresh') { refreshConfig = config; return refresh.promise; }
    if (!config._retry) return Promise.reject(h.fail(config, 401));
    return Promise.resolve(h.ok(config));
  });
  const old = h.api.get('/delayed'), first = h.api.get('/accounts'), second = h.api.get('/dashboard');
  await flush(); assert.equal(h.calls.filter(x => x.url === '/auth/refresh').length, 1);
  refresh.resolve(h.ok(refreshConfig, { accessToken: 'synthetic-rotated-A', refreshToken: 'synthetic-rotated-refresh-A' }));
  await Promise.all([first, second]);
  delayed.resolve(h.ok(delayedConfig)); await old;
  assert.equal(h.tokens.getAuthenticationGeneration(), generation);
  assert.equal(h.tokens.getAccessToken(), 'synthetic-rotated-A');
  assert.equal(h.tokens.getRefreshToken(), 'synthetic-rotated-refresh-A');
  assert.equal(h.calls.filter(x => x.retry).length, 2);
});

for (const url of ['/auth/login', '/auth/verify-otp', '/auth/resend-otp', '/auth/first-login/change-password',
  '/auth/first-login/setup-pin', '/auth/password-reset/request', '/auth/password-reset/verify-otp',
  '/auth/password-reset/confirm', '/auth/refresh']) {
  test('public authentication remains exempt, including a late response: ' + url, async t => {
    const h = setup(t), pending = deferred(); let original;
    h.tokens.invalidateAuthenticationGeneration();
    h.setHandler(config => { original = config; return pending.promise; });
    const request = h.api.post(url, { synthetic: true }); await flush(); h.loginB();
    pending.resolve(h.ok(original, { challengeGroupId: 'synthetic-challenge' }));
    assert.equal((await request).data.challengeGroupId, 'synthetic-challenge');
    assert.equal(h.calls[0].auth, undefined); assert.equal(h.events.length, 0);
    assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B');
  });
}

test('mounted MainLayout reset attempts are blocked without leaving Accounts loading or suppressing B', async t => {
  const h = setup(t), redux = h.load('src/lib/redux.ts');
  const accounts = h.load('src/features/customer-account/accounts/stores/accountsSlice.ts');
  const profile = h.load('src/features/customer-account/profile/store/ProfileSlice.ts');
  redux.store.dispatch(profile.setProfile({ customerCode: 'synthetic-A' }));
  redux.store.dispatch(accounts.fetchMyAccounts.pending('seed-A'));
  redux.store.dispatch(accounts.fetchMyAccounts.fulfilled([{ accountNumber: 'synthetic-A' }], 'seed-A'));
  await h.mount(h.load('src/components/layout/MainLayout.tsx').default, redux.store);
  assert.equal(h.calls.length, 0);
  await act(async () => { h.tokens.invalidateAuthenticationGeneration(); redux.store.dispatch(redux.resetCustomerState()); await flush(); });
  assert.equal(h.calls.length, 0, 'no HTTP may use retained A credentials');
  assert.equal(redux.store.getState().profile.profile, null);
  assert.equal(redux.store.getState().accounts.loading, false);
  assert.equal(redux.store.getState().accounts.currentRequestId, null);
  assert.equal(h.actions.filter(x => x.type === accounts.fetchMyAccounts.pending.type).length, 2, 'one seeded request and one blocked refetch; no dispatch loop');
  h.loginB(); h.setHandler(config => Promise.resolve(h.ok(config, [{ accountNumber: 'synthetic-B' }])));
  await act(async () => { await redux.store.dispatch(accounts.fetchMyAccounts()); });
  assert.equal(redux.store.getState().accounts.accounts[0].accountNumber, 'synthetic-B');
  assert.equal(h.calls[0].auth, 'Bearer synthetic-access-B');
});

for (const [slice, file, thunk, url, dataB] of [
  ['accounts', 'src/features/customer-account/accounts/stores/accountsSlice.ts', 'fetchMyAccounts', '/accounts', [{ accountNumber: 'synthetic-B' }]],
  ['dashboard', 'src/features/customer-account/dashboard/store/dashboardSlice.ts', 'fetchDashboard', '/dashboard', { marker: 'synthetic-B' }],
  ['announcements', 'src/features/customer-account/announcements/store/announcementSlice.ts', 'fetchAnnouncements', '/announcements', [{ announcementId: 2, title: 'synthetic-B' }]],
]) {
  test('real ' + slice + ' thunk lets B load while A is pending and ignores A completion', async t => {
    const h = setup(t), redux = h.load('src/lib/redux.ts'), pending = deferred(); let configA;
    const fetch = h.load(file)[thunk];
    h.setHandler(config => { configA = config; return pending.promise; });
    const requestA = redux.store.dispatch(fetch()); await flush();
    assert.equal(h.calls[0].auth, 'Bearer synthetic-access-A');
    h.tokens.invalidateAuthenticationGeneration(); redux.store.dispatch(redux.resetCustomerState()); h.loginB();
    h.setHandler(config => Promise.resolve(h.ok(config, dataB)));
    const requestB = await redux.store.dispatch(fetch());
    assert.equal(requestB.meta.requestStatus, 'fulfilled');
    assert.equal(h.calls.filter(x => x.url === url).length, 2);
    assert.equal(h.calls[1].auth, 'Bearer synthetic-access-B');
    const stateB = redux.store.getState()[slice];
    pending.resolve(h.ok(configA, []));
    const resultA = await requestA;
    assert.equal(resultA.meta.requestStatus, 'rejected');
    assert.strictEqual(redux.store.getState()[slice], stateB);
    assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B'); assert.equal(h.events.length, 0);
  });
}

test('INTEGRATION: mounted AnnouncementsPage must not repeatedly dispatch after logout invalidation', async t => {
  const h = setup(t), redux = h.load('src/lib/redux.ts');
  const axiosAttempts = [];
  h.api.interceptors.request.use(config => { axiosAttempts.push(config.url); return config; });
  h.setHandler(config => Promise.resolve(h.ok(config, [])));
  const announcements = h.load('src/features/customer-account/announcements/store/announcementSlice.ts');
  redux.store.dispatch(announcements.fetchAnnouncements.pending('seed-A'));
  redux.store.dispatch(announcements.fetchAnnouncements.fulfilled([], 'seed-A'));
  await h.mount(h.load('src/features/customer-account/announcements/pages/AnnouncementsPage.tsx').default, redux.store);
  let diagnosticError;
  try {
    await act(async () => { h.tokens.invalidateAuthenticationGeneration(); redux.store.dispatch(redux.resetCustomerState()); await flush(); });
  } catch (error) { diagnosticError = error; }
  const attempts = h.actions.filter(x => x.type === announcements.fetchAnnouncements.pending.type).length - 1;
  const rejected = h.actions.filter(x => x.type === announcements.fetchAnnouncements.rejected.type).length;
  assert.equal(h.calls.length, 0, 'guard must prevent HTTP despite any repeated dispatches');
  assert.ok(attempts <= 1, `INTEGRATION BLOCKER: AnnouncementsPage dispatched ${attempts} refetches and ${rejected} rejections, with ${axiosAttempts.length} Axios attempts after invalidation (diagnostic safety bound: 12). ${diagnosticError?.message || ''}`);
  assert.equal(diagnosticError, undefined);
});
