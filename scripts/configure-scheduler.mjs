import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const secrets=JSON.parse(await readFile(new URL('../.private/deployment.json',import.meta.url),'utf8'));
const repo='raliegh2/command-deck-cloud-agents',url='https://command-deck-cloud-agents.vercel.app';
let result=spawnSync('gh',['variable','set','CLOUD_OPS_URL','--repo',repo,'--body',url],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error('Could not set scheduler URL');
result=spawnSync('gh',['secret','set','CRON_SECRET','--repo',repo],{input:secrets.CRON_SECRET,encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error('Could not configure scheduler secret');
console.log('Configured the new repository scheduler; no owner credential was uploaded.');
