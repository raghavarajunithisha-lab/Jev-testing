import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),experiment=process.argv[2];
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Official dataset download failed: HTTP ${r.status}`);return r.json();}
try{
 if(!['2','3'].includes(experiment))throw Error('Use: node tools/prepare-replay.mjs 2|3 [--dataset=C:\\path\\official-test.json]');
 const dir=path.join(root,'experiment-'+experiment),data=path.join(dir,'data');
 for(const name of ['manifest.json','dataset.json','seal.json'])if(fs.existsSync(path.join(data,name)))throw Error('Existing local experiment data found. Refusing to overwrite or silently rerun; use a fresh checkout.');
 const manifest=read(path.join(root,'reports','experiment-'+experiment,'manifest.json'));
 const local=process.argv.find(x=>x.startsWith('--dataset='))?.slice(10);
 let rows;
 if(local)rows=read(path.resolve(local));else {rows=[];for(let offset=0;offset<300;offset+=100){const page=await get(`https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test&offset=${offset}&length=100`);if(page.num_rows_total!==300)throw Error('Unexpected official dataset size');rows.push(...page.rows.map(x=>x.row));}}
 if(hash(rows)!==manifest.datasetHash)throw Error('Dataset content differs from the frozen historical snapshot. Nothing was restored. Supply the verified original official JSON with --dataset=...; do not invent substitutes.');
 fs.mkdirSync(data,{recursive:true});fs.writeFileSync(path.join(data,'dataset.json'),JSON.stringify(rows,null,2));fs.writeFileSync(path.join(data,'manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(data,'manifest.sha256'),hash(manifest));
 const result=spawnSync(process.execPath,['bench.mjs','prepare'],{cwd:dir,stdio:'inherit'});if(result.status!==0)throw Error('Source preparation did not complete. Preserve the frozen manifest and inspect its output; retry the same bench.mjs prepare protocol.');
 console.log('Exact published sample prepared without provider calls. Next: node experiment-'+experiment+'/bench.mjs run --dry-run');
}catch(e){console.error(e.message);process.exitCode=1;}
