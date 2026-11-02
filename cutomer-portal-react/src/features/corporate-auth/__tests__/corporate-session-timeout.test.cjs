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


// Deterministic wall clock and window timers. React scheduling is left untouched.
// jsdom cannot generate trusted native input. The activity listener wrapper below
// supplies a trusted-event facade; negative tests explicitly disable it. Chromium
// checks exercise actual native input separately.
let activityTrusted = true;
function fakeClock() {
  const originalNow = Date.now, originalSet = window.setTimeout, originalClear = window.clearTimeout;
  let now = originalNow(), next = 0; const timers = new Map();
  const originalAdd = window.addEventListener, originalRemove = window.removeEventListener;
  const wrappers = new Map();
  window.addEventListener = function(name, listener, options) {
    if (['click','pointerdown','keydown','input','scroll','wheel','touchstart','touchmove'].includes(name) && options?.capture) {
      const wrapper = event => listener(new Proxy(event, { get: (target, key) => key === 'isTrusted' ? activityTrusted : Reflect.get(target, key, target) }));
      wrappers.set(listener, {...wrappers.get(listener), [name]: wrapper});
      return originalAdd.call(this, name, wrapper, options);
    }
    return originalAdd.call(this, name, listener, options);
  };
  window.removeEventListener = function(name, listener, options) {
    return originalRemove.call(this, name, wrappers.get(listener)?.[name] || listener, options);
  };
  Date.now = () => now;
  window.setTimeout = (fn, delay) => { const id = ++next; timers.set(id, { fn, at: now + Number(delay || 0) }); return id; };
  window.clearTimeout = id => timers.delete(id);
  return {
    jump: ms => { now += ms; },
    advance: async ms => {
      const target = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]);
        await act(async () => { due[1].fn(); await flush(); });
      }
      now = target;
    },
    restore: () => { window.addEventListener = originalAdd; window.removeEventListener = originalRemove; activityTrusted = true; Date.now = originalNow; window.setTimeout = originalSet; window.clearTimeout = originalClear; },
  };
}
const emit = async (name, target = window) => { await act(async () => { target.dispatchEvent(new Event(name, { bubbles: true })); await flush(); }); };
const authenticated = storage => { const generation = storage.beginCorporateLogin(); storage.saveCorporateTokens(tokens(), generation); };
const modal = app => app.container.querySelector('[role="alertdialog"]');
const keepAliveCalls = app => app.calls.filter(call => call.url === '/auth/session/keep-alive');

// No mounted individual provider, database or real backend: real Corporate components/router/Axios, mocked HTTP adapter.
test('idle deadline hides protected content, clears only Corporate auth, Login Again and Back stay logged out', async () => {
  const clock = fakeClock(); const app = await setup({route:'/corporate/auth-success', seed: authenticated});
  try {
    await clock.advance(299999); assert.equal(modal(app), null); assert.equal(keepAliveCalls(app).length, 0);
    await clock.advance(1); assert.ok(modal(app)); assert.match(modal(app).textContent, /5 minutes of inactivity/);
    assert.equal(app.container.textContent.includes('Corporate Dashboard integration is pending.'), false);
    assert.equal(sessionStorage.getItem('corporateAccessToken'), null); assert.equal(sessionStorage.getItem('corporateRefreshToken'), null);
    await emit('click'); await clock.advance(60000); assert.equal(keepAliveCalls(app).length, 0);
    await app.click('Login Again'); assert.equal(app.router.state.location.pathname,'/corporate/login');
    await act(async()=>{await app.router.navigate(-1);}); assert.equal(app.router.state.location.pathname,'/corporate/login'); app.checkIsolation();
  } finally { await app.cleanup(); clock.restore(); }
});

for (const event of ['click','pointerdown','keydown','input','scroll','wheel','touchstart','touchmove']) {
  test(event + ' resets idle time; activity-driven keep-alive uses only Corporate authorization', async () => {
    const clock=fakeClock(); const app=await setup({route:'/corporate/auth-success',seed:authenticated});
    try {
      await clock.advance(240000); await emit(event); assert.equal(keepAliveCalls(app).length,1);
      assert.equal(keepAliveCalls(app)[0].auth,'Bearer '+sessionStorage.getItem('corporateAccessToken'));
      await clock.advance(60000); assert.equal(modal(app),null);
      await clock.advance(240000); assert.ok(modal(app)); app.checkIsolation();
    } finally {await app.cleanup();clock.restore();}
  });
}

test('keep-alive throttles to 60 seconds, deduplicates pending calls beyond throttle, and never polls',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});const pending=deferred();
 try{
  app.setHandler((config,{ok})=>config.url==='/auth/session/keep-alive'?pending.promise.then(()=>ok(config,{success:true})):undefined);
  await emit('click');await emit('scroll');assert.equal(keepAliveCalls(app).length,1);
  await clock.advance(60000);await emit('keydown');assert.equal(keepAliveCalls(app).length,1);
  await act(async()=>{pending.resolve();await flush();});await emit('input');assert.equal(keepAliveCalls(app).length,2);
  await clock.advance(59999);await emit('click');assert.equal(keepAliveCalls(app).length,2);
  await clock.advance(1);await emit('click');assert.equal(keepAliveCalls(app).length,3);
  await clock.advance(120000);assert.equal(keepAliveCalls(app).length,3);app.checkIsolation();
 }finally{pending.resolve();await app.cleanup();clock.restore();}
});

test('reload preserves elapsed idle time; missing persisted activity fails closed',async()=>{
 const clock=fakeClock();let app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  await clock.advance(240000);
  const saved=Object.fromEntries(Object.keys(sessionStorage).filter(k=>k.startsWith('corporate')).map(k=>[k,sessionStorage.getItem(k)]));
  await app.cleanup();app=await setup({route:'/corporate/auth-success',seed:()=>{for(const[k,v]of Object.entries(saved))sessionStorage.setItem(k,v);}});
  await clock.advance(60000);assert.ok(modal(app));assert.equal(keepAliveCalls(app).length,0);
  await app.cleanup();app=await setup({route:'/corporate/auth-success',seed:s=>{authenticated(s);sessionStorage.removeItem('corporateLastActivityAt');}});
  assert.ok(modal(app));app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});

test('background sleep expires before accepting a late click or visibility/focus event',async()=>{
 for(const event of ['click','visibilitychange','focus','pageshow']){
  const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});
  try{clock.jump(300001);await emit(event,event==='visibilitychange'?document:window);assert.ok(modal(app));assert.equal(keepAliveCalls(app).length,0);app.checkIsolation();}
  finally{await app.cleanup();clock.restore();}
 }
});

test('continuous activity cannot extend absolute JWT session deadline',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:s=>{
  const g=s.beginCorporateLogin();const exp=Math.floor(Date.now()/1000)+120;s.saveCorporateTokens({accessToken:token('ACCESS',exp),refreshToken:token('REFRESH',exp)},g);
 }});
 try{await emit('click');await clock.advance(60000);await emit('scroll');await clock.advance(60000);assert.ok(modal(app));assert.match(modal(app).textContent,/Corporate session has expired/);assert.equal(sessionStorage.getItem('corporateAccessToken'),null);app.checkIsolation();}
 finally{await app.cleanup();clock.restore();}
});

for(const status of ['success','SESSION_EXPIRED'])test('late keep-alive '+status+' cannot affect a newer session',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});const pending=deferred();
 try{
  app.setHandler((c,{ok,fail})=>c.url==='/auth/session/keep-alive'?pending.promise.then(()=>status==='success'?ok(c,{success:true}):fail(c,401,'Expired','SESSION_EXPIRED')):undefined);
  await emit('click');await clock.advance(300000);assert.ok(modal(app));
  const g=app.storage.beginCorporateLogin();const newer={accessToken:token('ACCESS',fixtureExpiry,renewed),refreshToken:token('REFRESH',fixtureExpiry,renewed)};app.storage.saveCorporateTokens(newer,g);
  await act(async()=>{pending.resolve();await flush();});assert.equal(sessionStorage.getItem('corporateAccessToken'),newer.accessToken);app.checkIsolation();
 }finally{pending.resolve();await app.cleanup();clock.restore();}
});

test('late refresh cannot restore timed-out tokens or retry the protected request',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});const pending=deferred();let request;
 try{
  app.setHandler((c,{ok,fail})=>c.url==='/protected-test'?fail(c):c.url==='/auth/refresh'?pending.promise.then(()=>ok(c,{success:true,...tokens()})):undefined);
  await act(async()=>{request=app.api.get('/protected-test');request.catch(()=>{});await flush();});
  await clock.advance(300000);assert.ok(modal(app));await act(async()=>{pending.resolve();await assert.rejects(request);});
  assert.equal(sessionStorage.getItem('corporateAccessToken'),null);assert.equal(app.calls.filter(c=>c.url==='/protected-test').length,1);app.checkIsolation();
 }finally{pending.resolve();await app.cleanup();clock.restore();}
});

test('backend SESSION_EXPIRED keep-alive shows modal without refresh; network failure preserves local idle clock',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  app.setHandler((c,{fail})=>c.url==='/auth/session/keep-alive'?fail(c,503,'Offline'):undefined);
  await emit('click');assert.equal(modal(app),null);await clock.advance(60000);
  app.setHandler((c,{fail})=>c.url==='/auth/session/keep-alive'?fail(c,401,'Expired','SESSION_EXPIRED'):undefined);
  await emit('scroll');assert.ok(modal(app));assert.equal(app.calls.filter(c=>c.url==='/auth/refresh').length,0);app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});

test('reload at absolute deadline clears expired tokens and shows timeout instead of protected content',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:s=>{
  authenticated(s);clock.jump(3600001);
 }});
 try{assert.ok(modal(app));assert.equal(sessionStorage.getItem('corporateAccessToken'),null);app.checkIsolation();}
 finally{await app.cleanup();clock.restore();}
});

test('late refresh after sleeping past idle deadline is rejected even before a timer runs',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});const pending=deferred();let request;
 try{
  app.setHandler((c,{ok,fail})=>c.url==='/protected-test'?fail(c):c.url==='/auth/refresh'?pending.promise.then(()=>ok(c,{success:true,...tokens()})):undefined);
  await act(async()=>{request=app.api.get('/protected-test');request.catch(()=>{});await flush();});
  clock.jump(300001);await act(async()=>{pending.resolve();await assert.rejects(request);});
  assert.ok(modal(app));assert.equal(sessionStorage.getItem('corporateAccessToken'),null);assert.equal(app.calls.filter(c=>c.url==='/protected-test').length,1);app.checkIsolation();
 }finally{pending.resolve();await app.cleanup();clock.restore();}
});

test('queued keep-alive captures generation before Axios dispatch and cannot use newer login credentials',async()=>{
 const app=await setup({route:'/corporate/auth-success',seed:authenticated});let request;
 try{
  await act(async()=>{
   request=app.auth.keepAliveCorporate();request.catch(()=>{});
   const g=app.storage.beginCorporateLogin();app.storage.saveCorporateTokens({accessToken:token('ACCESS',fixtureExpiry,renewed),refreshToken:token('REFRESH',fixtureExpiry,renewed)},g);
   await assert.rejects(request);
  });
  assert.equal(keepAliveCalls(app).length,0);assert.ok(sessionStorage.getItem('corporateAccessToken'));app.checkIsolation();
 }finally{await app.cleanup();}
});

test('expired access refreshes normally but does not replay keep-alive within its throttle window',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  app.setHandler((c,{ok,fail})=>c.url==='/auth/session/keep-alive'?fail(c,401,'Access token has expired.'):c.url==='/auth/refresh'?ok(c,{success:true,accessToken:token('ACCESS',fixtureExpiry-10),refreshToken:token('REFRESH')}):undefined);
  await emit('click');await emit('scroll');assert.equal(keepAliveCalls(app).length,1);assert.equal(app.calls.filter(c=>c.url==='/auth/refresh').length,1);
  assert.equal(sessionStorage.getItem('corporateAccessToken'),token('ACCESS',fixtureExpiry-10));assert.equal(modal(app),null);
  await clock.advance(59999);await emit('keydown');assert.equal(keepAliveCalls(app).length,1);app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});

test('full reload preserves session-specific keep-alive reservation through the 60-second boundary',async()=>{
 const clock=fakeClock();let app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  await emit('click');assert.equal(keepAliveCalls(app).length,1);
  const saved=Object.fromEntries(Object.keys(sessionStorage).filter(k=>k.startsWith('corporate')).map(k=>[k,sessionStorage.getItem(k)]));
  await app.cleanup();app=await setup({route:'/corporate/auth-success',seed:()=>{for(const[k,v]of Object.entries(saved))sessionStorage.setItem(k,v);}});
  await emit('click');assert.equal(keepAliveCalls(app).length,0);
  await clock.advance(59999);await emit('scroll');assert.equal(keepAliveCalls(app).length,0);
  await clock.advance(1);await emit('keydown');assert.equal(keepAliveCalls(app).length,1);app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});

test('each untrusted activity event leaves idle time and request count unchanged',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  const initial=app.storage.corporateLastActivity();await clock.advance(240000);activityTrusted=false;
  for(const name of ['click','pointerdown','keydown','input','scroll','wheel','touchstart','touchmove'])await emit(name);
  assert.equal(app.storage.corporateLastActivity(),initial);assert.equal(keepAliveCalls(app).length,0);
  await clock.advance(60000);assert.ok(modal(app));app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});

test('new Corporate session gets an independent throttle slot and logout removes only Corporate throttle metadata',async()=>{
 const clock=fakeClock();const app=await setup({route:'/corporate/auth-success',seed:authenticated});
 try{
  await emit('click');assert.equal(keepAliveCalls(app).length,1);
  const g=app.storage.beginCorporateLogin();app.storage.saveCorporateTokens({accessToken:token('ACCESS',fixtureExpiry,renewed),refreshToken:token('REFRESH',fixtureExpiry,renewed)},g);
  await app.auth.keepAliveCorporate();assert.equal(keepAliveCalls(app).length,2);
  await act(async()=>{await app.auth.logoutCorporate();});
  assert.equal(sessionStorage.getItem('corporateKeepAliveStartedAt'),null);assert.equal(sessionStorage.getItem('corporateKeepAliveSession'),null);app.checkIsolation();
 }finally{await app.cleanup();clock.restore();}
});
