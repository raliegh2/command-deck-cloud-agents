import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const dir=new URL('../.private/',import.meta.url);await mkdir(dir,{recursive:true});
const file=new URL('deployment.json',dir);let values;
try{values=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;values={OPS_ADMIN_TOKEN:randomBytes(36).toString('hex'),CRON_SECRET:randomBytes(36).toString('hex'),DECK_BRIDGE_SECRET:randomBytes(36).toString('hex'),ENABLE_PAID_AI:'false'};await writeFile(file,JSON.stringify(values,null,2));}
const cli=process.env.VERCEL_CLI_PATH;
if(!cli) throw new Error('Set VERCEL_CLI_PATH to the installed Vercel CLI JavaScript entry point');
for(const [key,value] of Object.entries(values)){
 const result=spawnSync(process.execPath,[new URL('vercel-env-runner.mjs',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/i,''),key,cli],{encoding:'utf8',windowsHide:true,env:{...process.env,FORCE_TTY:'0'}});
 if(result.status!==0) throw new Error('Could not set '+key+'; inspect Vercel configuration (values withheld)');
 console.log('Configured '+key+' in production');
}
