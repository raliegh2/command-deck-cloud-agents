import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, type State } from '../agent/lib/types';
import { reconcile,runCycle,probe,freshness } from '../agent/lib/operations';
import {handle} from '../agent/lib/http';
import {signature,verifySignature,authorized,redact} from '../agent/lib/policy';
import {readSource} from '../agent/lib/source';
import {deliverNotion} from '../agent/lib/notion';
import {projects,agents} from '../agent/lib/catalog';
import type {Store} from '../agent/lib/store';

// Test-only store. Production has no in-memory fallback.
class Memory implements Store {
 state=emptyState();nonces=new Set<string>();
 async read(){return structuredClone(this.state);}
 async transact<T>(fn:(s:State)=>T|Promise<T>){const clone=structuredClone(this.state);const result=await fn(clone);this.state=clone;return result;}
 async claimNonce(n:string){if(this.nonces.has(n))return false;this.nonces.add(n);return true;}
}
const now=new Date('2026-10-19T14:00:00Z');
test('two failures create one incident; recovery remains review-only',()=>{
 const state=emptyState();const observation={projectId:'lessonplantogo',checkedAt:now.toISOString(),source:'cloud' as const,status:'down' as const};
 reconcile(state,observation);assert.equal(state.tasks.length,0);reconcile(state,observation);reconcile(state,observation);assert.equal(state.tasks.length,1);
 reconcile(state,{...observation,status:'healthy'});assert.equal(state.tasks[0].status,'needs_review');assert.equal(state.reports.length,2);
 reconcile(state,{...observation,status:'healthy'});assert.equal(state.reports.length,2);
});
test('cloud probes never fetch local URLs or follow redirects',async()=>{
 let calls=0;const fn=(async(_url,init)=>{calls++;assert.equal(init?.redirect,'manual');return new Response('',{status:302,headers:{location:'http://127.0.0.1/'}});}) as typeof fetch;
 assert.equal((await probe(projects[3],fn,now)).status,'unobserved');assert.equal(calls,0);
 assert.equal((await probe(projects[0],fn,now)).status,'degraded');assert.equal(calls,1);
});
test('cycles deduplicate state updates and preserve unobserved local systems',async()=>{
 const storage=new Memory(),fn=(async()=>new Response('do not store this body')) as typeof fetch;
 await runCycle(storage,fn,now);await runCycle(storage,fn,now);
 assert.equal(storage.state.reports.length,1);assert.equal(storage.state.observations.northstar.status,'unobserved');assert.equal(storage.state.sequence,1);
 assert.ok(!JSON.stringify(storage.state).includes('do not store this body'));
 assert.equal(freshness(storage.state,now.getTime()+3600000).monitorStale,true);
});
test('unauthorized callers never access operational state',async()=>{
 process.env.OPS_ADMIN_TOKEN='x'.repeat(48);let accessed=false;
 const response=await handle(new Request('https://example.com/ops/status'),()=>{accessed=true;return new Memory();});
 assert.equal(response.status,401);assert.equal(accessed,false);
 assert.equal(authorized(new Request('https://example.com',{headers:{Authorization:'Bearer '+'x'.repeat(48)}}),process.env.OPS_ADMIN_TOKEN),true);
});
test('signed relay rejects tampering, path substitution and stale requests',()=>{
 const secret='s'.repeat(48),timestamp=String(Date.now()),nonce='12345678-1234-1234-1234-123456789012',raw='{}',path='/ops/deck-snapshot';
 const headers={'x-deck-timestamp':timestamp,'x-deck-nonce':nonce,'x-deck-signature':signature(secret,timestamp,nonce,path,raw)};
 const req=new Request('https://example.com'+path,{headers});assert.equal(verifySignature(req,raw,secret),true);assert.equal(verifySignature(req,'tampered',secret),false);assert.equal(verifySignature(new Request('https://example.com/ops/proposals',{headers}),raw,secret),false);assert.equal(verifySignature(req,raw,secret,Date.now()+600000),false);
});
test('relay ingestion rejects nonce replay and production health spoofing',async()=>{
 const storage=new Memory();process.env.DECK_BRIDGE_SECRET='b'.repeat(48);
 const send=(input:unknown,nonce='12345678-1234-1234-1234-123456789012')=>{const raw=JSON.stringify(input),timestamp=String(Date.now());return handle(new Request('https://example.com/ops/deck-snapshot',{method:'POST',body:raw,headers:{'x-deck-timestamp':timestamp,'x-deck-nonce':nonce,'x-deck-signature':signature(process.env.DECK_BRIDGE_SECRET!,timestamp,nonce,'/ops/deck-snapshot',raw)}}),()=>storage);};
 assert.equal((await send({observations:[{projectId:'northstar',checkedAt:new Date().toISOString(),status:'healthy'}]})).status,200);
 assert.equal((await send({observations:[]})).status,409);
 assert.equal((await send({observations:[{projectId:'lessonplantogo',checkedAt:new Date().toISOString(),status:'healthy'}]},'23456789-1234-1234-1234-123456789012')).status,400);
});
test('Notion ambiguous delivery is retained for reconciliation, never blindly retried',async()=>{
 const storage=new Memory();await runCycle(storage,(async()=>new Response('')) as typeof fetch,now);
 process.env.NOTION_REPORT_TOKEN='test-only';process.env.NOTION_REPORT_PARENT_ID='a'.repeat(32);let calls=0;
 const fn=(async()=>{calls++;throw new Error('lost network receipt');}) as typeof fetch;
 await deliverNotion(storage,fn);await deliverNotion(storage,fn);assert.equal(calls,1);assert.equal(storage.state.reports[0].notion.status,'needs_reconciliation');
 delete process.env.NOTION_REPORT_TOKEN;delete process.env.NOTION_REPORT_PARENT_ID;
});
test('source retrieval rejects path traversal and credential files before network access',async()=>{
 const fn=(async()=>{throw new Error('network must not be used');}) as typeof fetch;
 for(const path of ['../package.json','.env.local','.private/config.json','secrets.json','.git/config','src/token.ts']) await assert.rejects(()=>readSource('lessonplantogo',path,fn),/not allowed|Unsupported/);
});
test('reports remove common credentials, email addresses and local roots',()=>{
 const output=redact('ghp_abcdefghijklmnopqrstuvwxy me@example.com C:/Users/person/test password=private');
 assert.ok(!output.includes('ghp_'));assert.ok(!output.includes('me@example.com'));assert.ok(!output.includes('C:/Users'));assert.ok(!output.includes('password=private'));
});
test('exactly fifteen scoped specialist roles and eleven allowlisted projects',()=>{assert.equal(agents.length,15);assert.equal(new Set(agents.map(x=>x[0])).size,15);assert.equal(projects.length,11);});
test('verified Notion receipts are owner-only and conflicting receipts are rejected',async()=>{
 const storage=new Memory();await runCycle(storage,(async()=>new Response('')) as typeof fetch,now);
 process.env.OPS_ADMIN_TOKEN='a'.repeat(48);const id=storage.state.reports[0].id;
 const send=(pageId:string)=>handle(new Request('https://example.com/ops/report-receipt',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPS_ADMIN_TOKEN},body:JSON.stringify({reportId:id,pageId})}),()=>storage);
 assert.equal((await send('12345678-1234-4234-8234-123456789012')).status,200);
 assert.equal(storage.state.reports[0].notion.status,'sent');
 assert.equal((await send('22345678-1234-4234-8234-123456789012')).status,503);
});
