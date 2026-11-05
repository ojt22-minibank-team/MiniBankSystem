// Run with Node's test runner; see ../README.md for the isolated jsdom prerequisite.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react');
const { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const routerLib = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const ts = require(project + '/node_modules/typescript');
const h = React.createElement;
const challenge = '11111111-1111-4111-8111-111111111111';
const renewed = '22222222-2222-4222-8222-222222222222';
const user = '33333333-3333-4333-8333-333333333333';
const sid = '44444444-4444-4444-8444-444444444444';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

// Synthetic unsigned fixtures accepted only by the mocked backend adapter. No
// test claims to validate real backend signatures, credentials, email or sessions.
const fixtureExpiry = Math.floor(Date.now() / 1000) + 3600;
function token(type, exp = fixtureExpiry, id = sid) {
  return [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user, sid: id, subjectType: 'CORPORATE_USER', tokenType: type, exp })).toString('base64url'), 'synthetic-test-signature'].join('.');
}
const tokens = () => ({ accessToken: token('ACCESS'), refreshToken: token('REFRESH') });
const normal = () => ({ success: true, message: 'OTP verified', firstLogin: false, passwordChangeRequired: false, pinSetupRequired: false, ...tokens() });
const firstLogin = (password = true, pin = true) => ({ success: true, message: 'Setup required', firstLogin: true, passwordChangeRequired: password, pinSetupRequired: pin, accessToken: null, refreshToken: null });

async function setup(options = {}) {
  sessionStorage.clear();
  const individual = { accessToken: 'individual-access-sentinel', refreshToken: 'individual-refresh-sentinel', challengeGroupId: 'individual-challenge-sentinel', maskedEmail: 'individual-email-sentinel' };
  for (const [key, value] of Object.entries(individual)) sessionStorage.setItem(key, value);
  const calls = [], transitions = [], cache = new Map();
  let otpResponse = normal(), passwordNeedsPin = true, handler;
  const ok = (config, data) => ({ config, status: 200, statusText: 'OK', headers: {}, data });
  const fail = (config, status = 401, message = 'Wrong Corporate credentials', code) => {
    throw new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, null, { config, status, headers: {}, data: { success: false, message, code } });
  };
  axios.defaults.adapter = async config => {
    assert.equal(config.baseURL, 'http://localhost:8080/api/corporate');
    assert.equal(config.timeout, 10000);
    const body = config.data ? JSON.parse(config.data) : undefined;
    calls.push({ url: config.url, method: config.method, body, params: config.params, auth: config.headers.Authorization });
    if (handler) { const response = handler(config, { ok, fail }); if (response !== undefined) return response; }
    switch (config.url) {
      case '/auth/login': return ok(config, { success: true, message: 'OTP sent', otpRequired: true, challengeGroupId: challenge });
      case '/auth/verify-otp': return ok(config, otpResponse);
      case '/auth/resend-otp': return ok(config, { success: true, message: 'Corporate OTP resent', challengeGroupId: renewed, resendNo: 1 });
      case '/auth/first-login/change-password': return ok(config, { success: true, message: 'Password changed', pinSetupRequired: passwordNeedsPin });
      case '/auth/first-login/setup-pin': return ok(config, 'Transaction PIN set up successfully.');
      case '/auth/first-login/complete': return ok(config, normal());
      case '/auth/logout': return ok(config, 'Logged out');
      case '/auth/refresh': return ok(config, { success: true, ...tokens() });
      default: return ok(config, { success: true });
    }
  };
  function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: false, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports, sessionStorage, window, document, Event, console, Date, atob,
      require: name => {
        if (name === 'react') return React;
        if (name === 'react-router-dom') return routerLib;
        if (name === 'react/jsx-runtime') return jsx;
        if (name === 'axios') return axios;
        if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
        const base = path.resolve(path.dirname(file), name);
        return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      },
    }, { filename: file });
    return module.exports;
  }
  const storage = load('src/features/corporate-auth/utils/storage.ts');
  const auth = load('src/features/corporate-auth/api/auth.ts');
  const api = load('src/features/corporate-auth/api/client.ts').default;
  if (options.seed) options.seed(storage);
  const { corporateAuthRoutes } = load('src/features/corporate-auth/routes.tsx');
  const router = routerLib.createMemoryRouter([...corporateAuthRoutes, { path: '/login', element: h('p', null, 'Individual Login') }, { path: '/dashboard', element: h('p', null, 'Individual Dashboard') }], {
    initialEntries: options.entries || [options.route || '/corporate/login'],
    initialIndex: options.index,
  });
  router.subscribe(state => transitions.push(state.location.pathname));
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(h(routerLib.RouterProvider, { router })); });
  async function fill(id, value) {
    const input = container.querySelector('#' + id); assert.ok(input, `Input ${id} exists`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit(times = 1) {
    const form = container.querySelector('form'); assert.ok(form, 'Form is present');
    await act(async () => { for (let i = 0; i < times; i++) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  }
  async function click(text) {
    const element = [...container.querySelectorAll('button,a')].find(e => e.textContent.trim() === text);
    assert.ok(element, `Action ${text} exists`);
    await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
  }
  return {
    container, router, calls, transitions, storage, auth, api, fill, submit, click,
    setOtpResponse: value => { otpResponse = value; }, setNeedsPin: value => { passwordNeedsPin = value; },
    setHandler: value => { handler = value; },
    login: async () => { await fill('corporate-company', 'COMPANY-001'); await fill('corporate-user', 'CORP-001'); await fill('corporate-password', 'TestPass1!'); await submit(); },
    verify: async () => { await fill('corporate-otp', '123456'); await submit(); },
    checkIsolation: () => { for (const [key, value] of Object.entries(individual)) assert.equal(sessionStorage.getItem(key), value, key); assert.ok(transitions.every(p => p !== '/dashboard')); },
    cleanup: async () => { await act(async () => { root.unmount(); router.dispose(); }); container.remove(); },
  };
}

test('Corporate login uses exact DTO keys and its own challenge without maskedEmail', async () => {
  const app = await setup();
  try {
    await app.login(); assert.equal(app.router.state.location.pathname, '/corporate/otp');
    assert.deepEqual(app.calls[0].body, { companyCustomerCode: 'COMPANY-001', corporateUserCode: 'CORP-001', password: 'TestPass1!' });
    assert.equal(app.calls[0].auth, undefined); assert.equal(sessionStorage.getItem('corporateChallengeGroupId'), challenge);
    assert.equal(app.container.querySelector('h1').parentElement.querySelector('p').textContent, 'Enter the 6-digit verification code sent to your registered corporate email'); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('wrong Corporate credentials display backend error without storing credentials or navigating', async () => {
  const app = await setup();
  try {
    app.setHandler((config, { fail }) => config.url === '/auth/login' ? fail(config) : undefined);
    await app.login(); assert.equal(app.router.state.location.pathname, '/corporate/login');
    assert.match(app.container.querySelector('[role="alert"]').textContent, /Wrong Corporate credentials/);
    assert.equal(sessionStorage.getItem('corporateChallengeGroupId'), null);
    assert.equal(app.container.querySelector('#corporate-password').value, ''); app.checkIsolation();
  } finally { await app.cleanup(); }
});

for (const [missing, message] of [['company', 'Company Customer ID is required.'], ['user', 'Corporate User ID is required.'], ['password', 'Password is required.']]) {
  test(`${missing} is required and sends no API request`, async () => {
    const app = await setup();
    try {
      if (missing !== 'company') await app.fill('corporate-company', 'COMPANY-001');
      if (missing !== 'user') await app.fill('corporate-user', 'CORP-001');
      if (missing !== 'password') await app.fill('corporate-password', 'TestPass1!');
      await app.submit(); assert.match(app.container.textContent, new RegExp(message.replace('.', '\\.')));
      assert.equal(app.calls.length, 0); app.checkIsolation();
    } finally { await app.cleanup(); }
  });
}

test('password visibility toggles accessibly; duplicate pending login submissions are blocked', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.fill('corporate-company', 'COMPANY-001'); await app.fill('corporate-user', 'CORP-001'); await app.fill('corporate-password', 'TestPass1!');
    const toggle = app.container.querySelector('[aria-label="Show password"]');
    await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    assert.equal(app.container.querySelector('#corporate-password').type, 'text');
    app.setHandler((config, { ok }) => config.url === '/auth/login' ? pending.promise.then(() => ok(config, { success: true, otpRequired: true, challengeGroupId: challenge })) : undefined);
    await app.submit(2); assert.equal(app.calls.length, 1); assert.equal(app.container.querySelector('button[type="submit"]').disabled, true);
    await act(async () => { pending.resolve(); }); assert.equal(app.router.state.location.pathname, '/corporate/otp');
  } finally { pending.resolve(); await app.cleanup(); }
});

test('normal Corporate OTP verification saves isolated tokens and replaces route without redirect race', async () => {
  const app = await setup();
  try {
    await app.login(); await app.verify(); assert.equal(app.router.state.location.pathname, '/corporate/auth-success');
    assert.equal(app.router.state.historyAction, 'REPLACE');
    assert.equal(app.container.querySelector('h1#corporate-dashboard-heading').textContent, 'Corporate Banking Dashboard');
    assert.equal(app.container.querySelector('h2#corporate-company-overview').textContent, 'Company Overview');
    assert.equal(app.container.querySelector('button[type="submit"]').textContent, 'Corporate Logout');
    assert.equal(sessionStorage.getItem('corporateChallengeGroupId'), null); assert.ok(sessionStorage.getItem('corporateAccessToken'));
    assert.ok(sessionStorage.getItem('corporateRefreshToken')); assert.deepEqual(app.calls[1].body, { challengeGroupId: challenge, otp: '123456' }); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('resend replaces only Corporate challenge and subsequent verification uses it', async () => {
  const app = await setup();
  try {
    await app.login(); await app.click('Resend OTP'); assert.match(app.container.textContent, /Corporate OTP resent/);
    assert.equal(sessionStorage.getItem('corporateChallengeGroupId'), renewed); await app.verify();
    assert.equal(app.calls.find(c => c.url === '/auth/verify-otp').body.challengeGroupId, renewed); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('invalid OTP preserves validation and backend verification errors', async () => {
  const app = await setup();
  try {
    await app.login(); await app.fill('corporate-otp', '12'); await app.submit(); assert.equal(app.calls.length, 1);
    assert.match(app.container.textContent, /exactly 6 digits/);
    app.setHandler((config, { fail }) => config.url === '/auth/verify-otp' ? fail(config, 400, 'Corporate OTP invalid') : undefined);
    await app.verify(); assert.match(app.container.textContent, /Corporate OTP invalid/);
    assert.equal(app.router.state.location.pathname, '/corporate/otp'); app.checkIsolation();
  } finally { await app.cleanup(); }
});

for (const value of [undefined, '', 'undefined', 'bad-challenge']) {
  test(`Corporate OTP challenge guard rejects ${JSON.stringify(value)}`, async () => {
    const app = await setup({ route: '/corporate/otp', seed: () => { if (value !== undefined) sessionStorage.setItem('corporateChallengeGroupId', value); } });
    try { assert.equal(app.router.state.location.pathname, '/corporate/login'); assert.equal(app.container.querySelector('#corporate-otp'), null); app.checkIsolation(); }
    finally { await app.cleanup(); }
  });
}

test('Corporate first login follows password -> PIN -> completion with exact DTOs', async () => {
  const app = await setup();
  try {
    app.setOtpResponse(firstLogin()); await app.login(); await app.verify();
    assert.equal(app.router.state.location.pathname, '/corporate/first-login/change-password');
    assert.equal(sessionStorage.getItem('corporateChallengeGroupId'), challenge);
    const expiry = Number(sessionStorage.getItem('corporateSetupExpiresAt')); assert.ok(expiry > Date.now() && expiry <= Date.now() + 600000);
    await app.fill('corporate-new-password', 'NewPass1!'); await app.fill('corporate-confirm-password', 'NewPass1!'); await app.submit();
    assert.equal(app.router.state.location.pathname, '/corporate/first-login/setup-pin');
    assert.deepEqual(app.calls.find(c => c.url.endsWith('change-password')).body, { challengeGroupId: challenge, newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });
    await app.fill('corporate-new-pin', '123456'); await app.fill('corporate-confirm-pin', '123456'); await app.submit();
    assert.deepEqual(app.calls.find(c => c.url.endsWith('setup-pin')).body, { challengeGroupId: challenge, transactionPin: '123456', confirmTransactionPin: '123456' });
    assert.equal(app.calls.find(c => c.url.endsWith('/complete')).params.challengeGroupId, challenge);
    assert.equal(app.router.state.location.pathname, '/corporate/auth-success'); assert.equal(sessionStorage.getItem('corporateSetupStep'), null); app.checkIsolation();
  } finally { await app.cleanup(); }
});

for (const mode of ['pin-only', 'password-only']) {
  test(`Corporate first-login ${mode} branching uses Corporate response fields`, async () => {
    const app = await setup();
    try {
      app.setOtpResponse(firstLogin(mode === 'password-only', mode === 'pin-only')); app.setNeedsPin(false);
      await app.login(); await app.verify();
      if (mode === 'pin-only') {
        assert.equal(app.router.state.location.pathname, '/corporate/first-login/setup-pin');
        await app.fill('corporate-new-pin', '654321'); await app.fill('corporate-confirm-pin', '654321');
      } else {
        assert.equal(app.router.state.location.pathname, '/corporate/first-login/change-password');
        await app.fill('corporate-new-password', 'NewPass1!'); await app.fill('corporate-confirm-password', 'NewPass1!');
      }
      await app.submit(); assert.equal(app.router.state.location.pathname, '/corporate/auth-success'); app.checkIsolation();
    } finally { await app.cleanup(); }
  });
}

for (const bad of ['short1!', 'abcdefgh!', 'ABCDEFG1!', 'NoNumbers!', 'Abc12345', 'Abc 123!']) {
  test(`Corporate password policy rejects ${JSON.stringify(bad)} without setup API call`, async () => {
    const app = await setup();
    try {
      app.setOtpResponse(firstLogin()); await app.login(); await app.verify();
      await app.fill('corporate-new-password', bad); await app.fill('corporate-confirm-password', bad); await app.submit();
      assert.match(app.container.textContent, /Password must be 8–10/); assert.equal(app.calls.length, 2);
    } finally { await app.cleanup(); }
  });
}

test('PIN must be six digits and confirmation must match', async () => {
  const app = await setup();
  try {
    app.setOtpResponse(firstLogin(false, true)); await app.login(); await app.verify();
    await app.fill('corporate-new-pin', '123'); await app.fill('corporate-confirm-pin', '123'); await app.submit();
    assert.match(app.container.textContent, /exactly six digits/);
    await app.fill('corporate-new-pin', '123456'); await app.fill('corporate-confirm-pin', '654321'); await app.submit();
    assert.match(app.container.textContent, /PINs do not match/); assert.equal(app.calls.length, 2);
  } finally { await app.cleanup(); }
});

test('failed first-login completion can be retried without submitting PIN again', async () => {
  const app = await setup(); let attempts = 0;
  try {
    app.setOtpResponse(firstLogin(false, true)); await app.login(); await app.verify();
    app.setHandler((config, { fail }) => config.url.endsWith('/complete') && ++attempts === 1 ? fail(config, 503, 'Try completion again') : undefined);
    await app.fill('corporate-new-pin', '123456'); await app.fill('corporate-confirm-pin', '123456'); await app.submit();
    assert.match(app.container.textContent, /Try completion again/); assert.equal(app.container.querySelector('#corporate-new-pin'), null);
    await app.submit(); assert.equal(app.router.state.location.pathname, '/corporate/auth-success');
    assert.equal(app.calls.filter(c => c.url.endsWith('setup-pin')).length, 1); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('expired setup window displays an expiration message and a Corporate Login return link', async () => {
  const app = await setup({ route: '/corporate/first-login/setup-pin', seed: storage => {
    storage.saveCorporateChallenge(challenge); storage.setCorporateSetupStep('pin'); sessionStorage.setItem('corporateSetupExpiresAt', String(Date.now() - 1));
  } });
  try {
    assert.match(app.container.textContent, /Setup session expired/); assert.equal(app.container.querySelector('form'), null);
    await app.click('Return to Corporate Login'); assert.equal(app.router.state.location.pathname, '/corporate/login'); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('Corporate logout calls its backend with Corporate token and Browser Back never restores OTP or success', async () => {
  const app = await setup({ entries: ['/corporate/otp', '/corporate/login'], index: 1 });
  try {
    await app.login(); await app.verify(); const access = sessionStorage.getItem('corporateAccessToken');
    await app.click('Corporate Logout'); assert.equal(app.router.state.location.pathname, '/corporate/login');
    assert.equal(app.calls.find(c => c.url === '/auth/logout').auth, 'Bearer ' + access);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null); assert.equal(sessionStorage.getItem('corporateRefreshToken'), null);
    await act(async () => { await app.router.navigate(-2); });
    assert.equal(app.router.state.location.pathname, '/corporate/login'); assert.equal(app.container.querySelector('#corporate-otp'), null); app.checkIsolation();
  } finally { await app.cleanup(); }
});

for (const failure of ['unauthorized', 'offline']) {
  test(`Corporate logout ${failure} still clears only Corporate state with no refresh loop`, async () => {
    const app = await setup();
    try {
      await app.login(); await app.verify(); app.setHandler((config, { fail }) => {
        if (config.url === '/auth/logout') { if (failure === 'offline') throw new axios.AxiosError('offline', 'ERR_NETWORK', config); return fail(config); }
      });
      await app.click('Corporate Logout'); assert.equal(app.router.state.location.pathname, '/corporate/login');
      assert.equal(sessionStorage.getItem('corporateAccessToken'), null); assert.equal(app.calls.filter(c => c.url === '/auth/refresh').length, 0); app.checkIsolation();
    } finally { await app.cleanup(); }
  });
}

for (const route of ['/corporate/auth-success', '/corporate/first-login/change-password', '/corporate/first-login/setup-pin']) {
  test(`Individual tokens cannot authorize direct Corporate route ${route}`, async () => {
    const app = await setup({ route });
    try { assert.equal(app.router.state.location.pathname, '/corporate/login'); assert.equal(app.calls.length, 0); app.checkIsolation(); }
    finally { await app.cleanup(); }
  });
}

test('Corporate generation guard rejects a late refresh after logout without restoring tokens or retrying', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify();
    app.setHandler((config, { ok, fail }) => {
      if (config.url === '/protected-test') return fail(config, 401, 'Access expired');
      if (config.url === '/auth/refresh') return pending.promise.then(() => ok(config, { success: true, ...tokens() }));
    });
    let result;
    await act(async () => { result = assert.rejects(app.api.get('/protected-test')); await flush(); });
    assert.equal(app.calls.filter(c => c.url === '/auth/refresh').length, 1);
    await app.click('Corporate Logout');
    await act(async () => { pending.resolve(); await result; });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null); assert.equal(app.calls.filter(c => c.url === '/protected-test').length, 1); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

test('concurrent Corporate 401s share one refresh and preserve normal rotation', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify(); app.setHandler((config, { ok, fail }) => {
      if (config.url.startsWith('/protected-') && !config.corporateRetry) return fail(config, 401, 'Access expired');
      if (config.url === '/auth/refresh') return pending.promise.then(() => ok(config, { success: true, ...tokens() }));
    });
    let requests;
    await act(async () => { requests = Promise.all([app.api.get('/protected-one'), app.api.get('/protected-two')]); await flush(); });
    assert.equal(app.calls.filter(c => c.url === '/auth/refresh').length, 1);
    await act(async () => { pending.resolve(); await requests; }); assert.ok(app.storage.hasCorporateSession()); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

test('a stale Corporate refresh failure cannot clear a newer login', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify(); app.setHandler((config, { fail }) => {
      if (config.url === '/protected-test') return fail(config, 401, 'Access expired');
      if (config.url === '/auth/refresh') return pending.promise;
    });
    let result;
    await act(async () => { result = assert.rejects(app.api.get('/protected-test')); await flush(); });
    const generation = app.storage.beginCorporateLogin(); const newer = tokens(); app.storage.saveCorporateTokens(newer, generation);
    await act(async () => { pending.reject(new Error('old request failed')); await result; });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), newer.accessToken); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

for (const operation of ['verify', 'resend']) {
  test(`pending OTP ${operation} blocks duplicate submissions`, async () => {
    const app = await setup(); const pending = deferred();
    try {
      await app.login();
      const endpoint = operation === 'verify' ? '/auth/verify-otp' : '/auth/resend-otp';
      app.setHandler((config, { ok }) => config.url === endpoint ? pending.promise.then(() => ok(config,
        operation === 'verify' ? normal() : { success: true, challengeGroupId: renewed, message: 'Corporate OTP resent' })) : undefined);
      if (operation === 'verify') { await app.fill('corporate-otp', '123456'); await app.submit(2); }
      else {
        const button = [...app.container.querySelectorAll('button')].find(b => b.textContent === 'Resend OTP');
        await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      }
      assert.equal(app.calls.filter(c => c.url === endpoint).length, 1);
      await act(async () => { pending.resolve(); }); app.checkIsolation();
    } finally { pending.resolve(); await app.cleanup(); }
  });
}

test('late OTP success after Corporate logout cannot establish a session', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); app.setHandler((config, { ok }) => config.url === '/auth/verify-otp' ? pending.promise.then(() => ok(config, normal())) : undefined);
    await app.verify();
    await act(async () => { await app.auth.logoutCorporate(); pending.resolve(); });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
    assert.equal(app.router.state.location.pathname, '/corporate/login'); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

test('late Corporate logout preserves a newer login and sends only the captured old token', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify(); const old = sessionStorage.getItem('corporateAccessToken');
    app.setHandler((config, { ok }) => config.url === '/auth/logout' ? pending.promise.then(() => ok(config, 'Logged out')) : undefined);
    const loggingOut = app.auth.logoutCorporate();
    const generation = app.storage.beginCorporateLogin();
    const newer = { accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) };
    app.storage.saveCorporateTokens(newer, generation); await flush();
    assert.equal(app.calls.find(c => c.url === '/auth/logout').auth, 'Bearer ' + old);
    pending.resolve(); assert.equal(await loggingOut, false);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), newer.accessToken); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

test('backend Corporate session expiry shows only Corporate timeout modal without refresh', async () => {
  const app = await setup();
  try {
    await app.login(); await app.verify();
    app.setHandler((config, { fail }) => config.url === '/protected-test' ? fail(config, 401, 'Corporate session expired', 'SESSION_EXPIRED') : undefined);
    await act(async () => { await assert.rejects(app.api.get('/protected-test')); });
    assert.ok(app.container.querySelector('[role="alertdialog"]'));
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
    await app.click('Login Again');
    assert.equal(app.router.state.location.pathname, '/corporate/login');
    assert.equal(app.calls.filter(c => c.url === '/auth/refresh').length, 0); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('rotation cannot extend the stored Corporate absolute expiry', async () => {
  const app = await setup();
  try {
    await app.login(); await app.verify(); app.setHandler((config, { ok, fail }) => {
      if (config.url === '/protected-test') return fail(config, 401, 'Access expired');
      if (config.url === '/auth/refresh') return ok(config, { success: true, accessToken: token('ACCESS', fixtureExpiry + 3600), refreshToken: token('REFRESH', fixtureExpiry + 3600) });
    });
    await act(async () => { await assert.rejects(app.api.get('/protected-test')); });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null); assert.equal(app.router.state.location.pathname, '/corporate/login'); app.checkIsolation();
  } finally { await app.cleanup(); }
});

test('logout concurrency A/F: duplicate calls in one generation share one request and preserve Individual state', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify(); const access = sessionStorage.getItem('corporateAccessToken');
    app.setHandler((config, { ok }) => config.url === '/auth/logout' ? pending.promise.then(() => ok(config, 'Logged out')) : undefined);
    const generation = app.storage.getCorporateGeneration();
    const first = app.auth.logoutCorporate(); const second = app.auth.logoutCorporate();
    assert.strictEqual(first, second); assert.notEqual(app.storage.getCorporateGeneration(), generation);
    await flush(); assert.equal(app.calls.filter(c => c.url === '/auth/logout').length, 1);
    assert.equal(app.calls.find(c => c.url === '/auth/logout').auth, 'Bearer ' + access);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), access, 'retain credentials until revocation attempt settles');
    await act(async () => { pending.resolve(); assert.equal(await first, true); assert.equal(await second, true); });
    assert.equal(app.storage.hasCorporateSession(), false); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

// Four deterministic interleavings check each completion order and old request
// failure. Real Corporate services/interceptors/storage run against deferred Axios
// responses; no backend or real customer session is contacted.
for (const oldFails of [false, true]) {
  for (const finish of ['A-first', 'B-first']) {
    test(`logout concurrency B/D/E/F/H: independent sessions, ${finish}, A ${oldFails ? 'fails' : 'succeeds'}`, async () => {
      const app = await setup(); const a = deferred(), b = deferred();
      try {
        await app.login(); await app.verify(); const tokenA = sessionStorage.getItem('corporateAccessToken');
        const pairB = { accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) };
        app.setHandler((config, { ok }) => {
          if (config.url === '/auth/logout') {
            const header = config.headers.Authorization;
            assert.ok(header === 'Bearer ' + tokenA || header === 'Bearer ' + pairB.accessToken);
            return (header === 'Bearer ' + tokenA ? a.promise : b.promise).then(() => ok(config, 'Logged out'));
          }
        });
        const logoutA = app.auth.logoutCorporate();
        // No flush before B: also verifies A's token cannot be overwritten by the
        // request interceptor even when A's actual dispatch is delayed.
        const generationB = app.storage.beginCorporateLogin(); app.storage.saveCorporateTokens(pairB, generationB);
        const logoutB = app.auth.logoutCorporate();
        assert.notStrictEqual(logoutA, logoutB, 'B must not reuse A\'s pending operation');
        assert.strictEqual(app.auth.logoutCorporate(), logoutB, 'B duplicates share B\'s operation');
        const logoutGenerationB = app.storage.getCorporateGeneration();
        await flush();
        const requests = app.calls.filter(c => c.url === '/auth/logout');
        assert.equal(requests.length, 2);
        assert.deepEqual(requests.map(c => c.auth), ['Bearer ' + tokenA, 'Bearer ' + pairB.accessToken]);

        if (finish === 'A-first') {
          if (oldFails) a.reject(new Error('old logout offline')); else a.resolve();
          assert.equal(await logoutA, false);
          assert.equal(sessionStorage.getItem('corporateAccessToken'), pairB.accessToken);
          assert.equal(app.storage.getCorporateGeneration(), logoutGenerationB);
          assert.strictEqual(app.auth.logoutCorporate(), logoutB, 'A completion/failure must not release B\'s lock');
          await flush(); assert.equal(app.calls.filter(c => c.url === '/auth/logout').length, 2);
          await act(async () => { b.resolve(); assert.equal(await logoutB, true); });
        } else {
          await act(async () => { b.resolve(); assert.equal(await logoutB, true); });
          assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
          if (oldFails) a.reject(new Error('old logout offline')); else a.resolve();
          assert.equal(await logoutA, false);
        }
        assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
        assert.equal(sessionStorage.getItem('corporateRefreshToken'), null);
        await act(async () => { await app.router.navigate('/corporate/auth-success'); });
        assert.equal(app.router.state.location.pathname, '/corporate/login', 'B must no longer authorize protected routes');
        assert.equal(app.calls.filter(c => c.url === '/auth/logout').length, 2);
        app.checkIsolation();
      } finally { a.resolve(); b.resolve(); await app.cleanup(); }
    });
  }
}

test('logout concurrency C: old logout completion preserves B credentials and in-progress challenge', async () => {
  const app = await setup(); const pending = deferred();
  try {
    await app.login(); await app.verify();
    app.setHandler((config, { ok }) => config.url === '/auth/logout' ? pending.promise.then(() => ok(config, 'Logged out')) : undefined);
    const logoutA = app.auth.logoutCorporate();
    const generationB = app.storage.beginCorporateLogin();
    const pairB = { accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) };
    app.storage.saveCorporateTokens(pairB, generationB); app.storage.saveCorporateChallenge(renewed);
    pending.resolve(); assert.equal(await logoutA, false);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), pairB.accessToken);
    assert.equal(sessionStorage.getItem('corporateRefreshToken'), pairB.refreshToken);
    assert.equal(app.storage.getCorporateChallenge(), renewed); app.checkIsolation();
  } finally { pending.resolve(); await app.cleanup(); }
});

test('logout concurrency G/H: late B refresh cannot restore B after independent B logout', async () => {
  const app = await setup(); const a = deferred(), b = deferred(), refresh = deferred();
  try {
    await app.login(); await app.verify(); const tokenA = sessionStorage.getItem('corporateAccessToken');
    app.setHandler((config, { ok, fail }) => {
      if (config.url === '/auth/logout') return (config.headers.Authorization === 'Bearer ' + tokenA ? a.promise : b.promise).then(() => ok(config, 'Logged out'));
      if (config.url === '/protected-test') return fail(config, 401, 'Access expired');
      if (config.url === '/auth/refresh') return refresh.promise.then(() => ok(config, { success: true,
        accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) }));
    });
    const logoutA = app.auth.logoutCorporate();
    const generationB = app.storage.beginCorporateLogin();
    app.storage.saveCorporateTokens({ accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) }, generationB);
    const oldRefresh = assert.rejects(app.api.get('/protected-test')); await flush();
    assert.equal(app.calls.filter(c => c.url === '/auth/refresh').length, 1);
    const logoutB = app.auth.logoutCorporate(); assert.notStrictEqual(logoutA, logoutB);
    await flush(); a.resolve(); assert.equal(await logoutA, false);
    await act(async () => { b.resolve(); assert.equal(await logoutB, true); });
    await act(async () => { refresh.resolve(); await oldRefresh; await app.router.navigate('/corporate/auth-success'); });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
    assert.equal(sessionStorage.getItem('corporateRefreshToken'), null);
    assert.equal(app.calls.filter(c => c.url === '/protected-test').length, 1, 'stale refresh must not retry');
    assert.equal(app.router.state.location.pathname, '/corporate/login'); app.checkIsolation();
  } finally { a.resolve(); b.resolve(); refresh.resolve(); await app.cleanup(); }
});

test('logout concurrency D/F: unreachable B backend still clears only B local authentication', async () => {
  const app = await setup(); const a = deferred(), b = deferred();
  try {
    await app.login(); await app.verify(); const tokenA = sessionStorage.getItem('corporateAccessToken');
    app.setHandler((config, { ok }) => config.url === '/auth/logout' ?
      (config.headers.Authorization === 'Bearer ' + tokenA ? a.promise : b.promise).then(() => ok(config, 'Logged out')) : undefined);
    const logoutA = app.auth.logoutCorporate();
    const generationB = app.storage.beginCorporateLogin();
    app.storage.saveCorporateTokens({ accessToken: token('ACCESS', fixtureExpiry, renewed), refreshToken: token('REFRESH', fixtureExpiry, renewed) }, generationB);
    const logoutB = app.auth.logoutCorporate(); assert.notStrictEqual(logoutA, logoutB); await flush();
    await act(async () => { b.reject(new Error('B backend unreachable')); assert.equal(await logoutB, true); });
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null);
    a.reject(new Error('A backend unreachable')); assert.equal(await logoutA, false);
    assert.equal(app.calls.filter(c => c.url === '/auth/logout').length, 2); app.checkIsolation();
  } finally { a.resolve(); b.resolve(); await app.cleanup(); }
});
