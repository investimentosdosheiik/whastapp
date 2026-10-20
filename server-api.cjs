'use strict';
const {createHmac,createHash,timingSafeEqual,randomBytes}=require('node:crypto');
const {SheetsStore,fault}=require('./server-sheets.cjs');
const {SettingsStore}=require('./server-settings.cjs');
const {sheetReady,createClient}=require('./server-auth.cjs');
const COOKIE='__Host-impulso';
const attempts=new Map();
let authClient;
function authReady(){return typeof process.env.APP_PASSWORD==='string'&&process.env.APP_PASSWORD.length>=16&&typeof process.env.SESSION_SECRET==='string'&&process.env.SESSION_SECRET.length>=32}
function mac(s){return createHmac('sha256',process.env.SESSION_SECRET).update(s).digest('base64url')}
function same(a,b){const x=createHash('sha256').update(String(a)).digest(),y=createHash('sha256').update(String(b)).digest();return timingSafeEqual(x,y)}
function makeSession(){const p=Buffer.from(JSON.stringify({exp:Date.now()+7*86400000,nonce:randomBytes(16).toString('hex'),version:mac(process.env.APP_PASSWORD)})).toString('base64url');return p+'.'+mac(p)}
function authorized(req){try{if(!authReady())return false;const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||token.length>2000)return false;const[p,sig]=token.split('.');if(!p||!sig||!same(sig,mac(p)))return false;const payload=JSON.parse(Buffer.from(p,'base64url'));return payload.exp>Date.now()&&payload.exp<Date.now()+8*86400000&&same(payload.version,mac(process.env.APP_PASSWORD))}catch(_){return false}}
function cookie(res,token){res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token?7*86400:0}`)}
function body(req){let b;try{b=typeof req.body==='string'?JSON.parse(req.body):req.body}catch(_){throw fault(400,'JSON inválido.')}if(!b||typeof b!=='object'||Array.isArray(b)||Buffer.byteLength(JSON.stringify(b))>65536)throw fault(400,'Solicitação inválida.');return b}
function checkOrigin(req){const origin=req.headers.origin;if(!origin||new URL(origin).host!==req.headers.host)throw fault(403,'Origem não autorizada.');if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fault(415,'Use JSON.')}
async function call(path,options={}){try{if(!authClient)authClient=await createClient();const r=await authClient.request({url:'https://sheets.googleapis.com/v4/spreadsheets'+path,method:options.method||'GET',data:options.body,timeout:15000,retry:false});return r.data}catch(e){const status=e.response?.status;if(status===400||status===401||status===403||status===404)throw fault(502,'Não foi possível acessar a planilha. Confira a federação Google, as APIs, o ID e o compartilhamento com a conta de serviço.');throw fault(502,'O Google não respondeu. Tente novamente em instantes.')}}
async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Vary','Cookie');res.setHeader('X-Content-Type-Options','nosniff');
 try{
 const action=String(req.query?.action||'session'),method=req.method;
 if(action==='session'&&method==='GET')return res.status(200).json({authConfigured:authReady(),sheetConfigured:sheetReady(),authenticated:authorized(req)});
 if(!['GET','POST','PATCH'].includes(method))throw fault(405,'Método não permitido.');
 if(method!=='GET')checkOrigin(req);
 if(action==='login'&&method==='POST'){
  if(!authReady())throw fault(503,'Configure a senha e a chave da sessão na Vercel.');
  const b=body(req);if(typeof b.password!=='string'||b.password.length>1024)throw fault(400,'Senha inválida.');
  const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();const now=Date.now();for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);if(attempts.size>10000)attempts.clear();let entry=attempts.get(ip)||{n:0,until:now+15*60000};if(entry.n>=10){res.setHeader('Retry-After',Math.ceil((entry.until-now)/1000));throw fault(429,'Muitas tentativas. Aguarde 15 minutos.');}
  if(!same(b.password,process.env.APP_PASSWORD)){entry.n++;attempts.set(ip,entry);throw fault(401,'Senha incorreta.');}attempts.delete(ip);cookie(res,makeSession());return res.status(200).json({ok:true});
 }
 if(!authorized(req))throw fault(401,'Entre para acessar seus contatos.');
 if(action==='logout'&&method==='POST'){cookie(res,'');return res.status(200).json({ok:true})}
 if(!sheetReady())throw fault(503,'A conexão com a planilha ainda não foi configurada.');
 const store=new SheetsStore(call,process.env.GOOGLE_SHEET_ID,process.env.GOOGLE_SHEET_TAB||'Prospects');
 if(action==='leads'&&method==='GET'){const [leads,settings]=await Promise.all([store.list(),new SettingsStore(call,process.env.GOOGLE_SHEET_ID).read()]);return res.status(200).json({leads,settings,syncedAt:new Date().toISOString()})}
 if(action==='settings'&&method==='PATCH'){const b=body(req);return res.status(200).json({settings:await new SettingsStore(call,process.env.GOOGLE_SHEET_ID).patch(b.settings,b.base)})}
 if(action==='lead'&&method==='POST')return res.status(201).json({lead:await store.create(body(req))});
 if(action==='lead'&&method==='PATCH'){const b=body(req);if(typeof b.id!=='string'||!/^[a-f0-9]{32}$/.test(b.id)||!Object.hasOwn(b,'base'))throw fault(400,'Solicitação inválida.');return res.status(200).json({lead:await store.patch(b.id,b.field,b.value,b.base)})}
 throw fault(404,'Ação não encontrada.');
 }catch(e){const status=e.status||500;return res.status(status).json({error:status===500?'Não foi possível concluir a operação. Tente novamente.':e.message,...(e.current?{current:e.current}:{})})}
}
module.exports=handler;
module.exports._test={same,makeSession,authorized,authReady,sheetReady,checkOrigin};
