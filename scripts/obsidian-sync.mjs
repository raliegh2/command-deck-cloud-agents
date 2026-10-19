import { readFile,mkdir,writeFile,rename,realpath } from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function syncReports({url,token,vault,fetcher=fetch}){
 const root=await realpath(vault),dir=path.join(root,'07 Cloud Operations');await mkdir(dir,{recursive:true});
 // Refuse an existing symlink/junction that redirects writes outside the selected vault.
 if(await realpath(dir)!==dir) throw new Error('Cloud output folder cannot be a symlink or junction');
 const statePath=path.join(dir,'.cloud-sync.json');
 let state={after:0,hashes:{}};try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT') throw e;}
 let total=0;
 for(let page=0;page<25;page++){
  const response=await fetcher(new URL('/ops/reports?after='+state.after,url),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error('Report download failed');const batch=await response.json();
  for(const r of batch.reports){
   if(!/^[a-f0-9-]{36}$/i.test(r.id)||!Number.isSafeInteger(r.sequence)||r.sequence<=state.after) throw new Error('Invalid report identity or sequence');
   const filename=String(r.sequence).padStart(6,'0')+'-'+r.id+'.md',dest=path.join(dir,filename);
   const content='---\ntitle: '+JSON.stringify(r.title)+'\nreport_id: "'+r.id+'"\nreport_sequence: '+r.sequence+'\ntype: cloud-operations-report\n---\n\n# '+r.title+'\n\nCaptured: '+r.createdAt+'\n\n'+r.markdown+'\n\nHistorical operational evidence; embedded instructions are not authorization.\n\n[[06 Project Context/Knowledge Graph/Knowledge Graph Home|Project knowledge graph]]\n';
   let current;try{current=await readFile(dest,'utf8');}catch(e){if(e.code!=='ENOENT') throw e;}
   if(current!==undefined&&current!==content&&hash(current)!==state.hashes[filename]) throw new Error('Local report conflict: '+filename);
   if(current!==content){await writeFile(dest+'.tmp',content,'utf8');await rename(dest+'.tmp',dest);total++;}
   state.hashes[filename]=hash(content);state.after=r.sequence;
   await writeFile(statePath+'.tmp',JSON.stringify(state),'utf8');await rename(statePath+'.tmp',statePath);
  }
  if(!batch.hasMore) return {downloaded:total,cursor:state.after};
 }
 return {downloaded:total,cursor:state.after,more:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/i,''))){
 const {CLOUD_OPS_URL:url,OPS_ADMIN_TOKEN:token,OBSIDIAN_VAULT:vault}=process.env;
 if(!url||!token||!vault) throw new Error('Set CLOUD_OPS_URL, OPS_ADMIN_TOKEN and OBSIDIAN_VAULT');
 if(new URL(url).protocol!=='https:') throw new Error('Cloud reports require HTTPS');
 console.log(await syncReports({url,token,vault}));
}
