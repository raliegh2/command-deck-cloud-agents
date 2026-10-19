import {readFile} from 'node:fs/promises';
const [reportId,pageId]=process.argv.slice(2);
if(!/^[a-f0-9-]{36}$/i.test(reportId??'')||!/^[a-f0-9-]{36}$/i.test(pageId??''))throw new Error('Provide the verified report UUID and Notion page UUID');
const values=JSON.parse(await readFile(new URL('../.private/deployment.json',import.meta.url),'utf8'));
const res=await fetch('https://command-deck-cloud-agents.vercel.app/ops/report-receipt',{method:'POST',headers:{Authorization:'Bearer '+values.OPS_ADMIN_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({reportId,pageId}),signal:AbortSignal.timeout(15000)});
if(!res.ok)throw new Error('Receipt was not recorded; HTTP '+res.status);
console.log('Verified Notion receipt recorded.');
