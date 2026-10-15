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
vm.createContext(sandbox);vm.runInContext(code+'\nglobalThis.testAPI={call,bodies,retrieve,sample,clues,summarize};',sandbox);
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
console.log('Passed synthetic tests: both schemas, shared evidence, invalid responses, HTTP errors, timeout, redaction, missing usage/cost, failure denominator, retrieval, deterministic sampling. No network or provider calls.');
