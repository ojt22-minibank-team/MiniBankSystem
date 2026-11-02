// Actual routed Individual pages, services and Axios; synthetic HTTP responses and
// a deterministic browser clock. No real OTP delivery, JWT verification or backend.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const project = path.resolve(__dirname, '../../../..');
const { JSDOM } = require(process.env.CORPORATE_TEST_JSDOM || 'jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:5173' });
for (const key of ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent','CustomEvent','sessionStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require(project + '/node_modules/react');
const { act } = React;
const { createRoot } = require(project + '/node_modules/react-dom/client');
const routerLib = require(project + '/node_modules/react-router-dom');
const jsx = require(project + '/node_modules/react/jsx-runtime');
const ts = require(project + '/node_modules/typescript');
const axios = require(project + '/node_modules/axios/dist/node/axios.cjs');
const key = 'individualFirstLoginSetupWindow';
const group = '11111111-1111-4111-8111-111111111111';
const newer = '22222222-2222-4222-8222-222222222222';
const start = 1800000000000;
const firstLogin = { firstLoginSetupRequired: true, passwordChangeRequired: true, pinSetupRequired: true };
const expiryMessage = 'First-login setup session has expired. Please login again.';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const sentinel = { corporateAccessToken:'corporate-access-sentinel', corporateRefreshToken:'corporate-refresh-sentinel', corporateChallengeGroupId:newer,
  corporateSetupStep:'pin', corporateSetupExpiresAt:String(start+900000),
  passwordResetChallengeGroupId:newer, verifiedPasswordResetChallengeGroupId:newer, pinResetChallengeGroupId:newer, verifiedPinResetChallengeGroupId:newer, unrelated:'preserve-me' };

async function setup(t, options = {}) {
  sessionStorage.clear();
  Object.entries(sentinel).forEach(([k,v]) => sessionStorage.setItem(k,v));
  sessionStorage.setItem('challengeGroupId', options.challenge || group);
  sessionStorage.setItem('maskedEmail','s***@example.invalid');
  if (options.metadata !== undefined) sessionStorage.setItem(key, typeof options.metadata === 'string' ? options.metadata : JSON.stringify(options.metadata));
  if (options.payment) { sessionStorage.setItem('redirectUrl','/checkout?token=PAY'); sessionStorage.setItem('paymentToken','PAY'); }
  let now = start, sequence = 0, handler;
  const timers = new Map(), originalSet = window.setTimeout, originalClear = window.clearTimeout, originalAdapter = axios.defaults.adapter;
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  window.setTimeout = (callback, delay = 0) => { const id = ++sequence; timers.set(id,{at:now + Number(delay),callback}); return id; };
  window.clearTimeout = id => timers.delete(id);
  const calls = [], cache = new Map();
  const ok = (config,data) => ({config,data,status:200,statusText:'OK',headers:{}});
  const fail = (config,status,code,message) => Promise.reject(new axios.AxiosError(message,'ERR_BAD_REQUEST',config,null,{config,status,headers:{},data:{code,message}}));
  axios.defaults.adapter = async config => {
    calls.push({url:config.url,body:config.data ? JSON.parse(config.data) : undefined});
    if (handler) { const result = handler(config,{ok,fail}); if (result !== undefined) return result; }
    if (config.url === '/auth/verify-otp') return ok(config, options.otp || firstLogin);
    if (config.url === '/auth/resend-otp') return ok(config,{challengeGroupId:newer,message:'OTP resent'});
    if (config.url === '/auth/first-login/setup-pin') return ok(config,{accessToken:'individual-new-access',refreshToken:'individual-new-refresh'});
    if (config.url === '/auth/first-login/change-password') return ok(config,'Password changed');
    throw new Error('Unexpected request ' + config.url);
  };
  function load(relative) {
    const file = path.resolve(project,relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports:{}}; cache.set(file,module);
    const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,window,document,sessionStorage,Date:ClockDate,CustomEvent:window.CustomEvent,console,require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react-router-dom') return routerLib;
      if (name === 'axios') return axios;
      if (name === 'lucide-react') return require(project + '/node_modules/lucide-react');
      const base = path.resolve(path.dirname(file),name); return load(fs.existsSync(base+'.ts') ? base+'.ts' : base+'.tsx');
    }},{filename:file}); return module.exports;
  }
  const page = name => React.createElement(load('src/features/auth/pages/'+name+'.tsx').default);
  const router = routerLib.createMemoryRouter([
    {path:'/login',element:page('LoginPage')},{path:'/otp',element:page('OtpPage')},
    {path:'/first-login/change-password',element:page('ChangePasswordPage')},{path:'/first-login/setup-pin',element:page('SetupPinPage')},
    {path:'/dashboard',element:React.createElement('p',null,'Dashboard destination')},{path:'/checkout',element:React.createElement('p',null,'Validated checkout destination')},
  ],{initialEntries:[options.route || '/otp']});
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const perform = async fn => act(async () => { fn(); for (let i=0;i<100;i++) await Promise.resolve(); });
  t.after(async () => { try { await perform(() => { root.unmount(); router.dispose(); }); } finally { container.remove();window.setTimeout=originalSet;window.clearTimeout=originalClear;axios.defaults.adapter=originalAdapter; } });
  await perform(() => root.render(React.createElement(routerLib.RouterProvider,{router})));
  async function fill(id,value) { const e=container.querySelector('#'+id); assert.ok(e,id); await perform(() => { e.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true})); }); }
  async function click(label) {const e=[...container.querySelectorAll('button,a')].find(e=>e.textContent.trim()===label);assert.ok(e,label);await perform(()=>e.click());}
  async function advance(ms) {await perform(()=>{now+=ms;for(const[id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}});}
  const submit = () => perform(()=>{const form=container.querySelector('form');assert.ok(form);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  const expired = () => {assert.equal(container.querySelector('h1')?.textContent,'Setup session expired');assert.match(container.textContent,/Your 10-minute first-login setup window has ended\./);assert.equal(container.querySelectorAll('input,form').length,0);};
  const isolation = () => {for(const[k,v]of Object.entries(sentinel))assert.equal(sessionStorage.getItem(k),v,k);};
  return {container,router,calls,fill,click,submit,advance,perform,expired,isolation,load,setHandler:fn=>handler=fn,
    password:async()=>{await fill('individual-new-password','Secure!123');await fill('individual-confirm-password','Secure!123');},
    pin:async()=>{await fill('individual-setup-pin','123456');await fill('individual-confirm-pin','123456');}};
}

test('first-login OTP records a challenge-bound deadline from immediately before dispatch, then reuses it through PIN and remount',async t=>{
  const h=await setup(t);const waiting=deferred();h.setHandler((config,{ok})=>config.url==='/auth/verify-otp'?waiting.promise.then(()=>ok(config,firstLogin)):undefined);
  await h.fill('individual-login-otp','123456');await h.click('Verify OTP');assert.equal(sessionStorage.getItem(key),null);
  await h.advance(5000);await h.perform(()=>waiting.resolve());const saved=sessionStorage.getItem(key);
  assert.deepEqual(JSON.parse(saved),{challengeGroupId:group,expiresAt:start+600000});assert.equal(h.router.state.location.pathname,'/first-login/change-password');
  await h.advance(100000);await h.password();await h.submit();assert.equal(h.router.state.location.pathname,'/first-login/setup-pin');assert.equal(sessionStorage.getItem(key),saved);
  await h.perform(()=>h.router.navigate('/first-login/change-password'));await h.perform(()=>h.router.navigate('/first-login/setup-pin'));assert.equal(sessionStorage.getItem(key),saved);
  await h.advance(494999);assert.ok(h.container.querySelector('form'));await h.advance(1);h.expired();assert.equal(sessionStorage.getItem('challengeGroupId'),null);assert.equal(sessionStorage.getItem('maskedEmail'),null);assert.equal(h.calls.length,2);h.isolation();
});

for(const route of ['/first-login/change-password','/first-login/setup-pin']) {
 for (const cause of ['backend', 'timer']) test(route+' '+cause+' expiry stays blocked after remount with existing tokens',async t=>{
  const h=await setup(t,{route,metadata:{challengeGroupId:group,expiresAt:start+600000}});
  sessionStorage.setItem('accessToken','preserved-access');sessionStorage.setItem('refreshToken','preserved-refresh');
  if(cause==='backend') {
   h.setHandler((config,{fail})=>fail(config,401,'SESSION_EXPIRED',expiryMessage));
   await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();
  } else await h.advance(600000);
  h.expired();const marker=sessionStorage.getItem(key);
  assert.equal(JSON.parse(marker).expired,true);assert.equal(JSON.parse(marker).challengeGroupId,group);
  assert.equal(sessionStorage.getItem('challengeGroupId'),null);
  await h.perform(()=>h.router.navigate('/login'));await h.perform(()=>h.router.navigate(route));
  h.expired();assert.equal(sessionStorage.getItem(key),marker);
  assert.equal(sessionStorage.getItem('accessToken'),'preserved-access');assert.equal(sessionStorage.getItem('refreshToken'),'preserved-refresh');
  assert.equal(h.calls.length,cause==='backend'?1:0);h.isolation();
  await h.click('Return to Individual Login');assert.equal(h.router.state.location.pathname,'/login');assert.equal(h.router.state.historyAction,'REPLACE');
  assert.equal(h.calls.length,cause==='backend'?1:0);
 });
 test(route+' expired A cannot block a real new login B or restore a late A response',async t=>{
  const h=await setup(t,{route,metadata:{challengeGroupId:group,expiresAt:start+600000}}),waiting=deferred();
  sessionStorage.setItem('accessToken','preserved-access');sessionStorage.setItem('refreshToken','preserved-refresh');
  h.setHandler((config,{ok})=>waiting.promise.then(()=>ok(config,{accessToken:'late-A-access',refreshToken:'late-A-refresh'})));
  await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();await h.advance(600000);h.expired();
  await h.click('Return to Individual Login');
  h.setHandler((config,{ok})=>config.url==='/auth/login'?ok(config,{otpRequired:true,challengeGroupId:newer}):config.url==='/auth/verify-otp'?ok(config,firstLogin):undefined);
  await h.fill('individual-login-id','customer-B');await h.fill('individual-login-password','Valid!123');await h.submit();
  await h.fill('individual-login-otp','123456');await h.click('Verify OTP');
  assert.equal(h.router.state.location.pathname,'/first-login/change-password');
  const fresh=sessionStorage.getItem(key);assert.deepEqual(JSON.parse(fresh),{challengeGroupId:newer,expiresAt:start+1200000});
  await h.perform(()=>waiting.resolve());assert.equal(sessionStorage.getItem(key),fresh);assert.equal(sessionStorage.getItem('challengeGroupId'),newer);
  assert.equal(sessionStorage.getItem('accessToken'),'preserved-access');assert.equal(sessionStorage.getItem('refreshToken'),'preserved-refresh');
  assert.equal(h.router.state.location.pathname,'/first-login/change-password');assert.ok(h.container.querySelector('form'));h.isolation();
  await h.password();await h.submit();assert.equal(sessionStorage.getItem(key),fresh);await h.pin();await h.submit();
  assert.equal(sessionStorage.getItem(key),null);assert.equal(sessionStorage.getItem('challengeGroupId'),null);
  assert.equal(sessionStorage.getItem('accessToken'),'individual-new-access');assert.equal(sessionStorage.getItem('refreshToken'),'individual-new-refresh');
  assert.equal(h.router.state.location.pathname,'/dashboard');h.isolation();
 });
 test(route+' expires automatically, blocks submissions, survives remount and returns with REPLACE',async t=>{
  const h=await setup(t,{route,metadata:{challengeGroupId:group,expiresAt:start+600000}});await h.advance(599999);assert.ok(h.container.querySelector('form'));await h.advance(1);h.expired();assert.equal(h.calls.length,0);
  await h.perform(()=>h.router.navigate('/login'));await h.perform(()=>h.router.navigate(route));h.expired();assert.equal(h.calls.length,0);
  await h.click('Return to Individual Login');assert.equal(h.router.state.location.pathname,'/login');assert.equal(h.router.state.historyAction,'REPLACE');assert.equal(h.calls.length,0);h.isolation();
 });
 test(route+' recognizes only the genuine backend first-login expiry and preserves unrelated tokens/storage',async t=>{
  const h=await setup(t,{route});sessionStorage.setItem('accessToken','another-session-access');sessionStorage.setItem('refreshToken','another-session-refresh');
  h.setHandler((config,{fail})=>fail(config,401,'SESSION_EXPIRED',expiryMessage));await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();h.expired();
  assert.equal(h.calls.length,1);assert.equal(sessionStorage.getItem('accessToken'),'another-session-access');assert.equal(sessionStorage.getItem('refreshToken'),'another-session-refresh');h.isolation();
 });
 for(const [status,code,message]of [[401,'UNAUTHORIZED','Wrong credentials'],[401,'SESSION_EXPIRED','Session expired due to inactivity.'],[400,'OTP_ERROR','OTP verification is required.']]) {
  test(route+' preserves non-setup error '+code+' / '+message,async t=>{
   const h=await setup(t,{route});h.setHandler((config,{fail})=>fail(config,status,code,message));await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();assert.ok(h.container.querySelector('form'));assert.equal(h.container.querySelector('[role=alert]').textContent,message);assert.equal(h.calls.length,1);assert.equal(sessionStorage.getItem('challengeGroupId'),group);h.isolation();
  });
 }
 test(route+' ignores a late successful response after automatic expiry',async t=>{
  const h=await setup(t,{route,metadata:{challengeGroupId:group,expiresAt:start+600000}}),waiting=deferred();h.setHandler((config,{ok})=>waiting.promise.then(()=>ok(config,{accessToken:'late-access',refreshToken:'late-refresh'})));
  await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();await h.advance(600000);h.expired();await h.perform(()=>waiting.resolve());h.expired();assert.equal(h.router.state.location.pathname,route);assert.equal(sessionStorage.getItem('accessToken'),null);assert.equal(sessionStorage.getItem('refreshToken'),null);h.isolation();
 });
 test(route+' cannot let an old timer or response clear a newer challenge',async t=>{
  const h=await setup(t,{route,metadata:{challengeGroupId:group,expiresAt:start+600000}}),waiting=deferred();h.setHandler((config,{ok})=>waiting.promise.then(()=>ok(config,{accessToken:'late-access',refreshToken:'late-refresh'})));
  await (route.endsWith('setup-pin')?h.pin():h.password());await h.submit();sessionStorage.setItem('challengeGroupId',newer);sessionStorage.setItem('maskedEmail','new@example.invalid');const fresh=JSON.stringify({challengeGroupId:newer,expiresAt:start+1200000});sessionStorage.setItem(key,fresh);
  await h.advance(600000);await h.perform(()=>waiting.resolve());assert.equal(sessionStorage.getItem('challengeGroupId'),newer);assert.equal(sessionStorage.getItem('maskedEmail'),'new@example.invalid');assert.equal(sessionStorage.getItem(key),fresh);assert.equal(sessionStorage.getItem('accessToken'),null);assert.equal(h.router.state.location.pathname,route);assert.notEqual(h.container.querySelector('h1').textContent,'Setup session expired');h.isolation();
 });
}

for(const metadata of [undefined,'{bad json', {challengeGroupId:newer,expiresAt:start-1},{challengeGroupId:group,expiresAt:'invalid'}]) {
 test('legacy/missing/malformed or older-challenge metadata never grants a new client window: '+JSON.stringify(metadata),async t=>{
  const h=await setup(t,{route:'/first-login/change-password',metadata});const before=sessionStorage.getItem(key);await h.advance(700000);assert.ok(h.container.querySelector('form'));assert.equal(sessionStorage.getItem(key),before);await h.password();await h.submit();assert.equal(h.router.state.location.pathname,'/first-login/setup-pin');assert.equal(sessionStorage.getItem(key),before);h.isolation();
 });
}

test('normal OTP login creates no setup metadata and retains token/checkout handling',async t=>{
 const h=await setup(t,{payment:true,otp:{accessToken:'returning-access',refreshToken:'returning-refresh'}});await h.fill('individual-login-otp','123456');await h.click('Verify OTP');assert.equal(sessionStorage.getItem(key),null);assert.equal(h.router.state.location.pathname,'/checkout');assert.equal(h.router.state.location.search,'?token=PAY');assert.equal(sessionStorage.getItem('accessToken'),'returning-access');assert.equal(sessionStorage.getItem('refreshToken'),'returning-refresh');h.isolation();
});
test('failed OTP verification never creates a setup deadline',async t=>{
 const h=await setup(t);h.setHandler((config,{fail})=>fail(config,400,'OTP_ERROR','Invalid OTP'));await h.fill('individual-login-otp','123456');await h.click('Verify OTP');assert.equal(sessionStorage.getItem(key),null);assert.equal(h.router.state.location.pathname,'/otp');assert.equal(h.container.querySelector('[role=alert]').textContent,'Invalid OTP');h.isolation();
});
test('PIN-only first login establishes the same bound deadline without password navigation',async t=>{
 const h=await setup(t,{otp:{...firstLogin,passwordChangeRequired:false}});await h.fill('individual-login-otp','123456');await h.click('Verify OTP');assert.equal(h.router.state.location.pathname,'/first-login/setup-pin');assert.deepEqual(JSON.parse(sessionStorage.getItem(key)),{challengeGroupId:group,expiresAt:start+600000});h.isolation();
});
test('successful setup clears only bound metadata, retains exact payloads and validated checkout destination',async t=>{
 const h=await setup(t,{payment:true});await h.fill('individual-login-otp','123456');await h.click('Verify OTP');await h.password();await h.submit();await h.pin();await h.submit();assert.equal(sessionStorage.getItem(key),null);assert.equal(sessionStorage.getItem('challengeGroupId'),null);assert.equal(sessionStorage.getItem('maskedEmail'),null);assert.equal(sessionStorage.getItem('accessToken'),'individual-new-access');assert.equal(sessionStorage.getItem('refreshToken'),'individual-new-refresh');assert.equal(h.router.state.location.pathname,'/checkout');assert.equal(h.router.state.location.search,'?token=PAY');
 assert.deepEqual(h.calls.map(c=>c.body),[{challengeGroupId:group,otp:'123456'},{challengeGroupId:group,newPassword:'Secure!123',confirmPassword:'Secure!123'},{challengeGroupId:group,pin:'123456',confirmPin:'123456'}]);h.isolation();
});
for(const action of ['Verify OTP','Resend OTP'])test('late '+action+' cannot overwrite a newer login challenge',async t=>{
 const h=await setup(t),waiting=deferred();h.setHandler((config,{ok})=>waiting.promise.then(()=>ok(config,action==='Verify OTP'?firstLogin:{challengeGroupId:group,message:'Old OTP'})));if(action==='Verify OTP')await h.fill('individual-login-otp','123456');await h.click(action);sessionStorage.setItem('challengeGroupId',newer);await h.perform(()=>waiting.resolve());assert.equal(sessionStorage.getItem('challengeGroupId'),newer);assert.equal(sessionStorage.getItem(key),null);assert.equal(h.router.state.location.pathname,'/otp');h.isolation();
});
test('a newer authenticated generation prevents old setup cleanup and late token restoration',async t=>{
 const h=await setup(t,{route:'/first-login/setup-pin',metadata:{challengeGroupId:group,expiresAt:start+600000}}),waiting=deferred();h.setHandler((config,{ok})=>waiting.promise.then(()=>ok(config,{accessToken:'late-access',refreshToken:'late-refresh'})));await h.pin();await h.submit();await h.perform(()=>h.load('src/utils/tokenStorage.ts').saveTokens('new-session-access','new-session-refresh'));await h.advance(600000);await h.perform(()=>waiting.resolve());assert.equal(sessionStorage.getItem('accessToken'),'new-session-access');assert.equal(sessionStorage.getItem('refreshToken'),'new-session-refresh');assert.equal(sessionStorage.getItem('challengeGroupId'),group);h.isolation();
});
