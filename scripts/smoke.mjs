import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
// Load the generated local handoff after any pulled (redacted) production values.
try { const {readFile}=await import('node:fs/promises');Object.assign(process.env,JSON.parse(await readFile(new URL('../.private/deployment.json',import.meta.url),'utf8'))); } catch {}
const base=process.argv[2]??'http://127.0.0.1:3000';
const token=process.env.OPS_ADMIN_TOKEN;if(!token) throw new Error('Owner credential is not configured');
const call=(route,options={})=>fetch(new URL(route,base),{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(75000)});
assert.equal((await fetch(new URL('/ops/status',base))).status,401);
const response=await call('/ops/status');assert.equal(response.status,200);const before=await response.json();assert.equal(before.agents.length,15);assert.equal(before.policy.paidAiEnabled,false);assert.equal(before.policy.productionMutations,false);
assert.equal((await call('/eve/v1/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'This must be rejected before model execution.'})})).status,403);
const cycle=await call('/ops/monitor',{method:'POST'});assert.equal(cycle.status,200);const result=await cycle.json();
const status=await (await call('/ops/status')).json();assert.ok(status.lastCycle);assert.equal(Object.values(status.observations).filter(o=>o.source==='cloud'&&o.status!=='unobserved').length,3);
const reports=await (await call('/ops/reports?after=0')).json();assert.ok(reports.reports.length>0);
await mkdir(new URL('../.private/',import.meta.url),{recursive:true});
await writeFile(new URL('../.private/smoke-report.json',import.meta.url),JSON.stringify({base,checkedAt:new Date().toISOString(),result,status,reports},null,2));
console.log(JSON.stringify({anonymousRejected:true,paidModelRejected:true,roles:15,productionProjects:3,persistedCycle:true,reports:reports.reports.length,notion:result.notion},null,2));
