// Keep secret values out of OS process arguments and terminal output.
// Vercel's stdin reader can miss piped values during its asynchronous startup.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const [key,cli]=process.argv.slice(2);
const values=JSON.parse(await readFile(new URL('../.private/deployment.json',import.meta.url),'utf8'));
if(!['OPS_ADMIN_TOKEN','CRON_SECRET','DECK_BRIDGE_SECRET','ENABLE_PAID_AI'].includes(key)||typeof values[key]!=='string') throw new Error('Unknown configuration key');
process.env.FORCE_TTY='0';
// This array is internal JS memory, not the command used to spawn this process.
process.argv=[process.execPath,cli,'env','add',key,'production','--value',values[key],'--yes','--force','--scope','ralieghsamuelbarnett-8850s-projects'];
await import(pathToFileURL(cli).href);
