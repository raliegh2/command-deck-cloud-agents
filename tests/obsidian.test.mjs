import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {syncReports} from '../scripts/obsidian-sync.mjs';
test('Obsidian pull is idempotent and preserves local edits',async()=>{
 const vault=await mkdtemp(path.join(os.tmpdir(),'deck-obsidian-test-'));
 try{
 const data={reports:[{id:'12345678-1234-1234-1234-123456789012',sequence:1,title:'Test evidence',createdAt:'2026-10-19',markdown:'A report.'}],hasMore:false};
 const fetcher=async()=>new Response(JSON.stringify(data));
 assert.equal((await syncReports({url:'https://example.com',token:'fake',vault,fetcher})).downloaded,1);
 const folder=path.join(vault,'07 Cloud Operations'),file=(await readdir(folder)).find(x=>x.endsWith('.md'));
 const saved=await readFile(path.join(folder,file),'utf8');assert.ok(saved.includes('Project knowledge graph'));
 await writeFile(path.join(folder,file),'My personal edits');
 await writeFile(path.join(folder,'.cloud-sync.json'),JSON.stringify({after:0,hashes:{[file]:'old'}}));
 await assert.rejects(()=>syncReports({url:'https://example.com',token:'fake',vault,fetcher}),/conflict/);
 assert.equal(await readFile(path.join(folder,file),'utf8'),'My personal edits');
 }finally{await rm(vault,{recursive:true,force:true});}
});
