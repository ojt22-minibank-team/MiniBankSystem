// Actual Corporate routes, React components, auth services and Axios with synthetic HTTP fixtures.
// No live backend, email delivery, JWT signature verification or database access.
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

async function ui(t, options = {}) {
  const app = await setup(options);
  t.after(() => app.cleanup());
  return app;
}
const setupSeed = mode => storage => {
  storage.beginCorporateLogin(); storage.saveCorporateChallenge(challenge); storage.beginCorporateSetup(mode, Date.now());
};
function pills(input, cellShape = 'rounded-full') {
  assert.ok(input);
  assert.equal(input.getAttribute('inputmode'), 'numeric');
  assert.equal(input.maxLength, 6);
  const cells = [...input.parentElement.querySelectorAll('[aria-hidden="true"] > span')];
  assert.equal(cells.length, 6);
  assert.ok(cells.every(cell => cell.classList.contains(cellShape)));
  assert.equal(input.getAttribute('aria-hidden'), null);
  return cells;
}

for (const [route, seed] of [
  ['/corporate/login'],
  ['/corporate/otp', storage => storage.saveCorporateChallenge(challenge)],
  ['/corporate/first-login/change-password', setupSeed('password')],
  ['/corporate/first-login/setup-pin', setupSeed('pin')],
]) {
  const ekarajPage = route === '/corporate/login' || route === '/corporate/otp'
    || route === '/corporate/first-login/change-password' || route === '/corporate/first-login/setup-pin';
  test(route + ' uses ' + (ekarajPage ? 'EKARAJ Bank' : 'ACE Bank') + ' presentation with labels, empty native controls and no decorative arrows', async t => {
    const app = await ui(t, { route, seed });
    if (ekarajPage) {
      const header = app.container.querySelector('header');
      assert.equal(header.querySelector('p').textContent, 'EKARAJ BANK | Corporate Portal');
      assert.equal(header.querySelector('img').getAttribute('src'), '/assets/ekaraj-crown-transparent.png');
      assert.equal(header.querySelectorAll('p')[1].textContent, 'Secure Corporate Banking');
    } else {
      assert.match(app.container.querySelector('header').textContent, /ACE Bank.*Corporate Banking Portal/);
      assert.equal(app.container.querySelector('img').getAttribute('src'), '/images.jfif');
    }
    assert.equal(app.container.querySelectorAll('button .lucide-arrow-right,button .lucide-arrow-left,button .lucide-log-in,a .lucide-arrow-right,a .lucide-arrow-left').length, 0);
    for (const input of app.container.querySelectorAll('input')) {
      assert.equal(input.value, ''); assert.ok(input.labels.length); assert.equal(input.disabled, false);
    }
    assert.equal(app.calls.length, 0); app.checkIsolation();
  });
}

test('Corporate Login keeps field-specific autofill controls and visibility toggle', async t => {
  const app = await ui(t);
  assert.equal(app.container.querySelector('form').getAttribute('autocomplete'), 'off');
  for (const id of ['corporate-company', 'corporate-user', 'corporate-password']) {
    const input = app.container.querySelector('#' + id); assert.equal(input.readOnly, true);
    await act(async () => input.focus()); assert.equal(input.readOnly, false);
  }
  await app.fill('corporate-password', 'Synthetic!123');
  const toggle = app.container.querySelector('[aria-label="Show password"]');
  await act(async () => toggle.click());
  assert.equal(app.container.querySelector('#corporate-password').type, 'text');
  assert.equal(app.container.querySelector('#corporate-password').value, 'Synthetic!123');
  assert.equal(app.container.querySelector('a[href="/forgot-password"]'), null);
  await app.click('Individual Customer Login'); assert.equal(app.router.state.location.pathname, '/login');
  app.checkIsolation();
});

test('Corporate OTP retains one native autofill input, six rounded rectangular cells, filtering and exact verification DTO', async t => {
  const app = await ui(t, { route: '/corporate/otp', seed: storage => storage.saveCorporateChallenge(challenge) });
  const input = app.container.querySelector('#corporate-otp'), cells = pills(input, 'rounded-xl');
  assert.equal(app.container.querySelectorAll('input').length, 1);
  assert.equal(input.getAttribute('autocomplete'), 'one-time-code');
  await app.fill('corporate-otp', '12x34-56');
  assert.equal(input.value, '123456'); assert.equal(cells.map(c => c.textContent).join(''), '123456');
  await app.submit();
  assert.deepEqual(app.calls.find(c => c.url === '/auth/verify-otp').body, { challengeGroupId: challenge, otp: '123456' });
  assert.equal(app.router.state.location.pathname, '/corporate/auth-success'); app.checkIsolation();
});

test('Corporate pill OTP preserves immediate resends, challenge rotation and native input clearing', async t => {
  const app = await ui(t, { route: '/corporate/otp', seed: storage => storage.saveCorporateChallenge(challenge) });
  await app.fill('corporate-otp', '123456'); await app.click('Resend OTP');
  assert.equal(app.container.querySelector('#corporate-otp').value, '');
  await app.click('Resend OTP');
  assert.equal(app.calls.filter(c => c.url === '/auth/resend-otp').length, 2);
  await app.fill('corporate-otp', '654321'); await app.submit();
  assert.deepEqual(app.calls.find(c => c.url === '/auth/verify-otp').body, { challengeGroupId: renewed, otp: '654321' });
  app.checkIsolation();
});

test('Corporate pill OTP preserves pending verification disables and loading status', async t => {
  const app = await ui(t, { route: '/corporate/otp', seed: storage => storage.saveCorporateChallenge(challenge) });
  const pending = deferred(); t.after(() => pending.resolve());
  app.setHandler((config, { ok }) => config.url === '/auth/verify-otp' ? pending.promise.then(() => ok(config, normal())) : undefined);
  await app.fill('corporate-otp', '123456'); await app.submit();
  assert.equal(app.container.querySelector('#corporate-otp').disabled, true);
  assert.equal(app.container.querySelector('button[type="submit"]').getAttribute('aria-busy'), 'true');
  assert.equal([...app.container.querySelectorAll('button')].find(b => b.textContent === 'Resend OTP').disabled, true);
  assert.ok(app.container.querySelector('.animate-spin'));
  await act(async () => pending.resolve());
  assert.equal(app.router.state.location.pathname, '/corporate/auth-success'); app.checkIsolation();
});

test('Corporate password checklist reflects its own policy without weakening submission validation', async t => {
  const app = await ui(t, { route: '/corporate/first-login/change-password', seed: setupSeed('password') });
  await app.fill('corporate-new-password', 'Ab1! 234'); await app.fill('corporate-confirm-password', 'Ab1! 234');
  const whitespace = [...app.container.querySelectorAll('li')].find(li => li.textContent.startsWith('No whitespace'));
  assert.ok(whitespace); assert.equal(whitespace.querySelector('.sr-only'), null);
  await app.submit(); assert.equal(app.calls.length, 0); assert.match(app.container.querySelector('[role="alert"]').textContent, /no whitespace/);
  await app.fill('corporate-new-password', 'Valid!123'); await app.fill('corporate-confirm-password', 'Valid!123');
  assert.ok([...app.container.querySelectorAll('li')].every(li => li.querySelector('.sr-only')));
  await app.submit();
  assert.deepEqual(app.calls.find(c => c.url.endsWith('change-password')).body, { challengeGroupId: challenge, newPassword: 'Valid!123', confirmPassword: 'Valid!123' });
  assert.equal(app.router.state.location.pathname, '/corporate/first-login/setup-pin'); app.checkIsolation();
});

test('Corporate PIN pills preserve masking, visibility, digit filtering and setup/completion DTOs', async t => {
  const app = await ui(t, { route: '/corporate/first-login/setup-pin', seed: setupSeed('pin') });
  const input = app.container.querySelector('#corporate-new-pin'), cells = pills(input);
  assert.equal(app.container.querySelectorAll('input').length, 2);
  await app.fill('corporate-new-pin', '12x3456'); await app.fill('corporate-confirm-pin', '123456');
  assert.equal(input.value, '123456'); assert.equal(input.type, 'password');
  assert.equal(cells.map(c => c.textContent).join(''), '••••••');
  await act(async () => app.container.querySelector('[aria-label="Show transaction pin"]').click());
  assert.equal(input.type, 'text'); assert.equal(cells.map(c => c.textContent).join(''), '123456');
  await app.submit();
  assert.deepEqual(app.calls.find(c => c.url.endsWith('setup-pin')).body, { challengeGroupId: challenge, transactionPin: '123456', confirmTransactionPin: '123456' });
  assert.equal(app.calls.find(c => c.url.endsWith('/complete')).params.challengeGroupId, challenge);
  assert.equal(app.router.state.location.pathname, '/corporate/auth-success'); app.checkIsolation();
});

test('Corporate timeout presentation hides protected content, focuses Login Again and preserves logout isolation', async t => {
  const app = await ui(t, { route: '/corporate/auth-success', seed: storage => {
    storage.saveCorporateTokens(tokens(), storage.getCorporateGeneration());
    sessionStorage.setItem('corporateLastActivityAt', String(Date.now() - 300001));
  } });
  const modal = app.container.querySelector('[role="alertdialog"]'); assert.ok(modal);
  assert.match(modal.textContent, /5 minutes of inactivity/);
  assert.doesNotMatch(app.container.textContent, /Corporate authentication successful/);
  assert.equal(modal.querySelectorAll('.lucide-log-in,.lucide-arrow-right,.lucide-arrow-left').length, 0);
  assert.equal(document.activeElement.textContent, 'Login Again');
  await app.click('Login Again'); assert.equal(app.router.state.location.pathname, '/corporate/login');
  assert.equal(sessionStorage.getItem('corporateAccessToken'), null); app.checkIsolation();
});
