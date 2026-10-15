// Isolated synthetic transport tests. Never creates benchmark tasks or results.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const url=new URL('./bench.mjs',import.meta.url);
const source=fs.readFileSync(url,'utf8');
const code=source.slice(source.indexOf('const root='),source.lastIndexOf('\ntry{if(command')).replaceAll('import.meta.url',JSON.stringify(url.href));
const sandbox={fs,path,crypto,execFileSync,fileURLToPath,assert,process:{args:[],argv:[],env:{OPENAI_API_KEY:'synthetic-secret',TYPESAFE_API_KEY:'synthetic-secret'}},Buffer,performance,AbortSignal,console,fetch:undefined};
vm.createContext(sandbox);vm.runInContext(code+'\nglobalThis.testAPI={call,bodies,retrieve,sample,clues,summarize,rankBM25,tokenize,excluded,analysisSummary};',sandbox);
const {call,bodies,retrieve,sample,summarize}=sandbox.testAPI;
const evidence={issue:'alpha broken',candidates:Array.from({length:5},(_,i)=>({file:`src/p${i}.py`,snippet:'alpha'}))};
const requests=bodies(evidence);
for(const text of Object.values(requests.jev.questions.file.criteria))assert(requests.openai.messages[1].content.includes(text));
const response=(body,status=200)=>({ok:status===200,status,headers:{get:()=>null},text:async()=>body});
for(const [provider,raw] of [['jev','{"answers":{"file":{"choice":"f2"}}}'],['openai','{"choices":[{"message":{"content":"{\\"choice\\":\\"f2\\"}"}}]}']]){
 sandbox.fetch=async()=>response(raw);const r=await call(provider,requests[provider],evidence);assert.equal(r.status,'ok');assert.equal(r.file,'src/p2.py');assert(r.latencyMs>=0);assert.equal(r.usage,null);assert.equal(r.cost,null);
}
for(const [raw,status,expected] of [['synthetic-secret',429,'http_error'],['not JSON',200,'invalid_json'],['{"answers":{"file":{"choice":"f99"}}}',200,'invalid_choice']]){
 sandbox.fetch=async()=>response(raw,status);const r=await call('jev',requests.jev,evidence);assert.equal(r.status,expected);assert(!JSON.stringify(r).includes('synthetic-secret'));assert.equal(r.hit,false);
}
sandbox.fetch=async()=>{const e=new Error('synthetic-secret timeout');e.name='TimeoutError';throw e;};
const timeout=await call('openai',requests.openai,evidence);assert.equal(timeout.status,'timeout');assert(!timeout.error.includes('synthetic-secret'));
const summary=summarize({mode:'synthetic-test',rows:[{jev:timeout,openai:{status:'ok',hit:true,latencyMs:20}}]});assert.equal(summary.providers.jev.accuracy,0);assert.equal(summary.providers.jev.denominator,1);assert.equal(summary.pairedLatency.count,0);
const files=Array.from({length:8},(_,i)=>({file:`src/p${i}.py`,text:i===7?'alpha alpha alpha':'unrelated'}));assert.equal(retrieve('alpha',files)[0].file,'src/p7.py');
const rows=Array.from({length:80},(_,i)=>({instance_id:'synthetic-'+i}));assert.equal(JSON.stringify(sample(rows,'s',40)),JSON.stringify(sample(rows.reverse(),'s',40)));
const {rankBM25,tokenize,excluded,analysisSummary}=sandbox.testAPI;
const rarity=rankBM25([{text:'common rare'},{text:'common'},{text:'common'}],new Map([['rare',1]]));assert(rarity[0]>rarity[1]);
assert(tokenize('BoundField bound_field').includes('bound'));assert(tokenize('BoundField bound_field').includes('field'));
const paths=Array.from({length:8},(_,i)=>({file:`src/module${i}.py`,text:'unrelated'}));assert.equal(retrieve('Inspect src/module6.py',paths)[0].file,'src/module6.py');assert.equal(JSON.stringify(retrieve('Inspect src/module6.py',paths)),JSON.stringify(retrieve('Inspect src/module6.py',[...paths].reverse())));
const late=Array.from({length:8},(_,i)=>({file:`src/mod${i}.py`,text:i===7?'blank\n'.repeat(300)+'unique_problem_symbol':'unrelated'}));const found=retrieve('unique_problem_symbol',late);assert.equal(found[0].file,'src/mod7.py');assert(found[0].snippet.includes('unique_problem_symbol'));assert(found.every(c=>c.snippet.length<=3000));
const selection=sample([...rows,...excluded.map(instance_id=>({instance_id}))],'fresh',42);assert.equal(selection.length,42);assert(!selection.some(x=>excluded.includes(x.instance_id)));assert(!selection.slice(40).some(x=>selection.slice(0,40).some(y=>y.instance_id===x.instance_id)));
const diagnostic=analysisSummary({mode:'synthetic-test',rows:[{referenceCandidateAvailable:false,jev:{status:'timeout',hit:false},openai:{status:'ok',hit:false,latencyMs:1}}]});assert.equal(diagnostic.conditionalAccuracy.jev.accuracy,null);assert.equal(diagnostic.providers.jev.denominator,1);
console.log('Passed synthetic tests: provider parsing, errors/timeouts, redaction, prompt parity, no cost imputation, failure scoring, BM25 rarity, identifier splitting, path evidence, late-code snippets, stable ranking, exclusions and disjoint smoke/full tasks. No network or provider calls.');
