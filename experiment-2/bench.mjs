import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=path.dirname(fileURLToPath(import.meta.url));
const at=(...p)=>path.join(root,...p);
const args=process.argv.slice(2), command=args[0];
const opt=(name,fallback)=>args.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,x)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p+'.tmp',JSON.stringify(x,null,2));fs.renameSync(p+'.tmp',p);};
const excluded=['5262','5631','5787','5809','5840'].map(x=>'pytest-dev__pytest-'+x);
const config={version:1,count:40,seed:'jev-experiment-2-v1',candidates:5,snippetChars:3000,timeoutMs:60000,openaiModel:'gpt-6-astra',jevModel:'jev-latest',instruction:'Select the source file most relevant to investigating and fixing the reported behavior. The snippets may be incomplete.',retrieval:'top five Python files by sum of log(1+query-token frequency), issue/path/source only; snippet centered on highest scoring line; no labels; path tie break',metric:'top-one changed-production-file overlap; not patch correctness'};
function sample(rows,seed,count){return rows.filter(r=>!excluded.includes(r.instance_id)).sort((a,b)=>hash(seed+'\0'+a.instance_id).localeCompare(hash(seed+'\0'+b.instance_id))).slice(0,count);}
function git(dir,...a){return execFileSync('git',['-c','core.autocrlf=false',...a],{cwd:dir,encoding:'utf8',timeout:180000,maxBuffer:100*1024*1024,stdio:['ignore','pipe','pipe']});}
function sources(dir,commit,names){const buf=execFileSync('git',['cat-file','--batch'],{cwd:dir,input:names.map(n=>commit+':'+n+'\n').join(''),timeout:180000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});let pos=0;return names.map(file=>{const end=buf.indexOf(10,pos);const header=buf.subarray(pos,end).toString();assert(/^[a-f0-9]+ blob \d+$/.test(header),'Missing source blob');const size=Number(header.split(' ')[2]);pos=end+1;const text=buf.subarray(pos,pos+size).toString('utf8');pos+=size+1;return {file,text};});}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Dataset HTTP ${r.status}`);return r.json();}
async function dataset(){
 const local=opt('dataset');if(local)return {rows:read(path.resolve(local)),source:{file:path.resolve(local),kind:'local JSON export; caller must verify official provenance'}};
 const meta=await get('https://huggingface.co/api/datasets/princeton-nlp/SWE-bench_Lite');
 const revision=meta.sha;if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Missing immutable dataset revision');
 // Dataset viewer is checked against the repository revision before and after pagination.
 const rows=[];for(let offset=0;offset<300;offset+=100){const page=await get(`https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test&offset=${offset}&length=100`);if(page.num_rows_total!==300)throw Error('Unexpected dataset size');rows.push(...page.rows.map(x=>x.row));}
 const after=await get('https://huggingface.co/api/datasets/princeton-nlp/SWE-bench_Lite');if(after.sha!==revision)throw Error('Dataset revision changed during acquisition');
 return {rows,source:{dataset:'princeton-nlp/SWE-bench_Lite',split:'test',revision,acquisition:'HF dataset viewer; cached content hash is authoritative; viewer revision cannot be pinned'}};
}
function validateRows(rows){assert(Array.isArray(rows)&&rows.length>=40,'Need at least 40 official dataset rows');assert.equal(new Set(rows.map(x=>x.instance_id)).size,rows.length,'Duplicate IDs');for(const r of rows){assert(/^[\w.-]+\/[\w.-]+$/.test(r.repo));assert(/^[a-f0-9]{40}$/.test(r.base_commit));assert(typeof r.problem_statement==='string'&&r.problem_statement.length>0);assert(typeof r.patch==='string');}}
function references(patch){return [...new Set([...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(x=>x[1]).filter(production))];}
function production(p){return p.endsWith('.py')&&!/(^|\/)(tests?|testing|docs?|examples?|benchmarks?)(\/|$)/i.test(p)&&!/(^|\/)test[^/]*\.py$/.test(p);}
function retrieve(issue,files){
 const tokens=[...new Set(issue.toLowerCase().match(/[a-z_][a-z_0-9]{2,}/g)??[])];
 const score=s=>{const counts=new Map();for(const t of s.toLowerCase().match(/[a-z_][a-z_0-9]{2,}/g)??[])counts.set(t,(counts.get(t)??0)+1);return tokens.reduce((n,t)=>n+Math.log1p(counts.get(t)??0),0);};
 return files.map(f=>({...f,score:score(f.file+'\n'+f.text)})).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,5).map(f=>{const lines=f.text.split('\n');let best=0,bestScore=-1;lines.forEach((s,i)=>{const n=score(s);if(n>bestScore){best=i;bestScore=n;}});const start=Math.max(0,best-10);return {file:f.file,sourceHash:hash(f.text),score:f.score,snippet:lines.slice(start,start+80).map((l,i)=>`${start+i+1}: ${l}`).join('\n').slice(0,config.snippetChars)};});
}
function clues(issue,files){return {candidatePathMentions:files.filter(f=>issue.includes(f.file)||issue.includes(f.file.replace(/\.py$/,'').replaceAll('/','.'))).map(f=>f.file),explicitAnswerLanguage:/\b(correct (?:answer|file)|answer\s*:|ground.?truth|referenceFiles|gold (?:label|file)|modify\s+\S+\.py|fix (?:is|in)\s+\S+\.py)\b/i.test(issue),patchInIssue:/^diff --git |^@@ .*@@/m.test(issue)};}
async function prepare(){
 assert(!fs.existsSync(at('results','smoke','raw.json'))&&!fs.existsSync(at('results','full','raw.json')),'Preparation is frozen after any provider run; do not tune based on outcomes');
 fs.mkdirSync(at('data'),{recursive:true});let manifest;
 if(fs.existsSync(at('data','manifest.json'))){manifest=read(at('data','manifest.json'));console.log('Using existing frozen manifest; no resampling.');}
 else {
  let acquired;try{acquired=await dataset();validateRows(acquired.rows);}catch(e){save(at('data','preparation-blocker.json'),{status:'blocked',message:String(e.message),next:'Export the official SWE-bench_Lite test split as a JSON array, then node bench.mjs prepare --dataset=C:\\path\\test.json . Required fields: instance_id,repo,base_commit,problem_statement,patch. No fabricated substitutes.'});throw Error('Dataset acquisition blocked. See data/preparation-blocker.json. '+e.message);}
  const chosen=sample(acquired.rows,config.seed,40);assert(new Set(chosen.map(r=>r.repo)).size>=3,'Seeded sample has fewer than 3 repositories; stop without choosing a favorable replacement');
  save(at('data','dataset.json'),acquired.rows);
  manifest={config,source:acquired.source,datasetHash:hash(acquired.rows),excluded,createdAt:new Date().toISOString(),tasks:chosen.map(r=>({id:r.instance_id,repo:r.repo,baseCommit:r.base_commit,issueHash:hash(r.problem_statement)}))};
  save(at('data','manifest.json'),manifest);fs.writeFileSync(at('data','manifest.sha256'),hash(manifest));
 }
 assert.equal(hash(manifest),fs.readFileSync(at('data','manifest.sha256'),'utf8'));assert.equal(hash(config),hash(manifest.config),'Configuration changed after freeze');
 const rows=read(at('data','dataset.json'));assert.equal(hash(rows),manifest.datasetHash);
 const evidence=[],labels=[],audit=[];
 for(const task of manifest.tasks){
  const r=rows.find(x=>x.instance_id===task.id), ref=references(r.patch);labels.push({id:task.id,referenceFiles:ref});
  try{
   const dir=at('cache',r.repo.replace('/','__'));if(!fs.existsSync(dir)){fs.mkdirSync(dir,{recursive:true});git(dir,'init','--bare');git(dir,'remote','add','origin',`https://github.com/${r.repo}.git`);}
   try{git(dir,'cat-file','-e',r.base_commit+'^{commit}');}catch{git(dir,'fetch','--depth=1','origin',r.base_commit);}
   const names=git(dir,'ls-tree','-r','--name-only',r.base_commit).trim().split('\n').filter(production).sort();
   const files=sources(dir,r.base_commit,names);
   const candidates=retrieve(r.problem_statement,files);assert.equal(candidates.length,5,'Fewer than 5 production Python candidates');
   const row={id:task.id,issue:r.problem_statement,candidates};evidence.push(row);
   audit.push({id:task.id,status:'ready',sourceFiles:names.length,candidateAvailability:candidates.every(c=>names.includes(c.file)),referenceFilesInRepository:ref.filter(f=>names.includes(f)),referenceCandidates:ref.filter(f=>candidates.some(c=>c.file===f)),hasReferenceCandidate:ref.some(f=>candidates.some(c=>c.file===f)),clues:clues(row.issue,candidates),referencePathMention:ref.filter(f=>row.issue.includes(f)),labelCount:ref.length});
   console.log(`${task.id}: ready (${names.length} source files)`);
  }catch(e){audit.push({id:task.id,status:'preparation_failed',error:String(e.message).slice(0,1000)});console.log(`${task.id}: preparation failed; retained in denominator`);}
  save(at('data','evidence.json'),evidence);save(at('data','labels.json'),labels);save(at('data','audit.json'),audit);
 }
 const seal={manifest:hash(manifest),evidence:hash(evidence),labels:hash(labels),audit:hash(audit),code:hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8'))};save(at('data','seal.json'),seal);
 console.log(`Frozen ${manifest.tasks.length} tasks; ${evidence.length} ready. Run dry-run before paid calls.`);
}
function load(){const m=read(at('data','manifest.json')),e=read(at('data','evidence.json')),l=read(at('data','labels.json')),a=read(at('data','audit.json')),s=read(at('data','seal.json'));for(const [k,v] of Object.entries({manifest:m,evidence:e,labels:l,audit:a}))assert.equal(hash(v),s[k],`${k} hash mismatch`);assert.equal(hash(config),hash(m.config));assert.equal(hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8')),s.code,'Runner changed after preparation');assert.equal(m.tasks.length,40);assert(!m.tasks.some(t=>excluded.includes(t.id)));assert(new Set(m.tasks.map(t=>t.repo)).size>=3);for(const x of e){assert.equal(x.candidates.length,5);assert.equal(hash(x.issue),m.tasks.find(t=>t.id===x.id).issueHash);assert.equal(new Set(x.candidates.map(c=>c.file)).size,5);}return {m,e,l,a,s};}
function bodies(e){const criteria=Object.fromEntries(e.candidates.map((c,i)=>['f'+i,c.file+'\n'+c.snippet]));return {jev:{model:config.jevModel,state:{issue:e.issue},questions:{file:{type:'choice',instructions:config.instruction,criteria}}},openai:{model:config.openaiModel,messages:[{role:'system',content:config.instruction+' Return only JSON {"choice":"f0"} with a single candidate key.'},{role:'user',content:`Problem Statement:\n${e.issue}\n\nCandidate Files:\n`+Object.entries(criteria).map(([k,v])=>`Option [${k}]:\n${v}`).join('\n\n---\n\n')}],response_format:{type:'json_object'}}};}
function redact(x){let s=typeof x==='string'?x:JSON.stringify(x);for(const key of [process.env.OPENAI_API_KEY,process.env.TYPESAFE_API_KEY].filter(Boolean))s=s.split(key).join('[REDACTED]');return s;}
async function call(provider,body,e){
 const result={status:'started',hit:false,request:body,startedAt:new Date().toISOString(),usage:null,cost:null};const start=performance.now();
 try{
  const res=await fetch(provider==='jev'?'https://api.typesafe.ai/v1/systemone':'https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env[provider==='jev'?'TYPESAFE_API_KEY':'OPENAI_API_KEY'],'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(config.timeoutMs)});
  result.httpStatus=res.status;result.requestId=res.headers.get('x-request-id');result.raw=redact(await res.text());if(!res.ok){result.status='http_error';return result;}
  let d;try{d=JSON.parse(result.raw);}catch{result.status='invalid_json';return result;}
  result.usage=d.usage??null;result.cost=d.cost??d.usage?.cost??null;result.returnedModel=d.model??null;
  let choice;try{choice=provider==='jev'?d.answers?.file?.choice:JSON.parse(d.choices[0].message.content).choice;}catch{result.status='invalid_answer';return result;}
  if(!/^f[0-4]$/.test(choice)){result.status='invalid_choice';return result;}
  result.choice=choice;result.file=e.candidates[Number(choice.slice(1))].file;result.status='ok';
 }catch(err){result.status=err.name==='TimeoutError'||err.name==='AbortError'?'timeout':'network_error';result.error=redact(err.message);}
 finally{result.latencyMs=performance.now()-start;}
 return result;
}
function summarize(report){const out={mode:report.mode,total:report.rows.length,manifestHash:report.manifestHash,metric:config.metric,providers:{},pairedLatency:null};for(const p of ['jev','openai']){const all=report.rows.map(r=>r[p]),ok=all.filter(r=>r.status==='ok'),times=ok.map(r=>r.latencyMs).sort((a,b)=>a-b);out.providers[p]={hits:all.filter(r=>r.hit).length,denominator:all.length,accuracy:all.filter(r=>r.hit).length/all.length,validResponses:ok.length,statusCounts:all.reduce((n,r)=>(n[r.status]=(n[r.status]??0)+1,n),{}),successfulLatencyMs:times.length?{mean:times.reduce((a,b)=>a+b,0)/times.length,median:times.length%2?times[(times.length-1)/2]:(times[times.length/2-1]+times[times.length/2])/2,p95:times[Math.ceil(times.length*.95)-1]}:null};}const paired=report.rows.filter(r=>r.jev.status==='ok'&&r.openai.status==='ok');out.pairedLatency={count:paired.length,openaiOverJevRatioOfMeans:paired.length?paired.reduce((s,r)=>s+r.openai.latencyMs,0)/paired.reduce((s,r)=>s+r.jev.latencyMs,0):null};return out;}
async function run(){
 const {m,e,l,a,s}=load();const smoke=args.includes('--smoke');const tasks=smoke?m.tasks.slice(0,2):m.tasks;
 if(args.includes('--dry-run')){const requests=e.map(x=>({id:x.id,...bodies(x)}));save(at('data','dry-run-requests.json'),requests);console.log(JSON.stringify({tasks:m.tasks.length,repositories:[...new Set(m.tasks.map(t=>t.repo))],ready:e.length,preparationFailures:a.filter(x=>x.status!=='ready').length,referenceCandidateMisses:a.filter(x=>x.status==='ready'&&!x.hasReferenceCandidate).length,clueFlagged:a.filter(x=>x.clues&&(x.clues.explicitAnswerLanguage||x.clues.patchInIssue||x.clues.candidatePathMentions.length)).length,manifestHash:s.manifest,apiCalls:0},null,2));return;}
 for(const k of ['OPENAI_API_KEY','TYPESAFE_API_KEY'])assert(process.env[k],`${k} is missing; no calls made`);
 const mode=smoke?'smoke':'full',dir=at('results',mode);fs.mkdirSync(dir,{recursive:true});const lock=fs.openSync(at('run.lock'),'wx');
 try{
  assert(!fs.existsSync(path.join(dir,'raw.json')),'This mode already has a report. Refusing to silently rerun or overwrite.');
  const report={mode,startedAt:new Date().toISOString(),manifestHash:s.manifest,seal:s,config,notes:['No retries; serial requests; order alternates by frozen index.','Latency includes response body transfer and parsing; successful and paired summaries only. Failures retained in accuracy denominator.','Provider defaults may be stochastic. No token or cost imputation. Public cases may be memorized.','Smoke is an operational check; full reuses these tasks and must not be tuned based on smoke outcomes.'],rows:tasks.map((t,i)=>({id:t.id,order:i%2?['openai','jev']:['jev','openai'],jev:{status:'unattempted',hit:false},openai:{status:'unattempted',hit:false}}))};
  const persist=()=>{save(path.join(dir,'raw.json'),JSON.parse(redact(report)));save(path.join(dir,'summary.json'),summarize(report));};persist();
  for(const row of report.rows){const evidence=e.find(x=>x.id===row.id);if(!evidence){for(const p of row.order)row[p]={status:'preparation_failed',hit:false};persist();continue;}
   const requests=bodies(evidence);
   for(const p of row.order){row[p]={status:'interrupted_or_inflight',hit:false,request:requests[p]};persist();row[p]=await call(p,requests[p],evidence);row[p].hit=row[p].status==='ok'&&l.find(x=>x.id===row.id).referenceFiles.includes(row[p].file);persist();console.log(`${row.id} ${p}: ${row[p].status}`);}
  }
  report.completedAt=new Date().toISOString();persist();console.log(JSON.stringify(summarize(report),null,2));
 }finally{fs.closeSync(lock);fs.unlinkSync(at('run.lock'));}
}
function selftest(){const rows=Array.from({length:100},(_,i)=>({instance_id:'r-'+i}));assert.deepEqual(sample(rows,'seed',40),sample(rows.reverse(),'seed',40));const e={issue:'issue',candidates:Array.from({length:5},(_,i)=>({file:`p${i}.py`,snippet:'code'}))};const b=bodies(e);assert(!JSON.stringify(b).includes('referenceFiles'));for(const c of Object.values(b.jev.questions.file.criteria))assert(b.openai.messages[1].content.includes(c));assert(clues('correct answer: x',[]).explicitAnswerLanguage);assert.deepEqual(references('+++ b/src/a.py\n+++ b/tests/test_a.py'),['src/a.py']);assert.equal(summarize({mode:'test',rows:[{jev:{status:'timeout',hit:false},openai:{status:'ok',hit:true,latencyMs:10}}]}).providers.jev.denominator,1);console.log('Self-test passed: deterministic selection, prompt parity, clue detection, label extraction, failure denominator.');}
try{if(command==='prepare')await prepare();else if(command==='run')await run();else if(command==='self-test')selftest();else throw Error('Use: node bench.mjs prepare [--dataset=C:\\path\\test.json] | run --dry-run | run --smoke | run | self-test');}catch(e){console.error(redact(e.message));process.exitCode=1;}
