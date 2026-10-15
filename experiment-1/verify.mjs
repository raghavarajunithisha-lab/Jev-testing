import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const cases=JSON.parse(fs.readFileSync(root+'cases.json','utf8'));
assert.equal(cases.length,3);
for(const c of cases){const {docs}=JSON.parse(fs.readFileSync(root+'data/'+c.number+'.json','utf8'));assert(c.referenceFiles.length>0);assert(c.referenceFiles.every(f=>docs.some(d=>d.file===f)));assert.equal(c.query,c.title+'\n\n'+c.body);assert.notEqual(c.parent,c.merge);}
// Any attempted network request fails this check, even if caught by the CLI.
const code="globalThis.fetch=()=>{process.exitCode=99;throw new Error('Unexpected network call')};process.argv.push('--jev');await import('./screen.mjs');";
const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8'});
assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/Skipping all Jev requests/);
console.log('PASS: case provenance fields, complete inputs, source references, and no-network stop path.');
