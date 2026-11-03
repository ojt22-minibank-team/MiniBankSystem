// Actual provider, modal, Redux reducers, token lifecycle and Axios interceptors.
// Controlled clocks and in-process adapters only; no live backend, OTP or SMTP.
// Trusted activity is invoked through captured listeners, not a native browser event.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window', 'document', 'HTMLElement', 'Event', 'MouseEvent', 'CustomEvent', 'sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react'), { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const router = require(project + '/node_modules/react-router-dom');
const reactRedux = require(project + '/node_modules/react-redux');
const toolkit = require(project + '/node_modules/@reduxjs/toolkit');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const slices = ['profile', 'accounts', 'dashboard', 'announcements', 'transfer'];
const challengeKeys = ['challengeGroupId', 'maskedEmail', 'pinResetChallengeGroupId', 'pinResetMaskedEmail', 'verifiedPinResetChallengeGroupId'];

async function setup(t, { announcementsPage = false, authenticated = true } = {}) {
  sessionStorage.clear();
  sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-access');
  sessionStorage.setItem('corporateRefreshToken', 'synthetic-corporate-refresh');
  const cache = new Map(), calls = [], events = [], actions = [], timers = new Map(), activity = new Map();
  let now = 1_000_000, timerId = 0, handler, modalProps, logout, location, navigationType, pendingCount = 0, activityListener;
  const original = { now: Date.now, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    add: window.addEventListener, remove: window.removeEventListener, adapter: axios.defaults.adapter };
  Date.now = () => now;
  window.setTimeout = (callback, delay) => {
    const id = ++timerId; timers.set(id, { callback, at: now + delay, delay }); return id;
  };
  window.clearTimeout = id => timers.delete(id);
  const activityNames = ['pointerdown', 'click', 'keydown', 'input', 'scroll', 'touchstart'];
  window.addEventListener = function (name, listener, options) {
    // The provider registers one shared handler for all six events, starting
    // with pointerdown. Exclude jsdom's independent native focus listeners.
    if (name === 'pointerdown' && options?.capture === true && options?.passive === true) activityListener = listener;
    if (activityNames.includes(name) && listener === activityListener) {
      activity.set(name, listener);
    }
    return original.add.call(this, name, listener, options);
  };
  window.removeEventListener = function (name, listener, options) {
    if (activity.get(name) === listener) activity.delete(name);
    return original.remove.call(this, name, listener, options);
  };
  const ok = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const fail = (config, code = 'SESSION_EXPIRED') => new axios.AxiosError('Synthetic response', 'ERR_BAD_RESPONSE', config, null,
    { config, status: 401, headers: {}, data: { code, message: 'Synthetic session expired.' } });
  axios.defaults.adapter = config => { calls.push(config); return handler ? handler(config) : Promise.resolve(ok(config)); };
  const captureEvent = event => events.push(event.detail);
  window.addEventListener('minibank:session-timeout', captureEvent);
  const observe = () => next => action => {
    actions.push(action);
    if (action.type === 'announcements/fetchAnnouncements/pending' && ++pendingCount > 12) {
      // Test-only diagnostic bound. The integration assertion below still fails
      // for repeated retries; production has no new retry limit.
      throw new Error('Timeout Announcements retry-loop diagnostic safety bound reached.');
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
    if (file.endsWith('/announcements/components/AnnouncementList.tsx')) {
      module.exports = { __esModule: true, default: () => null }; return module.exports;
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
    }, window, document, sessionStorage, localStorage: window.localStorage, Date, atob, AbortController,
    CustomEvent: window.CustomEvent, console }, { filename: file });
    if (file.endsWith('/auth/components/SessionTimeoutModal.tsx')) {
      const RealModal = module.exports.default;
      module.exports.default = props => { modalProps = props; return React.createElement(RealModal, props); };
    }
    return module.exports;
  }
  const tokens = load('src/utils/tokenStorage.ts');
  if (authenticated) tokens.saveTokens('synthetic-access-A', 'synthetic-refresh-A');
  const api = load('src/config/api.ts').default;
  const redux = load('src/lib/redux.ts'), store = redux.store, initial = store.getState();
  const parts = {
    profile: load('src/features/customer-account/profile/store/ProfileSlice.ts'),
    settings: load('src/features/customer-account/settings/store/SettingsSlice.ts'),
    accounts: load('src/features/customer-account/accounts/stores/accountsSlice.ts'),
    dashboard: load('src/features/customer-account/dashboard/store/dashboardSlice.ts'),
    announcements: load('src/features/customer-account/announcements/store/announcementSlice.ts'),
    transfer: load('src/features/transfer/store/transferSlice.ts'),
  };
  function seed(label = 'A') {
    store.dispatch(parts.profile.setProfile({ customerCode: 'synthetic-' + label }));
    store.dispatch(parts.settings.setTheme('dark'));
    store.dispatch(parts.settings.setLanguage('my'));
    store.dispatch(parts.settings.setNotificationsEnabled(false));
    store.dispatch(parts.accounts.fetchMyAccounts.pending('accounts-' + label));
    store.dispatch(parts.accounts.fetchMyAccounts.fulfilled([{ accountNumber: 'synthetic-' + label }], 'accounts-' + label));
    store.dispatch(parts.dashboard.setDashboard({ marker: 'synthetic-' + label }));
    store.dispatch(parts.announcements.fetchAnnouncements.pending('seed-' + label));
    store.dispatch(parts.announcements.fetchAnnouncements.fulfilled([{ announcementId: 1, title: 'synthetic-' + label }], 'seed-' + label));
    store.dispatch(parts.transfer.submitP2PTransfer.fulfilled({ transactionId: 'synthetic-' + label }, 'transfer-' + label));
    for (const key of slices) assert.notDeepEqual(store.getState()[key], initial[key], key);
  }
  seed();
  const settings = store.getState().settings;
  const useLogout = load('src/features/auth/hooks/useIndividualLogout.ts').useIndividualLogout;
  const TimeoutProvider = load('src/features/auth/components/SessionTimeoutProvider.tsx').default;
  const Announcements = announcementsPage ? load('src/features/customer-account/announcements/pages/AnnouncementsPage.tsx').default : null;
  function Probe() {
    logout = useLogout(); location = router.useLocation().pathname; navigationType = router.useNavigationType();
    return Announcements ? React.createElement(Announcements) : React.createElement('p', null, 'Synthetic protected content');
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  await perform(() => root.render(React.createElement(reactRedux.Provider, { store },
    React.createElement(router.MemoryRouter, { initialEntries: ['/dashboard'] },
      React.createElement(TimeoutProvider, null, React.createElement(Probe))))));
  const isolated = () => {
    assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-access');
    assert.equal(sessionStorage.getItem('corporateRefreshToken'), 'synthetic-corporate-refresh');
  };
  t.after(async () => {
    try { await act(async () => root.unmount()); }
    finally {
      container.remove(); Date.now = original.now;
      window.setTimeout = original.setTimeout; window.clearTimeout = original.clearTimeout;
      window.removeEventListener('minibank:session-timeout', captureEvent);
      window.addEventListener = original.add; window.removeEventListener = original.remove;
      axios.defaults.adapter = original.adapter; isolated();
      assert.equal(timers.size, 0, 'idle timers cleaned on unmount');
      assert.equal(activity.size, 0, 'activity listeners cleaned on unmount: ' +
        [...activity].map(([name, listener]) => name + ':' + String(listener)).join(' | '));
    }
  });
  const advance = async (ms, afterCallback) => {
    const target = now + ms;
    const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at);
    for (const [id, timer] of due) if (timers.has(id)) {
      now = timer.at; timers.delete(id);
      await perform(() => { timer.callback(); afterCallback?.(); });
    }
    now = target;
  };
  const emit = detail => window.dispatchEvent(new CustomEvent('minibank:session-timeout', { detail }));
  const expiredRequest = async () => {
    handler = config => Promise.reject(fail(config));
    let promise;
    await perform(() => { promise = assert.rejects(api.get('/profile'), error => error.response?.data.code === 'SESSION_EXPIRED'); });
    await promise;
  };
  return { tokens, api, store, parts, initial, settings, actions, events, calls, load, container, timers, activity,
    ok, fail, perform, advance, emit, seed, expiredRequest, isolated,
    setHandler: value => { handler = value; },
    resets: () => actions.filter(x => x.type === 'customer/resetState').length,
    login: async label => perform(() => { tokens.saveTokens('synthetic-access-' + label, 'synthetic-refresh-' + label); seed(label); }),
    modal: () => container.querySelector('[role="alertdialog"]'),
    modalProps: () => modalProps,
    logout: () => logout(),
    location: () => location, navigationType: () => navigationType,
    assertReset: () => {
      for (const key of slices) assert.deepEqual(store.getState()[key], initial[key], key);
      assert.strictEqual(store.getState().settings, settings);
    },
  };
}

test('idle boundary: no expiry at 299999ms, synchronous real Redux cleanup at 300000ms, no repeat after', async t => {
  const h = await setup(t);
  await h.advance(299999); assert.equal(h.resets(), 0); assert.equal(h.modal(), null); assert.equal(h.tokens.hasTokens(), true);
  await h.advance(1, () => {
    assert.equal(h.tokens.hasTokens(), false); assert.equal(h.resets(), 1); h.assertReset();
  });
  assert.ok(h.modal()); assert.match(h.modal().textContent, /5 minutes of inactivity/);
  await h.advance(2); assert.equal(h.resets(), 1); assert.equal(h.calls.length, 0); h.isolated();
});

test('backend expiry accepts G to G+1 metadata and synchronously resets exactly once', async t => {
  const h = await setup(t), source = h.tokens.getAuthenticationGeneration();
  await h.expiredRequest();
  assert.equal(h.events.length, 1); assert.equal(h.events[0].sourceGeneration, source);
  assert.equal(h.events[0].invalidatedGeneration, source + 1);
  assert.equal(h.tokens.getAuthenticationGeneration(), source + 2);
  h.assertReset(); assert.equal(h.resets(), 1); assert.match(h.modal().textContent, /Synthetic session expired/);
  assert.deepEqual(h.calls.map(x => x.url), ['/profile']);
});

test('backend event cleanup completes synchronously before event dispatch returns', async t => {
  const h = await setup(t), source = h.tokens.getAuthenticationGeneration();
  await h.perform(() => {
    const invalidatedGeneration = h.tokens.invalidateAuthenticationGeneration();
    h.load('src/utils/sessionEvents.ts').dispatchSessionTimeout('Synthetic immediate expiry', source, invalidatedGeneration);
    assert.equal(h.tokens.hasTokens(), false); assert.equal(h.resets(), 1); h.assertReset();
  });
  assert.ok(h.modal());
});

test('late A SESSION_EXPIRED response after B login cannot emit expiry or alter B', async t => {
  const h = await setup(t), gate = deferred(); let configA;
  h.setHandler(config => { configA = config; return gate.promise; });
  const rejected = assert.rejects(h.api.get('/profile'));
  await flush(); await h.login('B'); const state = h.store.getState();
  await h.perform(() => gate.reject(h.fail(configA))); await rejected;
  assert.equal(h.events.length, 0); assert.equal(h.resets(), 0); assert.equal(h.modal(), null);
  assert.strictEqual(h.store.getState(), state); assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B');
});

test('cancelled A timer manually invoked after B replaces A cannot cancel or expire B timer', async t => {
  const h = await setup(t), callback = [...h.timers.values()][0].callback;
  await h.advance(200000); await h.login('B');
  const timerB = [...h.timers.values()][0], state = h.store.getState();
  await h.perform(callback);
  assert.equal(h.resets(), 0); assert.strictEqual(h.store.getState(), state);
  assert.strictEqual([...h.timers.values()][0], timerB);
  await h.advance(299999); assert.equal(h.resets(), 0);
  await h.advance(1); assert.equal(h.resets(), 1);
});

test('duplicate and replayed timeout deliveries cannot repeat cleanup or modal transition', async t => {
  const h = await setup(t); await h.expiredRequest();
  const generation = h.tokens.getAuthenticationGeneration(), modal = h.modal(), state = h.store.getState();
  await h.perform(() => { for (let i = 0; i < 5; i++) h.emit(h.events[0]); });
  assert.equal(h.resets(), 1); assert.equal(h.tokens.getAuthenticationGeneration(), generation);
  assert.strictEqual(h.store.getState(), state); assert.strictEqual(h.modal(), modal);
});

for (const order of ['idle-first', 'backend-first']) {
  test('idle and backend expiry deduplicate: ' + order, async t => {
    const h = await setup(t), callback = [...h.timers.values()][0].callback;
    const source = h.tokens.getAuthenticationGeneration();
    if (order === 'idle-first') {
      await h.advance(300000);
      await h.perform(() => h.emit({ sourceGeneration: source, invalidatedGeneration: source + 1, message: 'late backend' }));
    } else {
      await h.expiredRequest(); await h.perform(callback);
    }
    assert.equal(h.resets(), 1); h.assertReset(); assert.ok(h.modal());
  });
}

test('simultaneous expired responses emit one accepted expiry, never refresh or repeat reset', async t => {
  const h = await setup(t), gate = deferred();
  h.setHandler(async config => { await gate.promise; throw h.fail(config); });
  const first = assert.rejects(h.api.get('/profile')), second = assert.rejects(h.api.get('/accounts'));
  await flush(); await h.perform(() => gate.resolve()); await Promise.all([first, second]);
  assert.equal(h.events.length, 1); assert.equal(h.resets(), 1);
  assert.deepEqual(h.calls.map(x => x.url), ['/profile', '/accounts']); h.assertReset();
});

for (const detail of [undefined, { message: 'legacy unscoped' },
  { sourceGeneration: '1', invalidatedGeneration: 2 }, { sourceGeneration: 1, invalidatedGeneration: 9 }]) {
  test('missing or malformed timeout metadata is ignored: ' + JSON.stringify(detail), async t => {
    const h = await setup(t), state = h.store.getState(), generation = h.tokens.getAuthenticationGeneration();
    await h.perform(() => h.emit(detail));
    assert.equal(h.resets(), 0); assert.equal(h.tokens.getAuthenticationGeneration(), generation);
    assert.strictEqual(h.store.getState(), state); assert.equal(h.modal(), null);
  });
}

test('even apparently matching metadata is rejected without actual generation invalidation', async t => {
  const h = await setup(t), source = h.tokens.getAuthenticationGeneration();
  await h.perform(() => h.emit({ sourceGeneration: source, invalidatedGeneration: source + 1 }));
  assert.equal(h.resets(), 0); assert.equal(h.tokens.hasTokens(), true);
});

test('A timeout then B login rejects A event, manually invoked cancelled timer and captured Login Again', async t => {
  const h = await setup(t), callback = [...h.timers.values()][0].callback;
  await h.expiredRequest(); const detail = h.events[0], oldLoginAgain = h.modalProps().onLoginAgain;
  await h.login('B'); const state = h.store.getState(), generation = h.tokens.getAuthenticationGeneration();
  challengeKeys.forEach(key => sessionStorage.setItem(key, 'B'));
  await h.perform(() => { h.emit(detail); callback(); oldLoginAgain(); });
  assert.equal(h.resets(), 1); assert.strictEqual(h.store.getState(), state);
  assert.equal(h.tokens.getAuthenticationGeneration(), generation);
  assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B'); assert.equal(h.tokens.getRefreshToken(), 'synthetic-refresh-B');
  challengeKeys.forEach(key => assert.equal(sessionStorage.getItem(key), 'B'));
  assert.equal(h.modal(), null); assert.equal(h.location(), '/dashboard');
  await h.advance(300000); assert.equal(h.resets(), 2); assert.ok(h.modal());
});

test('A to B to C sessions each retain their own legitimate timeout and old modal callbacks cannot consume newer modal', async t => {
  const h = await setup(t); await h.advance(300000); const old = h.modalProps().onLoginAgain;
  await h.login('B'); await h.advance(300000);
  const state = h.store.getState(), generation = h.tokens.getAuthenticationGeneration();
  await h.perform(old); assert.equal(h.resets(), 2); assert.strictEqual(h.store.getState(), state);
  assert.equal(h.tokens.getAuthenticationGeneration(), generation); assert.ok(h.modal());
  await h.login('C'); await h.advance(300000); assert.equal(h.resets(), 3); h.assertReset();
});

test('real modal Login Again preserves cleanup and REPLACE navigation without another Redux reset', async t => {
  const h = await setup(t);
  challengeKeys.forEach(key => sessionStorage.setItem(key, 'A'));
  await h.advance(300000); const old = h.modalProps().onLoginAgain;
  const button = [...h.modal().querySelectorAll('button')].find(x => x.textContent === 'Login Again');
  assert.ok(button); assert.match(h.modal().textContent, /EKARAJ BANK/);
  await h.perform(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(h.location(), '/login'); assert.equal(h.navigationType(), 'REPLACE');
  assert.equal(h.resets(), 1); assert.equal(h.tokens.hasTokens(), false);
  challengeKeys.forEach(key => assert.equal(sessionStorage.getItem(key), null));
  const generation = h.tokens.getAuthenticationGeneration();
  await h.perform(old); assert.equal(h.tokens.getAuthenticationGeneration(), generation); assert.equal(h.resets(), 1);
});

test('provider mounted before authentication arms idle timeout when a legitimate login completes', async t => {
  const h = await setup(t, { authenticated: false });
  assert.equal(h.timers.size, 0); await h.login('B'); await h.advance(300000);
  assert.equal(h.resets(), 1); assert.ok(h.modal());
});

test('same-generation token rotation does not extend idle deadline or reset Redux', async t => {
  const h = await setup(t), generation = h.tokens.getAuthenticationGeneration();
  await h.advance(240000);
  await h.perform(() => h.tokens.saveTokens('synthetic-rotated-access-A', 'synthetic-rotated-refresh-A', generation));
  assert.equal(h.resets(), 0); await h.advance(59999); assert.equal(h.resets(), 0);
  await h.advance(1); assert.equal(h.resets(), 1); h.assertReset();
});

test('trusted activity resets idle deadline; untrusted activity cannot extend it', async t => {
  const h = await setup(t);
  await h.advance(200000);
  await h.perform(() => h.activity.get('pointerdown')({ isTrusted: true }));
  await h.advance(200000);
  await h.perform(() => h.activity.get('click')({ isTrusted: false }));
  await h.advance(99999); assert.equal(h.resets(), 0);
  await h.advance(1); assert.equal(h.resets(), 1);
});

test('keepalive remains throttled, in-flight protected and A completion cannot release B request', async t => {
  const h = await setup(t), a = deferred(), b = deferred(); let count = 0;
  h.setHandler(config => (++count === 1 ? a : b).promise.then(() => h.ok(config)));
  await h.perform(() => h.activity.get('click')({ isTrusted: true })); assert.equal(h.calls.length, 1);
  await h.advance(60000); await h.perform(() => h.activity.get('click')({ isTrusted: true }));
  assert.equal(h.calls.length, 1);
  await h.login('B'); await h.perform(() => h.activity.get('click')({ isTrusted: true })); assert.equal(h.calls.length, 2);
  await h.perform(() => a.resolve()); await h.advance(60000);
  await h.perform(() => h.activity.get('click')({ isTrusted: true })); assert.equal(h.calls.length, 2);
  await h.perform(() => b.resolve()); assert.equal(h.resets(), 0);
});

for (const failure of [false, true]) {
  test('manual logout first suppresses overlapping timeout; captured A revocation ' + (failure ? 'failure' : 'success') + ' cannot clear B', async t => {
    const h = await setup(t), callback = [...h.timers.values()][0].callback, gate = deferred(); let logout;
    h.setHandler(config => gate.promise.then(() => { if (failure) throw new Error('synthetic offline'); return h.ok(config); }));
    await h.perform(() => { logout = h.logout(); });
    assert.equal(h.resets(), 1); assert.equal(h.calls[0].url, '/auth/logout');
    assert.equal(h.calls[0].headers.Authorization, 'Bearer synthetic-access-A');
    await h.perform(callback); assert.equal(h.resets(), 1); assert.equal(h.modal(), null);
    await h.login('B'); const state = h.store.getState();
    await h.perform(() => gate.resolve()); await logout;
    assert.strictEqual(h.store.getState(), state); assert.equal(h.tokens.getAccessToken(), 'synthetic-access-B');
    assert.equal(h.resets(), 1); assert.equal(h.location(), '/dashboard');
  });
}

test('COORDINATION GAP: timeout followed by unchanged missing-token manual logout currently resets twice', async t => {
  const h = await setup(t); await h.advance(300000); assert.equal(h.resets(), 1);
  let logout; await h.perform(() => { logout = h.logout(); }); await logout;
  assert.equal(h.resets(), 2, 'diagnostic of existing hook behavior, NOT a one-reset guarantee across both operations');
  assert.equal(h.calls.length, 0); assert.equal(h.tokens.hasTokens(), false);
});

test('normal actual single-flight refresh/retry never opens timeout modal or resets Redux', async t => {
  const h = await setup(t), gate = deferred(), state = h.store.getState();
  h.setHandler(config => {
    if (config.url === '/auth/refresh') return gate.promise.then(() => h.ok(config, { accessToken: 'rotated-A', refreshToken: 'rotated-refresh-A' }));
    return config._retry ? Promise.resolve(h.ok(config)) : Promise.reject(h.fail(config, 'UNAUTHORIZED'));
  });
  const a = h.api.get('/profile'), b = h.api.get('/accounts'); await flush();
  await h.perform(() => gate.resolve()); await Promise.all([a, b]);
  assert.equal(h.calls.filter(x => x.url === '/auth/refresh').length, 1);
  assert.equal(h.tokens.getAccessToken(), 'rotated-A'); assert.equal(h.tokens.getRefreshToken(), 'rotated-refresh-A');
  assert.equal(h.resets(), 0); assert.equal(h.events.length, 0); assert.equal(h.modal(), null);
  assert.strictEqual(h.store.getState(), state);
});

for (const code of ['INVALID_PIN', 'ACCOUNT_LOCKED']) {
  test('business rejection stays unchanged without refresh or timeout: ' + code, async t => {
    const h = await setup(t); h.setHandler(config => Promise.reject(h.fail(config, code)));
    await assert.rejects(h.api.post('/transfers/p2p', {}));
    assert.equal(h.resets(), 0); assert.equal(h.events.length, 0); assert.equal(h.calls.length, 1);
    assert.equal(h.tokens.hasTokens(), true);
  });
}

test('INTEGRATION BLOCKER: mounted AnnouncementsPage must not repeatedly refetch after timeout Redux reset', async t => {
  const h = await setup(t, { announcementsPage: true });
  let diagnostic;
  try { await h.advance(300000); } catch (error) { diagnostic = error.message; }
  const pending = h.actions.filter(x => x.type === h.parts.announcements.fetchAnnouncements.pending.type && x.meta.requestId !== 'seed-A').length;
  const rejected = h.actions.filter(x => x.type === h.parts.announcements.fetchAnnouncements.rejected.type).length;
  assert.equal(h.resets(), 1); assert.equal(h.tokens.hasTokens(), false); assert.equal(h.calls.length, 0);
  assert.ok(pending <= 1 && rejected <= 1,
    'Timeout reset triggered ' + pending + ' pending / ' + rejected + ' rejected refetches; diagnostic=' + diagnostic);
});
