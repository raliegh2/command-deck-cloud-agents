import { randomUUID } from 'node:crypto';
import { projects, projectById } from './catalog';
import { redact, aiEnabled } from './policy';
import type { Observation, State, Project, Report } from './types';
import type { Store } from './store';

export async function probe(p:Project, fetcher:typeof fetch=fetch, now=new Date()):Promise<Observation> {
 if(!p.url) return {projectId:p.id,checkedAt:now.toISOString(),source:'cloud',status:'unobserved'};
 const start=Date.now();
 try {
  const response=await fetcher(p.url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'CommandDeckCloudMonitor/1.0'}});
  await response.body?.cancel(); // Never store production response bodies or cookies.
  const headers=['content-security-policy','x-content-type-options','referrer-policy'].filter(h=>!response.headers.has(h));
  return {projectId:p.id,checkedAt:now.toISOString(),source:'cloud',status:response.ok?'healthy':response.status>=300&&response.status<400?'degraded':'down',httpStatus:response.status,latencyMs:Date.now()-start,missingHeaders:headers};
 }catch { return {projectId:p.id,checkedAt:now.toISOString(),source:'cloud',status:'down',latencyMs:Date.now()-start}; }
}
export function report(state:State,title:string,markdown:string,projectId?:string,now=new Date()):Report {
 const item:Report={id:randomUUID(),sequence:++state.sequence,createdAt:now.toISOString(),title:redact(title),markdown:redact(markdown),projectId,notion:{status:'pending'}};
 state.reports.push(item); return item;
}
export function reconcile(state:State,o:Observation) {
 const p=projectById(o.projectId); const previous=state.observations[p.id]; state.observations[p.id]=o;
 state.streaks[p.id]=o.status==='down'?(state.streaks[p.id]??0)+1:0;
 const open=state.tasks.find(t=>t.projectId===p.id&&t.kind==='incident'&&t.status!=='done');
 if(state.streaks[p.id]>=2&&!open) {
  const task={id:randomUUID(),projectId:p.id,owner:'incident',kind:'incident' as const,status:'queued' as const,title:p.name+' availability failure',createdAt:o.checkedAt,evidence:[`Cloud/relay status ${o.status}; HTTP ${o.httpStatus??'unavailable'}; checked ${o.checkedAt}`]};
  state.tasks.push(task); report(state,task.title,`# Incident\n\nProject: ${p.name}\n\nTwo consecutive failed observations. Task: ${task.id}.\n\nInvestigation owner: Incident Commander. AI execution: ${aiEnabled()?'configured':'disabled'}. No fix or deployment has been applied.`,p.id,new Date(o.checkedAt));
 }
 if(open&&o.status==='healthy') {
  open.status='needs_review';
  if(previous?.status!=='healthy') report(state,p.name+' recovered',`# Recovery observed\n\nProject: ${p.name}\n\nHealthy endpoint observed at ${o.checkedAt}. Incident ${open.id} remains open for human review; a single successful probe does not establish a root cause or permanent resolution.`,p.id,new Date(o.checkedAt));
 }
}
export async function runCycle(storage:Store,fetcher:typeof fetch=fetch,now=new Date()) {
 // Network probes outside the state lease; updates are committed atomically afterward.
 const observations=await Promise.all(projects.filter(p=>p.mode==='production').map(p=>probe(p,fetcher,now)));
 return storage.transact(state=>{
  if(state.lastCycle&&now.getTime()-Date.parse(state.lastCycle)<60000) return {deduplicated:true};
  for(const o of observations) reconcile(state,o);
  for(const p of projects.filter(p=>p.mode!=='production')) {
   const current=state.observations[p.id];
   if(!current||now.getTime()-Date.parse(current.checkedAt)>15*60000) state.observations[p.id]={projectId:p.id,checkedAt:now.toISOString(),source:'cloud',status:'unobserved'};
  }
  const day=now.toISOString().slice(0,10);
  if(!state.reports.some(r=>r.title==='Daily operations '+day)) report(state,'Daily operations '+day,'# Daily operations\n\n'+projects.map(p=>`- ${p.name}: ${state.observations[p.id]?.status??'unobserved'}`).join('\n')+'\n\nPaid AI is '+(aiEnabled()?'enabled':'disabled')+'. No production mutation capability is exposed. Local-only project visibility requires a fresh signed relay snapshot.',undefined,now);
  state.lastCycle=now.toISOString(); return {checked:observations.length,openTasks:state.tasks.filter(t=>t.status!=='done').length,reportSequence:state.sequence};
 });
}
export function freshness(state:State,now=Date.now()) {
 return {lastCycle:state.lastCycle??null,monitorStale:!state.lastCycle||now-Date.parse(state.lastCycle)>30*60000,relaySeenAt:state.relaySeenAt??null,relayStale:!state.relaySeenAt||now-Date.parse(state.relaySeenAt)>15*60000};
}
