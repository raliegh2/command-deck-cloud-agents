import {createHmac,randomUUID} from 'node:crypto';
const {CLOUD_OPS_URL,DECK_BRIDGE_SECRET,COMMAND_DECK_TOKEN}=process.env;
const deck=process.env.COMMAND_DECK_URL??'http://127.0.0.1:8788';
if(!CLOUD_OPS_URL||!DECK_BRIDGE_SECRET||!COMMAND_DECK_TOKEN) throw new Error('Relay configuration is incomplete');
if(!['127.0.0.1','localhost'].includes(new URL(deck).hostname)||new URL(CLOUD_OPS_URL).protocol!=='https:') throw new Error('Invalid endpoint boundary');
const response=await fetch(new URL('/api/dashboard',deck),{headers:{Authorization:'Bearer '+COMMAND_DECK_TOKEN},signal:AbortSignal.timeout(10000)});
if(!response.ok) throw new Error('Command Deck snapshot unavailable');
const dashboard=await response.json();
// Explicit projection only: no roots, file paths, source code, logs or customer data leave this relay.
const allowed=new Set(['ddos-detector','northstar','malware-lab','gpt-codex-bridge','m5-v15-research','home-lab-suite','command-deck','personal-brain']);
const checkedAt=new Date().toISOString();
const observations=(dashboard.projects??[]).filter(p=>allowed.has(p.id)).map(p=>({projectId:p.id,checkedAt,status:p.health==='online'?'healthy':p.health==='offline'?'down':'unobserved'}));
const raw=JSON.stringify({observations}),timestamp=String(Date.now()),nonce=randomUUID(),pathname='/ops/deck-snapshot';
const signature=createHmac('sha256',DECK_BRIDGE_SECRET).update(`${timestamp}.${nonce}.${pathname}.${raw}`).digest('hex');
const result=await fetch(new URL(pathname,CLOUD_OPS_URL),{method:'POST',headers:{'Content-Type':'application/json','x-deck-timestamp':timestamp,'x-deck-nonce':nonce,'x-deck-signature':signature},body:raw,signal:AbortSignal.timeout(15000)});
if(!result.ok) throw new Error('Cloud snapshot rejected');
console.log('Submitted '+observations.length+' projected observations. No local API was exposed.');
