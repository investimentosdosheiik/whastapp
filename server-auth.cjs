'use strict';
const SCOPES=['https://www.googleapis.com/auth/spreadsheets'];
function federationReady(env=process.env){
 return /^\d{6,20}$/.test(env.GCP_PROJECT_NUMBER||'')&&
  /^[a-z][a-z0-9-]{2,62}@[a-z][a-z0-9-]{4,61}\.iam\.gserviceaccount\.com$/.test(env.GCP_SERVICE_ACCOUNT_EMAIL||'')&&
  /^[a-z][a-z0-9-]{3,31}$/.test(env.GCP_WORKLOAD_IDENTITY_POOL_ID||'')&&
  /^[a-z][a-z0-9-]{3,31}$/.test(env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID||'');
}
function keyReady(env=process.env){try{const c=JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON||'null');return !!(c?.type==='service_account'&&typeof c.client_email==='string'&&c.client_email.endsWith('.gserviceaccount.com')&&typeof c.private_key==='string'&&c.private_key.includes('PRIVATE KEY'))}catch(_){return false}}
function sheetReady(env=process.env){return /^[a-zA-Z0-9_-]+$/.test(env.GOOGLE_SHEET_ID||'')&&(federationReady(env)||keyReady(env))}
function federationOptions(env=process.env,getToken){
 if(!federationReady(env))throw new Error('Configuração de federação incompleta.');
 const audience=`//iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`;
 return {type:'external_account',audience,scopes:SCOPES,
  subject_token_type:'urn:ietf:params:oauth:token-type:jwt',
  token_url:'https://sts.googleapis.com/v1/token',
  service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  // Fetch inside the request context; never capture a build token at module load.
  subject_token_supplier:{getSubjectToken:async()=>{
   const fn=getToken||require('@vercel/oidc').getVercelOidcToken;
   return fn();
  }}
 };
}
async function createClient(env=process.env){
 const {GoogleAuth,ExternalAccountClient}=require('google-auth-library');
 if(federationReady(env))return ExternalAccountClient.fromJSON(federationOptions(env));
 if(keyReady(env))return new GoogleAuth({credentials:JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON),scopes:SCOPES}).getClient();
 throw new Error('Autenticação Google não configurada.');
}
module.exports={sheetReady,federationReady,federationOptions,createClient};
