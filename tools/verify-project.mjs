import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(file,cwd=root){const r=spawnSync(process.execPath,[file],{cwd,encoding:'utf8'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);assert.equal(r.status,0,`${file} failed`);}
for(const e of [1,2,3])assert(fs.existsSync(path.join(root,`experiment-${e}/README.md`)));
run('experiment-2/test.mjs');run('experiment-3/test.mjs');
const legacy=path.join(root,'experiment-1');
if(fs.existsSync(path.join(legacy,'cases.json'))&&fs.existsSync(path.join(legacy,'data'))){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jev-legacy-offline-'));
 try{for(const name of ['cases.json','screen.mjs','verify.mjs','data'])fs.cpSync(path.join(legacy,name),path.join(temp,name),{recursive:true});run('verify.mjs',temp);}finally{assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(temp).startsWith('jev-legacy-offline-'),'Unsafe temporary cleanup target');fs.rmSync(temp,{recursive:true,force:true});}
}else console.log('SKIP: archival Experiment 1 source/input snapshots are local-only and not available in this checkout.');
const m2=JSON.parse(fs.readFileSync(path.join(root,'reports/experiment-2/manifest.json'),'utf8'));
const m3=JSON.parse(fs.readFileSync(path.join(root,'reports/experiment-3/manifest.json'),'utf8'));
assert.equal(m2.tasks.length,40);assert.equal(m3.tasks.filter(t=>t.partition==='full').length,40);assert.equal(m3.tasks.filter(t=>t.partition==='smoke').length,2);
assert(!m2.tasks.some(t=>m3.tasks.some(x=>x.id===t.id)));
console.log('PASS: separated experiment layout, offline tests, published manifest sizes and zero Experiment 2/3 task overlap. No provider calls.');
