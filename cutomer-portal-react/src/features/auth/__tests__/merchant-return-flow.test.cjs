// Actual Individual pages, React Router, Axios interceptors, token lifecycle and
// logout/timeout hooks. HTTP is an in-process adapter; the confirmation route is
// a boundary stub. No real OTP delivery, PIN authorization or Group 3 validation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'CustomEvent', 'sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react');
const { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const routerLib = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const challenge = '11111111-1111-4111-8111-111111111111';
const renewed = '22222222-2222-4222-8222-222222222222';
const seed = (url = '/checkout?token=ABC123', token = 'ABC123') => {
  if (url !== null) sessionStorage.setItem('redirectUrl', url);
  if (token !== null) sessionStorage.setItem('paymentToken', token);
};
const assertConsumed = () => { assert.equal(sessionStorage.getItem('redirectUrl'), null); assert.equal(sessionStorage.getItem('paymentToken'), null); };

function createLoader() {
  const cache = new Map();
  return function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    if (file.endsWith('/PublicAuthLayout.tsx')) {
      module.exports = { __esModule: true, default: props => React.createElement('main', null, props.children) }; return module.exports;
    }
    if (file.endsWith('/SessionTimeoutModal.tsx')) {
      module.exports = { __esModule: true, default: props => props.open ? React.createElement('p', { 'data-timeout': true }, props.message) : null }; return module.exports;
    }
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return routerLib;
      if (name === 'axios') return axios;
      if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    }, window, document, sessionStorage, Date, CustomEvent: window.CustomEvent, console }, { filename: file });
    return module.exports;
  };
}

const invalidCases = [
  ['no context', null, null], ['missing destination', null, 'ABC123'], ['missing token', '/checkout?token=ABC123', null],
  ['empty token', '/checkout?token=', ''], ['mismatched token', '/checkout?token=OTHER', 'ABC123'],
  ['external URL', 'https://evil.invalid/checkout?token=ABC123', 'ABC123'],
  ['absolute same-origin URL', 'http://localhost:5173/checkout?token=ABC123', 'ABC123'],
  ['protocol-relative URL', '//evil.invalid/checkout?token=ABC123', 'ABC123'],
  ['script URL', 'javascript:alert(1)', 'ABC123'], ['unexpected route', '/dashboard?token=ABC123', 'ABC123'],
  ['trailing slash', '/checkout/?token=ABC123', 'ABC123'], ['traversal', '/x/../checkout?token=ABC123', 'ABC123'],
  ['duplicate token', '/checkout?token=ABC123&token=ABC123', 'ABC123'],
  ['unexpected query', '/checkout?token=ABC123&redirect=https://evil.invalid', 'ABC123'],
  ['fragment', '/checkout?token=ABC123#anything', 'ABC123'], ['empty fragment', '/checkout?token=ABC123#', 'ABC123'],
  ['newline token', '/checkout?token=ABC123%0A', 'ABC123\n'], ['whitespace', '/checkout?token=ABC%20123', 'ABC 123'],
  ['slash token', '/checkout?token=ABC%2F123', 'ABC/123'], ['percent token', '/checkout?token=ABC%25123', 'ABC%123'],
  ['plus token', '/checkout?token=ABC%2B123', 'ABC+123'], ['encoded parameter', '/checkout?%74oken=ABC123', 'ABC123'],
  ['encoded alias', '/checkout?token=%41BC123', 'ABC123'], ['trailing separator', '/checkout?token=ABC123&', 'ABC123'],
  ['leading whitespace', ' /checkout?token=ABC123', 'ABC123'], ['backslash', '\\checkout?token=ABC123', 'ABC123'],
  ['overlong token', '/checkout?token=' + 'A'.repeat(65), 'A'.repeat(65)],
];
for (const [name, url, token] of invalidCases) {
  test('pending redirect rejects and consumes ' + name, () => {
    sessionStorage.clear(); seed(url, token); sessionStorage.setItem('unrelated', 'preserve');
    const helper = createLoader()('src/features/auth/utils/pendingPaymentRedirect.ts');
    assert.equal(helper.consumePendingPaymentRedirect(), '/dashboard'); assertConsumed();
    assert.equal(sessionStorage.getItem('unrelated'), 'preserve');
  });
}
for (const token of ['ABC123', 'A', 'ABC_123-z', 'A'.repeat(64)]) {
  test('pending redirect accepts one canonical checkout token of length ' + token.length, () => {
    sessionStorage.clear(); seed('/checkout?token=' + token, token);
    const helper = createLoader()('src/features/auth/utils/pendingPaymentRedirect.ts');
    assert.equal(helper.consumePendingPaymentRedirect(), '/checkout?token=' + token); assertConsumed();
    assert.equal(helper.consumePendingPaymentRedirect(), '/dashboard');
  });
}

async function setup(t, { intent = false, firstLogin = false, keepOtpMounted = false, authenticated = false, timeout = false } = {}) {
  sessionStorage.clear(); if (intent) seed();
  sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-sentinel'); sessionStorage.setItem('unrelated', 'preserve');
  if (keepOtpMounted) sessionStorage.setItem('challengeGroupId', challenge);
  const load = createLoader(), calls = [], transitions = [], timers = new Map();
  const originalAdapter = axios.defaults.adapter, originalSet = window.setTimeout, originalClear = window.clearTimeout;
  let timerId = 0, handler, logout, force;
  window.setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
  window.clearTimeout = id => timers.delete(id);
  const ok = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  const fail = (config, message) => { throw new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, null,
    { config, status: 401, headers: {}, data: { message } }); };
  axios.defaults.adapter = async config => {
    const body = config.data ? JSON.parse(config.data) : undefined;
    calls.push({ url: config.url, body, auth: config.headers.Authorization });
    if (handler) { const result = handler(config, { ok, fail }); if (result !== undefined) return result; }
    switch (config.url) {
      case '/auth/login': return ok(config, { success: true, otpRequired: true, challengeGroupId: challenge, maskedEmail: 'synthetic@example.invalid' });
      case '/auth/verify-otp': return ok(config, firstLogin ? { firstLoginSetupRequired: true, passwordChangeRequired: true, pinSetupRequired: true } : { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
      case '/auth/resend-otp': return ok(config, { challengeGroupId: renewed, message: 'OTP resent' });
      case '/auth/first-login/change-password': return ok(config, 'Changed');
      case '/auth/first-login/setup-pin': return ok(config, { accessToken: 'synthetic-first-access', refreshToken: 'synthetic-first-refresh' });
      case '/auth/logout': return ok(config, 'Logged out');
      default: throw new Error('Unexpected API request in authentication flow: ' + config.url);
    }
  };
  const tokens = load('src/utils/tokenStorage.ts');
  if (authenticated) tokens.saveTokens('synthetic-A-access', 'synthetic-A-refresh');
  const helper = load('src/features/auth/utils/pendingPaymentRedirect.ts');
  const service = load('src/services/authService.ts');
  const Login = load('src/features/auth/pages/LoginPage.tsx').default;
  const Otp = load('src/features/auth/pages/OtpPage.tsx').default;
  const Password = load('src/features/auth/pages/ChangePasswordPage.tsx').default;
  const Pin = load('src/features/auth/pages/SetupPinPage.tsx').default;
  const Guard = load('src/features/auth/components/ProtectedRoute.tsx').default;
  const Provider = load('src/features/auth/components/SessionTimeoutProvider.tsx').default;
  const useLogout = load('src/features/auth/hooks/useIndividualLogout.ts').useIndividualLogout;
  function Shell() {
    logout = useLogout(); const [, update] = React.useState(0); force = () => update(value => value + 1);
    return keepOtpMounted ? React.createElement(Otp) : React.createElement(routerLib.Outlet);
  }
  function Checkout() { const [params] = routerLib.useSearchParams(); return React.createElement('p', { 'data-confirmation': true }, 'Confirmation ' + params.get('token')); }
  const routes = routerLib.createMemoryRouter([{ element: React.createElement(Shell), children: [
    { path: '/login', element: React.createElement(Login) }, { path: '/otp', element: React.createElement(Otp) },
    { path: '/first-login/change-password', element: React.createElement(Password) },
    { path: '/first-login/setup-pin', element: React.createElement(Pin) },
    { element: React.createElement(Guard), children: [{ element: timeout ? React.createElement(Provider, null, React.createElement(routerLib.Outlet)) : React.createElement(routerLib.Outlet), children: [
      { path: '/dashboard', element: React.createElement('p', null, 'Dashboard') },
      { path: '/checkout', element: React.createElement(Checkout) },
    ] }] },
  ] }], { initialEntries: [authenticated ? '/dashboard' : keepOtpMounted ? '/otp' : '/login'] });
  const unsubscribe = routes.subscribe(state => transitions.push(state.location.pathname + state.location.search));
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount()); routes.dispose(); unsubscribe(); container.remove();
    assert.equal(timers.size, 0); window.setTimeout = originalSet; window.clearTimeout = originalClear; axios.defaults.adapter = originalAdapter;
  });
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  await perform(() => root.render(React.createElement(routerLib.RouterProvider, { router: routes })));
  const fill = async (selector, value) => {
    const input = container.querySelector(selector); assert.ok(input, selector);
    await perform(() => input.focus());
    await perform(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const submit = () => perform(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  const click = label => perform(() => {
    const button = [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label); assert.ok(button, label); button.click();
  });
  return { tokens, helper, service, routes, calls, transitions, container, perform, fill, submit, click, force,
    location: () => routes.state.location.pathname + routes.state.location.search,
    setHandler: fn => { handler = fn; },
    passwordLogin: async () => { await fill('[placeholder="Enter Customer ID or Account Number"]', 'synthetic-customer'); await fill('[placeholder="Enter your password"]', 'Synthetic!Pass123'); await submit(); assert.equal(routes.state.location.pathname, '/otp'); },
    verify: async () => { await fill('input[inputmode="numeric"]', '123456'); await click('Verify OTP'); },
    beginLogout: async () => { let promise; await perform(() => { promise = logout(); }); return { promise }; },
    expire: () => perform(() => { const timer = [...timers.values()].find(value => value.ms === 300000); assert.ok(timer); timer.fn(); }),
    assertNoPayment: () => { assert.ok(calls.every(call => !/merchant|payment/.test(call.url))); },
  };
}

for (const intent of [false, true]) {
  test((intent ? 'payment' : 'normal') + ' password login and OTP reach the right destination', async t => {
    const h = await setup(t, { intent }); await h.passwordLogin();
    if (intent) assert.equal(sessionStorage.getItem('paymentToken'), 'ABC123');
    await h.verify(); assert.equal(h.location(), intent ? '/checkout?token=ABC123' : '/dashboard');
    assert.equal(h.tokens.getAccessToken(), 'synthetic-access'); assert.equal(h.tokens.getRefreshToken(), 'synthetic-refresh');
    assertConsumed(); h.assertNoPayment();
  });
  test((intent ? 'payment' : 'normal') + ' first login keeps intent through password/PIN setup', async t => {
    const h = await setup(t, { intent, firstLogin: true }); await h.passwordLogin(); await h.verify();
    assert.equal(h.location(), '/first-login/change-password'); assert.equal(h.tokens.hasTokens(), false);
    await h.fill('[placeholder="Enter new password"]', 'Synthetic!New123');
    await h.fill('[placeholder="Confirm new password"]', 'Synthetic!New123'); await h.submit();
    assert.equal(h.location(), '/first-login/setup-pin');
    if (intent) assert.equal(sessionStorage.getItem('paymentToken'), 'ABC123');
    await h.fill('[placeholder="Enter 6-digit PIN"]', '654321'); await h.fill('[placeholder="Confirm 6-digit PIN"]', '654321'); await h.submit();
    assert.equal(h.location(), intent ? '/checkout?token=ABC123' : '/dashboard');
    assert.equal(h.tokens.getAccessToken(), 'synthetic-first-access'); assertConsumed(); h.assertNoPayment();
  });
}

test('wrong password and wrong OTP preserve intent, then valid OTP returns to checkout', async t => {
  const h = await setup(t, { intent: true }); let wrongPassword = true, wrongOtp = true;
  h.setHandler((config, { fail }) => {
    if (config.url === '/auth/login' && wrongPassword) { wrongPassword = false; return fail(config, 'Synthetic wrong password'); }
    if (config.url === '/auth/verify-otp' && wrongOtp) { wrongOtp = false; return fail(config, 'Synthetic wrong OTP'); }
  });
  await h.fill('[placeholder="Enter Customer ID or Account Number"]', 'synthetic-customer');
  await h.fill('[placeholder="Enter your password"]', 'Synthetic!Pass123'); await h.submit();
  assert.equal(h.location(), '/login'); assert.equal(sessionStorage.getItem('paymentToken'), 'ABC123');
  await h.submit(); assert.equal(h.location(), '/otp'); await h.verify();
  assert.equal(h.location(), '/otp'); assert.equal(sessionStorage.getItem('paymentToken'), 'ABC123');
  await h.verify(); assert.equal(h.location(), '/checkout?token=ABC123'); assertConsumed(); h.assertNoPayment();
});

test('OTP resend preserves intent and uses the renewed challenge for verification', async t => {
  const h = await setup(t, { intent: true }); await h.passwordLogin(); await h.click('Resend OTP');
  assert.equal(sessionStorage.getItem('paymentToken'), 'ABC123'); assert.equal(sessionStorage.getItem('challengeGroupId'), renewed);
  await h.verify(); assert.equal(h.location(), '/checkout?token=ABC123');
  assert.equal(h.calls.find(call => call.url === '/auth/verify-otp').body.challengeGroupId, renewed); assertConsumed();
});

test('completed OTP rerenders retain checkout after intent consumption, and token clearing returns to login', async t => {
  const h = await setup(t, { intent: true, keepOtpMounted: true }); await h.verify();
  assert.equal(h.location(), '/checkout?token=ABC123'); assertConsumed();
  await h.perform(h.force); await h.perform(h.force);
  assert.equal(h.location(), '/checkout?token=ABC123'); assert.ok(!h.transitions.includes('/dashboard'));
  await h.perform(() => { h.tokens.clearTokens(); h.force(); }); assert.equal(h.location(), '/login');
});

for (const [url, token] of [['https://evil.invalid', 'ABC123'], ['/checkout?token=ABC123', null], ['/checkout?token=ABC123', 'OTHER']]) {
  test('invalid pending context falls back to dashboard after real OTP success: ' + String(token) + url, async t => {
    const h = await setup(t); seed(url, token); await h.passwordLogin(); await h.verify();
    assert.equal(h.location(), '/dashboard'); assertConsumed(); h.assertNoPayment();
  });
}

test('explicit logout clears old intent immediately and network failure still clears only Individual state', async t => {
  const h = await setup(t, { authenticated: true, intent: true }); const pending = deferred();
  h.setHandler(config => config.url === '/auth/logout' ? pending.promise : undefined);
  const logout = await h.beginLogout(); assertConsumed();
  await h.perform(() => pending.reject(new Error('Synthetic offline backend'))); await logout.promise;
  assert.equal(h.tokens.hasTokens(), false); assert.equal(h.location(), '/login');
  assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-sentinel'); assert.equal(sessionStorage.getItem('unrelated'), 'preserve');
  assert.equal(h.helper.consumePendingPaymentRedirect(), '/dashboard');
});

for (const completedLogin of [false, true]) {
  test('late logout A preserves B pending payment intent after login ' + (completedLogin ? 'completes' : 'starts'), async t => {
    const h = await setup(t, { authenticated: true, intent: true }); const pending = deferred(); let config;
    h.setHandler(value => { if (value.url === '/auth/logout') { config = value; return pending.promise; } });
    const logout = await h.beginLogout(); assertConsumed(); seed('/checkout?token=B123', 'B123');
    await h.perform(() => { h.service.loginCustomer({ loginIdentifier: 'synthetic-B', password: 'Synthetic!Pass123' }); });
    if (completedLogin) await h.perform(() => h.tokens.saveTokens('synthetic-B-access', 'synthetic-B-refresh'));
    await h.perform(() => pending.resolve({ config, data: 'Logged out', status: 200, statusText: 'OK', headers: {} })); await logout.promise;
    assert.equal(h.location(), '/dashboard'); assert.equal(sessionStorage.getItem('paymentToken'), 'B123');
    assert.equal(h.helper.consumePendingPaymentRedirect(), '/checkout?token=B123');
  });
}

test('five-minute session timeout clears pending payment keys and cannot reuse the old destination', async t => {
  const h = await setup(t, { authenticated: true, intent: true, timeout: true }); await h.expire();
  assert.ok(h.container.querySelector('[data-timeout]')); assert.equal(h.tokens.hasTokens(), false); assertConsumed();
  assert.equal(h.helper.consumePendingPaymentRedirect(), '/dashboard');
  assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-sentinel');
});
