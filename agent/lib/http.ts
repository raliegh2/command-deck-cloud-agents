import { z } from 'zod';
import { authorized, verifySignature, aiEnabled, redact } from './policy';
import { agents, projects, projectById } from './catalog';
import { freshness, reconcile, report, runCycle } from './operations';
import { store, type Store } from './store';
import { deliverNotion } from './notion';
const ObservationInput=z.object({projectId:z.string().max(80),checkedAt:z.iso.datetime(),status:z.enum(['healthy','degraded','down','unobserved'])});
const Snapshot=z.object({observations:z.array(ObservationInput).max(20)});
const Proposal=z.object({projectId:z.string().max(80),title:z.string().min(3).max(150),proposal:z.string().min(20).max(12000),evidence:z.array(z.string().max(500)).min(1).max(12)});
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(request:Request) {
 const reader=request.body?.getReader(); if(!reader) return '';
 let n=0; const chunks:Uint8Array[]=[];
 for(;;){const x=await reader.read(); if(x.done) break;n+=x.value.length;if(n>32000){await reader.cancel();throw new Error('Body limit exceeded');} chunks.push(x.value);}
 return new TextDecoder().decode(Buffer.concat(chunks));
}
export async function handle(request:Request, storageFactory:()=>Store=store):Promise<Response> {
 const url=new URL(request.url),path=url.pathname;
 if(path==='/') return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Command Deck Cloud Agents</title><body style="font:18px system-ui;max-width:760px;margin:10vh auto;padding:24px"><h1>Command Deck Cloud Agents</h1><p>15 specialist roles · monitored projects · evidence-led operations</p><p>Operational data is authenticated. Paid AI execution is disabled by default. No production mutation tools are exposed.</p><p>Read the repository deployment guide to configure durable state and report delivery.</p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});
 if(path==='/ops/health') return json({service:'command-deck-cloud-agents',alive:true});
 const snapshot=path==='/ops/deck-snapshot';
 const monitor=path==='/ops/monitor';
 if(!snapshot&&!authorized(request,monitor?process.env.CRON_SECRET:process.env.OPS_ADMIN_TOKEN)&&!authorized(request,monitor?process.env.OPS_ADMIN_TOKEN:undefined)) return json({error:'Authentication required'},401);
 try {
  const storage=storageFactory();
  if(path==='/ops/status'&&request.method==='GET') {
   const state=await storage.read();return json({agents:agents.map(([id,name,mission])=>({id,name,mission,execution:aiEnabled()?'enabled':'disabled'})),projects,policy:{paidAiEnabled:aiEnabled(),productionMutations:false},...freshness(state),observations:state.observations,tasks:state.tasks,delivery:{notionConfigured:!!process.env.NOTION_REPORT_TOKEN&&!!process.env.NOTION_REPORT_PARENT_ID,pendingNotion:state.reports.filter(r=>r.notion.status==='pending').length,ambiguousNotion:state.reports.filter(r=>r.notion.status==='needs_reconciliation').length}});
  }
  if(monitor&&request.method==='POST') {const cycle=await runCycle(storage);const notion=await deliverNotion(storage);return json({cycle,notion});}
  if(path==='/ops/reports'&&request.method==='GET') {
   const after=Number(url.searchParams.get('after')??0); if(!Number.isSafeInteger(after)||after<0) return json({error:'Invalid cursor'},400);
   const state=await storage.read(); const rows=state.reports.filter(r=>r.sequence>after).slice(0,50);return json({reports:rows,next:rows.at(-1)?.sequence??after,hasMore:state.reports.some(r=>r.sequence>(rows.at(-1)?.sequence??after))});
  }
  if(snapshot&&request.method==='POST') {
   const raw=await body(request);
   if(!verifySignature(request,raw,process.env.DECK_BRIDGE_SECRET)) return json({error:'Invalid signature'},401);
   const input=Snapshot.parse(JSON.parse(raw));
   for(const o of input.observations) {
    if(projectById(o.projectId).mode==='production'||Math.abs(Date.now()-Date.parse(o.checkedAt))>300000) return json({error:'Snapshot scope or freshness rejected'},400);
   }
   if(!await storage.claimNonce(request.headers.get('x-deck-nonce')!)) return json({error:'Replay rejected'},409);
   await storage.transact(state=>{
    for(const o of input.observations) if(!state.observations[o.projectId]||Date.parse(o.checkedAt)>Date.parse(state.observations[o.projectId].checkedAt)) reconcile(state,{...o,source:'relay'});
    state.relaySeenAt=new Date().toISOString();
   });return json({accepted:input.observations.length});
  }
  if(path==='/ops/proposals'&&request.method==='POST') {
   const input=Proposal.parse(JSON.parse(await body(request)));const p=projectById(input.projectId);
   const task=await storage.transact(state=>{const task={id:crypto.randomUUID(),projectId:p.id,owner:p.owner,kind:'proposal' as const,status:'needs_review' as const,title:redact(input.title),proposal:redact(input.proposal),evidence:input.evidence.map(redact),createdAt:new Date().toISOString()};state.tasks.push(task);report(state,'Proposal: '+task.title,'# Proposed change\n\n'+task.proposal+'\n\nEvidence:\n'+task.evidence.map(x=>'- '+x).join('\n')+'\n\nReview required. No code, deployment, schema or production setting was changed.',p.id);return task;});
   return json(task,201);
  }
  if(path==='/ops/report-receipt'&&request.method==='POST') {
   const input=z.object({reportId:z.uuid(),pageId:z.uuid()}).parse(JSON.parse(await body(request)));
   await storage.transact(state=>{const item=state.reports.find(r=>r.id===input.reportId);if(!item)throw new Error('Unknown report');if(item.notion.status==='sent'&&item.notion.pageId!==input.pageId)throw new Error('Conflicting receipt');item.notion={status:'sent',pageId:input.pageId};});
   return json({recorded:true});
  }
  return json({error:'Route not found'},404);
 }catch(error) {
  if(error instanceof z.ZodError||error instanceof SyntaxError) return json({error:'Invalid request body'},400);
  return json({error:'Operation unavailable; verify configuration, state capacity and service health'},503);
 }
}
