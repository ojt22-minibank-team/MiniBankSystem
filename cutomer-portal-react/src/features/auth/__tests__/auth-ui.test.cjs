// Actual Individual pages and shared UI, React Router, auth services and Axios.
// Synthetic in-process HTTP responses; no real OTP delivery, database or payment authorization.
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
const router = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const challenge = '11111111-1111-4111-8111-111111111111';
const renewed = '22222222-2222-4222-8222-222222222222';
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

async function setup(t, page, options = {}) {
  sessionStorage.clear();
  for (const key of ['challengeGroupId', 'passwordResetChallengeGroupId', 'verifiedPasswordResetChallengeGroupId', 'pinResetChallengeGroupId', 'verifiedPinResetChallengeGroupId']) sessionStorage.setItem(key, challenge);
  sessionStorage.setItem('maskedEmail', 's***@example.invalid');
  sessionStorage.setItem('corporateAccessToken', 'synthetic-corporate-sentinel');
  if (options.payment) { sessionStorage.setItem('redirectUrl', '/checkout?token=ABC123'); sessionStorage.setItem('paymentToken', 'ABC123'); }
  const originalAdapter = axios.defaults.adapter, cache = new Map(), calls = [];
  let handler;
  const ok = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
  axios.defaults.adapter = async config => {
    const body = config.data ? JSON.parse(config.data) : undefined;
    calls.push({ url: config.url, body });
    if (handler) { const value = handler(config, { ok }); if (value !== undefined) return value; }
    if (config.url.includes('resend')) return ok(config, { challengeGroupId: renewed, maskedEmail: 'n***@example.invalid', message: 'Synthetic code resent' });
    if (config.url === '/auth/login') return ok(config, { otpRequired: true, challengeGroupId: challenge });
    if (config.url === '/auth/verify-otp' || config.url === '/auth/first-login/setup-pin') return ok(config, { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
    if (config.url === '/auth/password-reset/request') return ok(config, { challengeGroupId: challenge, destinationMasked: 's***@example.invalid' });
    if (config.url === '/auth/password-reset/verify-otp') return ok(config, { challengeGroupId: renewed });
    if (config.url === '/auth/pin-reset/verify-otp') return ok(config, { verifiedChallengeGroupId: renewed });
    return ok(config, 'Synthetic security update completed');
  };
  function load(relative) {
    const file = path.resolve(project, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, window, document, sessionStorage, Date, CustomEvent: window.CustomEvent, console, require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return router;
      if (name === 'axios') return axios;
      if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    } }, { filename: file });
    return module.exports;
  }
  const Component = load('src/features/auth/pages/' + page + '.tsx').default;
  let location;
  function Probe() { location = router.useLocation(); return React.createElement(Component); }
  // Recovery navigation must replace the mounted page, as the application router does.
  const memoryRouter = options.routedPasswordReset ? router.createMemoryRouter([
    { path: '/password-reset/otp', element: React.createElement(Component) },
    { path: '/password-reset/new-password', element: React.createElement(load('src/features/auth/pages/ResetPasswordPage.tsx').default) },
    { path: '/forgot-password', element: React.createElement(load('src/features/auth/pages/ForgotPasswordPage.tsx').default) },
  ], { initialEntries: ['/password-reset/otp'] }) : null;
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const perform = async fn => { await act(async () => { fn(); await flush(); }); };
  t.after(async () => {
    try { await perform(() => root.unmount()); }
    finally { memoryRouter?.dispose(); container.remove(); axios.defaults.adapter = originalAdapter; }
  });
  await perform(() => root.render(memoryRouter
    ? React.createElement(router.RouterProvider, { router: memoryRouter })
    : React.createElement(router.MemoryRouter, null, React.createElement(Probe))));
  const fill = async (id, value) => {
    const element = container.querySelector('#' + id); assert.ok(element, id);
    await perform(() => element.focus());
    await perform(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
    return element;
  };
  const click = label => perform(() => {
    const button = [...container.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === label || item.textContent.trim() === label);
    assert.ok(button, label); button.click();
  });
  return { container, calls, fill, click, perform, location: () => {
    const current = memoryRouter ? memoryRouter.state.location : location;
    return current.pathname + current.search;
  },
    submit: () => perform(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))),
    setHandler: value => { handler = value; } };
}

for (const name of ['LoginPage', 'OtpPage', 'ChangePasswordPage', 'SetupPinPage', 'ForgotPasswordPage', 'PasswordResetOtpPage', 'ResetPasswordPage', 'PinResetOtpPage', 'PinResetNewPinPage']) {
  test(name + ' exposes labelled native inputs and keeps credentials empty', async t => {
    const h = await setup(t, name);
    const inputs = [...h.container.querySelectorAll('input')]; assert.ok(inputs.length > 0);
    assert.equal(h.container.querySelectorAll('button .lucide-arrow-right, button .lucide-arrow-left, a .lucide-arrow-right, a .lucide-arrow-left').length, 0);
    for (const input of inputs) {
      assert.equal(input.value, ''); assert.ok(input.id);
      assert.ok(h.container.querySelector('label[for="' + input.id + '"]'));
      assert.equal(input.getAttribute('aria-required'), 'true');
      assert.equal(input.getAttribute('aria-hidden'), null);
    }
    assert.equal(h.calls.length, 0);
  });
}

test('login keeps focus-based autofill controls, visibility toggle, manual entry and DTO', async t => {
  const h = await setup(t, 'LoginPage');
  assert.equal(h.container.querySelector('form').getAttribute('autocomplete'), 'off');
  assert.equal(h.container.querySelector('#individual-login-id').readOnly, true);
  await h.fill('individual-login-id', 'synthetic-customer'); await h.fill('individual-login-password', 'Synthetic!123');
  assert.equal(h.container.querySelector('#individual-login-id').readOnly, false);
  await h.click('Show password'); assert.equal(h.container.querySelector('#individual-login-password').type, 'text');
  await h.submit(); assert.deepEqual(h.calls[0].body, { loginIdentifier: 'synthetic-customer', password: 'Synthetic!123' });
  assert.equal(h.location(), '/otp');
  assert.equal(h.container.querySelector('a[href="/corporate/login"]').textContent, 'Corporate Login');
});

test('OTP six-cell presentation retains one input, digit filtering and merchant return', async t => {
  const h = await setup(t, 'OtpPage', { payment: true });
  assert.equal(h.container.querySelectorAll('input').length, 1);
  const input = await h.fill('individual-login-otp', '12x34-56'); assert.equal(input.value, '123456');
  await h.click('Verify OTP'); assert.deepEqual(h.calls[0].body, { challengeGroupId: challenge, otp: '123456' });
  assert.equal(h.location(), '/checkout?token=ABC123');
  assert.equal(sessionStorage.getItem('paymentToken'), null);
  assert.equal(sessionStorage.getItem('accessToken'), 'synthetic-access');
});

test('password checklist stays informational and original validation/first-login navigation work', async t => {
  const h = await setup(t, 'ChangePasswordPage');
  await h.fill('individual-new-password', 'short'); await h.fill('individual-confirm-password', 'short'); await h.submit();
  assert.match(h.container.querySelector('[role="alert"]').textContent, /at least 8 characters/); assert.equal(h.calls.length, 0);
  await h.fill('individual-new-password', 'Secure!123'); await h.fill('individual-confirm-password', 'Secure!123');
  await h.click('Show new password'); assert.equal(h.container.querySelector('#individual-new-password').type, 'text');
  await h.submit(); assert.deepEqual(h.calls[0].body, { challengeGroupId: challenge, newPassword: 'Secure!123', confirmPassword: 'Secure!123' });
  assert.equal(h.location(), '/first-login/setup-pin');
});

test('PIN cells preserve masking toggle, digit filtering, exact payload and checkout return', async t => {
  const h = await setup(t, 'SetupPinPage', { payment: true });
  const pin = await h.fill('individual-setup-pin', '12x3456'); await h.fill('individual-confirm-pin', '123456');
  assert.equal(pin.value, '123456'); assert.equal(pin.type, 'password');
  await h.click('Show PIN'); assert.equal(pin.type, 'text');
  await h.submit(); assert.deepEqual(h.calls[0].body, { challengeGroupId: challenge, pin: '123456', confirmPin: '123456' });
  assert.equal(h.location(), '/checkout?token=ABC123');
});

test('forgot-password keeps customer identifier recovery and server challenge', async t => {
  const h = await setup(t, 'ForgotPasswordPage');
  await h.fill('individual-recovery-id', ' synthetic-customer '); await h.submit();
  assert.deepEqual(h.calls[0].body, { loginIdentifier: 'synthetic-customer' });
  assert.equal(h.location(), '/password-reset/otp');
  assert.equal(sessionStorage.getItem('passwordResetMaskedEmail'), 's***@example.invalid');
});

test('password recovery OTP retains no-cooldown resend, challenge rotation and verification', async t => {
  const h = await setup(t, 'PasswordResetOtpPage', { routedPasswordReset: true });
  await h.click('Resend OTP'); await h.click('Resend OTP');
  assert.equal(h.calls.filter(c => c.url.includes('resend')).length, 2);
  await h.fill('individual-recovery-otp', '123456'); await h.submit();
  assert.deepEqual(h.calls.at(-1).body, { challengeGroupId: renewed, otp: '123456' });
  assert.equal(sessionStorage.getItem('verifiedPasswordResetChallengeGroupId'), renewed);
  assert.equal(h.location(), '/password-reset/new-password');
  assert.equal(sessionStorage.getItem('passwordResetChallengeGroupId'), null);
  assert.equal(h.container.querySelector('#individual-recovery-otp'), null);
  assert.ok(h.container.querySelector('form input#individual-reset-password'));
  assert.equal(h.container.querySelector('h1').textContent, 'Create New Password');
});

test('password reset preserves original rules, payload, success state and explicit login action', async t => {
  const h = await setup(t, 'ResetPasswordPage');
  await h.fill('individual-reset-password', 'secure123'); await h.fill('individual-reset-confirm-password', 'secure123'); await h.submit();
  assert.equal(h.calls.length, 0); assert.ok(h.container.querySelector('[role="alert"]'));
  assert.equal(h.container.querySelector('#individual-reset-password').maxLength, 10);
  await h.fill('individual-reset-password', 'Secure!123'); await h.fill('individual-reset-confirm-password', 'Secure!123'); await h.submit();
  assert.deepEqual(h.calls[0].body, { verifiedChallengeGroupId: challenge, newPassword: 'Secure!123', confirmPassword: 'Secure!123' });
  assert.match(h.container.textContent, /Password reset successful/); assert.equal(h.location(), '/');
  const loginButton = [...h.container.querySelectorAll('button')].find(b => /Login/.test(b.textContent)); assert.ok(loginButton);
  await h.perform(() => loginButton.click()); assert.equal(h.location(), '/login');
});

test('PIN recovery OTP resends immediately and verifies the rotated challenge', async t => {
  const h = await setup(t, 'PinResetOtpPage');
  await h.click('Resend OTP'); await h.click('Resend OTP');
  assert.equal(h.calls.filter(c => c.url.includes('resend')).length, 2);
  await h.fill('individual-recovery-otp', '12x3456'); await h.submit();
  assert.deepEqual(h.calls.at(-1).body, { challengeGroupId: renewed, otp: '123456' });
  assert.equal(sessionStorage.getItem('verifiedPinResetChallengeGroupId'), renewed);
  assert.equal(h.location(), '/pin-reset/new-pin');
});

test('PIN reset preserves validation, completion cleanup and profile navigation', async t => {
  const h = await setup(t, 'PinResetNewPinPage');
  await h.fill('individual-reset-pin', '123'); await h.fill('individual-reset-confirm-pin', '123'); await h.submit();
  assert.equal(h.calls.length, 0); assert.match(h.container.querySelector('[role="alert"]').textContent, /exactly 6 digits/);
  await h.fill('individual-reset-pin', '123456'); await h.fill('individual-reset-confirm-pin', '123456'); await h.submit();
  assert.deepEqual(h.calls[0].body, { verifiedChallengeGroupId: challenge, newPin: '123456', confirmPin: '123456' });
  assert.equal(sessionStorage.getItem('verifiedPinResetChallengeGroupId'), null);
  assert.match(h.container.textContent, /Transaction PIN reset successful/);
  await h.click('Back to Profile'); assert.equal(h.location(), '/profile');
});

test('pending resend disables existing actions and resumes without a cooldown', async t => {
  const h = await setup(t, 'PasswordResetOtpPage'); let finish;
  h.setHandler((config, { ok }) => config.url.includes('resend') ? new Promise(resolve => { finish = () => resolve(ok(config, { challengeGroupId: renewed })); }) : undefined);
  await h.click('Resend OTP');
  assert.ok([...h.container.querySelectorAll('button')].every(b => b.disabled));
  await h.perform(finish);
  assert.equal([...h.container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Resend OTP').disabled, false);
  assert.equal(sessionStorage.getItem('corporateAccessToken'), 'synthetic-corporate-sentinel');
});

for (const [page, button, destination] of [
  ['ForgotPasswordPage', 'Back to Login', '/login'],
  ['PasswordResetOtpPage', 'Back to Password Recovery', '/forgot-password'],
  ['ResetPasswordPage', 'Cancel Password Reset', '/forgot-password'],
  ['PinResetOtpPage', 'Back to Profile', '/profile'],
  ['PinResetNewPinPage', 'Cancel and Back to Profile', '/profile'],
]) {
  test(page + ' preserves navigation after removing decorative arrows', async t => {
    const h = await setup(t, page);
    await h.click(button);
    assert.equal(h.location(), destination);
    assert.equal(h.calls.length, 0);
  });
}

test('login uses EKARAJ branding and preserves its sign-in wording', async t => {
  const h = await setup(t, 'LoginPage');
  for (const text of [
    'Ekaraj Bank Customer Portal',
    'Welcome Ekaraj Banking',
    'Login securely using your Customer ID or Account Number.',
    'Your security comes first.',
    'For your security, never share your password or OTP with anyone.',
  ]) assert.ok(h.container.textContent.includes(text), text);
  const header = h.container.querySelector('header');
  assert.equal(header.querySelector('img').getAttribute('src'), '/assets/ekaraj-crown-transparent.png');
  assert.equal(header.querySelectorAll('img').length, 1);
  assert.equal(header.textContent.match(/Ekaraj Bank Customer Portal/g).length, 1);
  assert.equal(h.container.querySelector('header').textContent.includes('ဧကရာဇ်ဘဏ်'), false);
  assert.equal(h.container.querySelectorAll('img[src="/assets/ekaraj-crown-transparent.png"]').length, 2);
  assert.deepEqual([...h.container.querySelectorAll('h1')].map(e => e.textContent), ['Welcome Ekaraj Banking']);
  assert.equal(h.container.querySelector('h2').textContent.trim(), 'Your Trust.Our Commitment.');
  assert.equal(h.container.textContent.match(/Secure Personal Banking/g).length, 1);
  assert.deepEqual([...h.container.querySelectorAll('aside p')].map(e => e.textContent.trim()), [
    'Secure Verification', 'Your safety is our priority',
    'Safe Transactions', 'Bank with confidence',
    'Your Trusted Banking Partner', 'Always by your side',
  ]);
  assert.equal([...h.container.querySelectorAll('span')].some(e => e.textContent === 'or'), false);
  for (const removed of ['Welcome !', 'Welcome to Ekaraj Personal Banking', '24/7 Access', 'Real Time Monitoring']) {
    assert.equal(h.container.textContent.includes(removed), false, removed);
  }
  assert.equal(h.container.querySelectorAll('.lucide-crown').length, 0);
});

for (const page of ['OtpPage', 'PasswordResetOtpPage', 'PinResetOtpPage']) {
  test(page + (page === 'OtpPage' ? ' uses six distinct rounded-square cells with one native OTP input' : ' uses six distinct pill cells with one native OTP input'), async t => {
    const h = await setup(t, page);
    assert.equal(h.container.querySelectorAll('input').length, 1);
    const input = h.container.querySelector('input');
    assert.equal(input.getAttribute('inputmode'), 'numeric');
    assert.equal(input.getAttribute('autocomplete'), 'one-time-code');
    assert.equal(input.maxLength, 6);
    const cells = [...input.parentElement.querySelectorAll('[aria-hidden="true"] > span')];
    assert.equal(cells.length, 6); assert.ok(cells.every(cell => cell.classList.contains(page === 'OtpPage' ? 'rounded-xl' : 'rounded-full')));
    await h.fill(input.id, '12x34-56');
    assert.equal(input.value, '123456'); assert.equal(cells.map(c => c.textContent).join(''), '123456');
    assert.equal(input.getAttribute('aria-hidden'), null);
    assert.equal(h.calls.length, 0);
  });
}
