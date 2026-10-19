import { randomUUID } from 'node:crypto';
import { emptyState, type State } from './types';
export interface Store {
 read(): Promise<State>;
 transact<T>(fn:(state:State)=>Promise<T>|T):Promise<T>;
 claimNonce(nonce:string):Promise<boolean>;
}
const PREFIX='deck-cloud:v1:'+(process.env.VERCEL_ENV??'development')+':';
const RELEASE="if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
const COMMIT="if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end; redis.call('SET',KEYS[2],ARGV[2]); redis.call('DEL',KEYS[1]); return 1";
export class RedisStore implements Store {
 constructor(private url=process.env.UPSTASH_REDIS_REST_URL??process.env.KV_REST_API_URL,private token=process.env.UPSTASH_REDIS_REST_TOKEN??process.env.KV_REST_API_TOKEN) {
  if(!url||!token) throw new Error('Durable state is not configured');
  if(new URL(url).protocol!=='https:') throw new Error('Storage requires HTTPS');
 }
 private async command(args:(string|number)[]):Promise<unknown> {
  const res=await fetch(this.url!,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});
  if(!res.ok) throw new Error('Durable storage request failed');
  const result=await res.json() as {result?:unknown;error?:string}; if(result.error) throw new Error('Durable storage rejected command'); return result.result;
 }
 async read():Promise<State> { const raw=await this.command(['GET',PREFIX+'state']); return typeof raw==='string'?JSON.parse(raw) as State:emptyState(); }
 async claimNonce(nonce:string) { return await this.command(['SET',PREFIX+'nonce:'+nonce,'1','NX','EX',600])==='OK'; }
 async transact<T>(fn:(state:State)=>Promise<T>|T):Promise<T> {
  const owner=randomUUID(), key=PREFIX+'lock';
  if(await this.command(['SET',key,owner,'NX','PX',90000])!=='OK') throw new Error('Another operation is in progress; retry shortly');
  try {
   const state=await this.read(); const result=await fn(state);
   if(state.tasks.length>500) throw new Error('Task capacity reached; archive reviewed tasks before continuing');
   if(state.reports.length>1000) throw new Error('Report capacity reached; export/archive reports before continuing');
   if(await this.command(['EVAL',COMMIT,2,key,PREFIX+'state',owner,JSON.stringify(state)])!==1) throw new Error('State lease expired; update was not committed');
   return result;
  } finally { await this.command(['EVAL',RELEASE,1,key,owner]).catch(()=>{}); }
 }
}
export function store():Store { return new RedisStore(); }
