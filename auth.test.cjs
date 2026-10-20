'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {federationReady,sheetReady,federationOptions,createClient}=require('./server-auth.cjs');
const env={GCP_PROJECT_NUMBER:'123456789012',GCP_SERVICE_ACCOUNT_EMAIL:'impulso@example-project-123.iam.gserviceaccount.com',GCP_WORKLOAD_IDENTITY_POOL_ID:'impulso-vercel',GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:'whastapp',GOOGLE_SHEET_ID:'fictitious_sheet'};
test('keyless configuration is accepted without a service account key',async()=>{
 assert.equal(federationReady(env),true);assert.equal(sheetReady(env),true);
 const client=await createClient(env);
 assert.deepEqual(client.scopes,['https://www.googleapis.com/auth/spreadsheets']);
 assert.equal(client.constructor.name,'IdentityPoolClient');
});
test('incomplete or injected federation configuration cannot enable sheet access',()=>{
 for(const key of ['GCP_PROJECT_NUMBER','GCP_SERVICE_ACCOUNT_EMAIL','GCP_WORKLOAD_IDENTITY_POOL_ID','GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID']){
  assert.equal(sheetReady({...env,[key]:''}),false,key);
  assert.equal(sheetReady({...env,[key]:'../../other?url=https://invalid.example'}),false,key);
 }
 assert.equal(sheetReady({...env,GOOGLE_SHEET_ID:''}),false);
});
test('subject tokens are obtained lazily for each requested refresh',async()=>{
 let calls=0;const options=federationOptions(env,async()=>`token-${++calls}`);
 assert.equal(calls,0);
 assert.equal(options.audience,'//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/impulso-vercel/providers/whastapp');
 assert.equal(options.service_account_impersonation_url,'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/impulso@example-project-123.iam.gserviceaccount.com:generateAccessToken');
 assert.equal(await options.subject_token_supplier.getSubjectToken(),'token-1');
 assert.equal(await options.subject_token_supplier.getSubjectToken(),'token-2');
 assert.deepEqual(options.scopes,['https://www.googleapis.com/auth/spreadsheets']);
});
