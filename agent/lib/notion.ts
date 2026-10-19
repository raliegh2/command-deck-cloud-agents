import type { Store } from './store';
import type { Report } from './types';
export async function deliverNotion(storage:Store,fetcher:typeof fetch=fetch) {
 const token=process.env.NOTION_REPORT_TOKEN,parent=process.env.NOTION_REPORT_PARENT_ID;
 if(!token||!parent) return {status:'not_configured',sent:0};
 if(!/^[a-f0-9-]{32,36}$/i.test(parent)) throw new Error('Invalid Notion parent');
 let selected:Report|undefined;
 await storage.transact(state=>{
  // An ambiguous prior send must be reconciled, never blindly recreated.
  for(const r of state.reports) if(r.notion.status==='sending') r.notion.status='needs_reconciliation';
  selected=state.reports.find(r=>r.notion.status==='pending');
  if(selected) selected.notion.status='sending';
 });
 if(!selected) return {status:'idle',sent:0};
 const r=selected;
 try {
  const response=await fetcher('https://api.notion.com/v1/pages',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+token,'Notion-Version':'2022-06-28','Content-Type':'application/json'},body:JSON.stringify({parent:{page_id:parent},properties:{title:{type:'title',title:[{type:'text',text:{content:r.title}}]}},children:[{object:'block',type:'paragraph',paragraph:{rich_text:[{type:'text',text:{content:'Command Deck report '+r.id+' | sequence '+r.sequence+' | '+r.createdAt}}]}},...r.markdown.match(/[\s\S]{1,1800}/g)!.map(content=>({object:'block',type:'paragraph',paragraph:{rich_text:[{type:'text',text:{content}}]}}))]})});
  if(!response.ok) throw new Error('Notion delivery failed');
  const page=await response.json() as {id:string};
  if(!page.id) throw new Error('Notion receipt missing');
  await storage.transact(state=>{const item=state.reports.find(x=>x.id===r.id);if(item) item.notion={status:'sent',pageId:page.id};});
  return {status:'delivered',sent:1,pageId:page.id};
 }catch {
  await storage.transact(state=>{const item=state.reports.find(x=>x.id===r.id);if(item) item.notion.status='needs_reconciliation';});
  return {status:'needs_reconciliation',sent:0};
 }
}
