// Run: node --test src/features/auth/__tests__/notification-idle.test.cjs
// Real Axios interceptors with a controlled adapter; controlled React hooks/events/timers.
// Trusted-event objects model native input. They do not prove browser event provenance.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const ts = require(root + '/node_modules/typescript');
const axios = require(root + '/node_modules/axios/dist/node/axios.cjs');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

const apiHarness = (() => {
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

function setup(handler) {
  const data = new Map([['accessToken', 'old-access'], ['refreshToken', 'old-refresh'], ['corporateToken', 'preserve']]);
  const requests = [], events = [], navigations = [], cache = new Map(), location = {};
  const ok = (config, value = 'ok') => ({ config, status: 200, statusText: 'OK', headers: {}, data: value });
  const unauthorized = (config, code) => {
    throw new axios.AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, null, { config, status: 401, headers: {}, data: code ? { code } : {} });
  };
  axios.defaults.adapter = async config => {
    requests.push({ url: config.url, retry: config._retry, auth: config.headers.Authorization, generation: config._authGeneration });
    if (handler) {
      const response = handler(config, { ok, unauthorized, data });
      if (response !== undefined) return response;
    }
    if (config.url === '/auth/refresh') return ok(config, { accessToken: 'rotated-access', refreshToken: 'rotated-refresh' });
    if (config.url === '/auth/logout' || config.url === '/auth/login') return ok(config);
    if (!config._retry) return unauthorized(config);
    return ok(config);
  };
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, {
      exports: module.exports, module,
      require: name => {
        if (name === 'axios') return axios;
        if (name === 'react') return { useCallback: fn => fn };
        if (name === 'react-router-dom') return { useNavigate: () => (...args) => navigations.push(args) };
        return load(path.resolve(path.dirname(file), name) + '.ts');
      },
      sessionStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) },
      window: { dispatchEvent: event => events.push(event), location },
      CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    }, { filename: file });
    return module.exports;
  }
  return {
    api: load('src/config/api.ts').default,
    notifications: load('src/features/notifications/services/notificationService.ts'),
    logout: load('src/features/auth/hooks/useIndividualLogout.ts').useIndividualLogout(),
    tokens: load('src/utils/tokenStorage.ts'), data, requests, events, navigations, location,
  };
}


return setup;
})();

for (const url of ['/notifications', '/notifications/unread-count', '/notifications?poll=true', '/notifications/unread-count?poll=true']) {
  test(`401 polling ${url} never refreshes, retries, or clears another session`, async () => {
    const h = apiHarness((config, { unauthorized }) => config.url === url ? unauthorized(config) : undefined);
    for (let i = 0; i < 4; i++) await assert.rejects(h.api.get(url));
    assert.deepEqual(h.requests.map(r => r.url), [url, url, url, url]);
    assert.equal(h.data.get('accessToken'), 'old-access');
    assert.equal(h.data.get('refreshToken'), 'old-refresh');
    assert.equal(h.data.get('corporateToken'), 'preserve');
    assert.equal(h.location.href, undefined);
    assert.equal(h.events.length, 0);
  });
}

test('notification service list/count/read-status responses and methods remain functional', async () => {
  const h = apiHarness((config, { ok }) => {
    if (config.url === '/notifications') { assert.equal(config.method, 'get'); return ok(config, [{ notificationId: 1, title: 'Synthetic' }]); }
    if (config.url === '/notifications/unread-count') return ok(config, { unreadCount: 7 });
    if (config.url === '/notifications/1/read') { assert.equal(config.method, 'patch'); return ok(config, { success: true }); }
    if (config.url === '/notifications/read-all') { assert.equal(config.method, 'put'); return ok(config, { success: true, updatedCount: 4 }); }
  });
  assert.equal((await h.notifications.getMyNotifications())[0].title, 'Synthetic');
  assert.equal(await h.notifications.getUnreadNotificationCount(), 7);
  assert.equal(await h.notifications.markNotificationAsRead(1), true);
  assert.equal(await h.notifications.markAllNotificationsAsRead(), 4);
  assert.equal(h.requests.length, 4);
});

test('a real-activity keep-alive refreshes normally after polling receives expired-access 401', async () => {
  const h = apiHarness((config, { unauthorized }) => config.url === '/notifications' ? unauthorized(config) : undefined);
  await assert.rejects(h.api.get('/notifications'));
  assert.equal(h.requests.length, 1);
  await h.api.get('/auth/session/keep-alive');
  assert.deepEqual(h.requests.map(r => r.url), ['/notifications', '/auth/session/keep-alive', '/auth/refresh', '/auth/session/keep-alive']);
  assert.equal(h.data.get('accessToken'), 'rotated-access');
  assert.equal(h.data.get('refreshToken'), 'rotated-refresh');
});

test('SESSION_EXPIRED from polling invalidates authentication and dispatches modal event without refreshing', async () => {
  const h = apiHarness((config, { unauthorized }) => unauthorized(config, 'SESSION_EXPIRED'));
  const generation = h.tokens.getAuthenticationGeneration();
  await assert.rejects(h.api.get('/notifications/unread-count'));
  assert.deepEqual(h.requests.map(r => r.url), ['/notifications/unread-count']);
  assert.equal(h.tokens.isAuthenticationGenerationCurrent(generation), false);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].type, 'minibank:session-timeout');
  assert.equal(h.data.get('corporateToken'), 'preserve');
});

test('polling does not join or replay behind a refresh initiated by a foreground request', async () => {
  const pending = deferred();
  const h = apiHarness((config, { ok, unauthorized }) => {
    if (config.url === '/auth/refresh') return pending.promise.then(() => ok(config, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
    if (config.url === '/notifications') return unauthorized(config);
  });
  const foreground = h.api.get('/protected');
  await flush();
  await assert.rejects(h.api.get('/notifications'));
  assert.equal(h.requests.filter(r => r.url === '/notifications').length, 1);
  pending.resolve(); await foreground;
  assert.equal(h.requests.filter(r => r.url === '/auth/refresh').length, 1);
  assert.equal(h.data.get('accessToken'), 'new-access');
});

test('expired-session polling invalidates an already pending refresh and blocks late token restoration', async () => {
  const pending = deferred();
  const h = apiHarness((config, { ok, unauthorized }) => {
    if (config.url === '/auth/refresh') return pending.promise.then(() => ok(config, { accessToken: 'stale-access', refreshToken: 'stale-refresh' }));
    if (config.url === '/notifications') return unauthorized(config, 'SESSION_EXPIRED');
  });
  const foreground = assert.rejects(h.api.get('/protected'));
  await flush();
  await assert.rejects(h.api.get('/notifications'));
  pending.resolve(); await foreground;
  assert.notEqual(h.data.get('accessToken'), 'stale-access');
  assert.equal(h.requests.filter(r => r.url === '/protected').length, 1);
  assert.equal(h.data.get('corporateToken'), 'preserve');
});

for (const [method, url] of [['patch', '/notifications/1/read'], ['put', '/notifications/read-all'], ['get', '/notifications/other']]) {
  test(`${method.toUpperCase()} ${url} retains existing foreground refresh behavior`, async () => {
    const h = apiHarness();
    await h.api[method](url);
    assert.deepEqual(h.requests.map(r => r.url), [url, '/auth/refresh', url]);
    assert.equal(h.data.get('accessToken'), 'rotated-access');
  });
}

const activities = ['pointerdown', 'click', 'keydown', 'input', 'scroll', 'touchstart'];
for (const event of activities) {
  test(`synthetic ${event} neither extends five-minute idle time nor sends keep-alive`, async () => {
    const h = harness(); h.mount();
    await h.tick(240000); h.event(event, false); await flush();
    assert.equal(h.calls().keepAlive, 0);
    await h.tick(59999); assert.equal(h.states[0], false);
    await h.tick(1); assert.equal(h.states[0], true);
    assert.equal(h.storage.has('accessToken'), false);
    assert.equal(h.storage.get('corporateToken'), 'preserve');
    h.cleanup(); assert.equal(h.listeners.size, 0); assert.equal(h.timers.size, 0);
  });
  test(`trusted ${event} resets the idle timer and uses the existing keep-alive path`, async () => {
    const h = harness(); h.mount();
    await h.tick(240000); h.event(event, true); await flush();
    assert.equal(h.calls().keepAlive, 1);
    await h.tick(60000); assert.equal(h.states[0], false);
    await h.tick(239999); assert.equal(h.states[0], false);
    await h.tick(1); assert.equal(h.states[0], true);
    h.cleanup();
  });
}

test('trusted activity remains throttled to sixty seconds with no concurrent keep-alive', async () => {
  const h = harness(), pending = deferred(); h.setKeepAlive(() => pending.promise); h.mount();
  h.event('click'); h.event('scroll'); await h.tick(60000); h.event('keydown');
  assert.equal(h.calls().keepAlive, 1);
  pending.resolve(); await flush(); h.event('click'); await flush();
  assert.equal(h.calls().keepAlive, 2);
  await h.tick(59999); h.event('input'); assert.equal(h.calls().keepAlive, 2);
  await h.tick(1); h.event('scroll'); assert.equal(h.calls().keepAlive, 3);
  h.cleanup();
});

function harness() {
  let now = 1_000_000, nextTimer = 0, keepAliveCalls = 0, logoutCalls = 0;
  const storage = new Map([['accessToken', 'access'], ['refreshToken', 'refresh'], ['corporateToken', 'preserve'], ['unrelated', 'preserve']]);
  const timers = new Map(), listeners = new Map(), states = [], effects = [], cleanups = [], navigations = [];
  let keepAlive = async () => ({}), logout = async () => 'ok';
  const window = {
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, fn, options) => listeners.set(name, { fn, options }),
    removeEventListener: name => listeners.delete(name),
  };
  const mocks = {
    react: {
      useRef: current => ({ current }),
      useState: initial => { const index = states.push(initial) - 1; return [initial, value => { states[index] = value; }]; },
      useCallback: fn => fn,
      useEffect: fn => effects.push(fn),
    },
    'react-router-dom': { useNavigate: () => (...args) => navigations.push(args) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
  };
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (file.endsWith('/services/authService.ts')) {
      module.exports = {
        keepSessionAlive: () => { keepAliveCalls++; return keepAlive(); },
        logoutCustomer: () => { logoutCalls++; assert.equal(storage.get('accessToken'), 'access'); return logout(); },
      }; return module.exports;
    }
    if (file.endsWith('/SessionTimeoutModal.tsx')) { module.exports = { default: () => null }; return module.exports; }
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(js, {
      exports: module.exports, module,
      require: name => {
        if (mocks[name]) return mocks[name];
        const filename = path.resolve(path.dirname(file), name);
        return load(fs.existsSync(filename + '.ts') ? filename + '.ts' : filename + '.tsx');
      },
      sessionStorage: { getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key), setItem: (key, value) => storage.set(key, value) },
      window, Date: { now: () => now },
    }, { filename: file });
    return module.exports;
  }
  const logoutModule = load('src/features/auth/hooks/useIndividualLogout.ts');
  return {
    storage, states, listeners, navigations, timers,
    calls: () => ({ keepAlive: keepAliveCalls, logout: logoutCalls }),
    setKeepAlive: fn => { keepAlive = fn; }, setLogout: fn => { logout = fn; },
    logout: () => logoutModule.useIndividualLogout()(),
    mount: () => { load('src/features/auth/components/SessionTimeoutProvider.tsx').default({ children: null }); effects.forEach(fn => cleanups.push(fn())); },
    cleanup: () => cleanups.forEach(fn => fn?.()),
    event: (name, trusted = true) => listeners.get(name)?.fn({ isTrusted: trusted, detail: { message: 'Absolute session lifetime expired' } }),
    tick: async ms => {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = end; await flush();
    },
  };
}

