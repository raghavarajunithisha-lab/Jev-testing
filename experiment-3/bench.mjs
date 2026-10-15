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
const previous=read(at('previous-experiment.json'));
const excluded=[...new Set([...['5262','5631','5787','5809','5840'].map(x=>'pytest-dev__pytest-'+x),...previous.instanceIds])];
assert.equal(previous.instanceIds.length,40,'Expected frozen Experiment 2 exclusions');
const config={version:3,count:42,fullCount:40,smokeCount:2,seed:'jev-experiment-3-v1',candidates:5,snippetChars:3000,timeoutMs:60000,openaiModel:'gpt-6-astra',jevModel:'jev-latest',instruction:'Select the source file most relevant to investigating and fixing the reported behavior. The snippets may be incomplete.',retrieval:{method:'BM25 on files and overlapping passages; explicit issue path/module boost; no labels',k1:1.2,b:0.75,fileWeight:0.35,passageWeight:0.65,titleWeight:2,exactPathBoost:20,basenameBoost:4,passageLines:60,strideLines:30,snippetPassages:2,tieBreak:'ASCII source path'},metric:'top-one changed-production-file overlap; not patch correctness',design:'42 seeded tasks excluding Experiments 1 and 2; first 40 full, last 2 smoke; no overlap; no tuning after coverage audit'};
const ascii=(a,b)=>a<b?-1:a>b?1:0;
function sample(rows,seed,count){return rows.filter(r=>!excluded.includes(r.instance_id)).sort((a,b)=>ascii(hash(seed+'\0'+a.instance_id),hash(seed+'\0'+b.instance_id))).slice(0,count);}
function git(dir,...a){return execFileSync('git',['-c','core.autocrlf=false',...a],{cwd:dir,encoding:'utf8',timeout:180000,maxBuffer:100*1024*1024,stdio:['ignore','pipe','pipe']});}
function sources(dir,commit,names){const buf=execFileSync('git',['cat-file','--batch'],{cwd:dir,input:names.map(n=>commit+':'+n+'\n').join(''),timeout:180000,maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});let pos=0;return names.map(file=>{const end=buf.indexOf(10,pos);const header=buf.subarray(pos,end).toString();assert(/^[a-f0-9]+ blob \d+$/.test(header),'Missing source blob');const size=Number(header.split(' ')[2]);pos=end+1;const text=buf.subarray(pos,pos+size).toString('utf8');pos+=size+1;return {file,text};});}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Dataset HTTP ${r.status}`);return r.json();}
async function dataset(){
 const local=opt('dataset');if(local)return {rows:read(path.resolve(local)),source:{file:path.resolve(local),kind:'local JSON export; caller must verify official provenance'}};
 const cached=path.resolve(root,'../experiment-2/data/dataset.json');
 if(fs.existsSync(cached)){const rows=read(cached);assert.equal(hash(rows),previous.datasetHash,'Experiment 2 dataset content changed');return {rows,source:{...previous.source,acquisition:'Read-only reuse of verified Experiment 2 official dataset snapshot',previousManifestHash:previous.experiment2ManifestHash}};}
 const meta=await get('https://huggingface.co/api/datasets/princeton-nlp/SWE-bench_Lite');
 const revision=meta.sha;if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Missing immutable dataset revision');
 // Dataset viewer is checked against the repository revision before and after pagination.
 const rows=[];for(let offset=0;offset<300;offset+=100){const page=await get(`https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test&offset=${offset}&length=100`);if(page.num_rows_total!==300)throw Error('Unexpected dataset size');rows.push(...page.rows.map(x=>x.row));}
 const after=await get('https://huggingface.co/api/datasets/princeton-nlp/SWE-bench_Lite');if(after.sha!==revision)throw Error('Dataset revision changed during acquisition');
 return {rows,source:{dataset:'princeton-nlp/SWE-bench_Lite',split:'test',revision,acquisition:'HF dataset viewer; cached content hash is authoritative; viewer revision cannot be pinned'}};
}
function validateRows(rows){assert(Array.isArray(rows)&&rows.length>=config.count,'Need at least 42 official dataset rows');assert.equal(new Set(rows.map(x=>x.instance_id)).size,rows.length,'Duplicate IDs');for(const r of rows){assert(/^[\w.-]+\/[\w.-]+$/.test(r.repo));assert(/^[a-f0-9]{40}$/.test(r.base_commit));assert(typeof r.problem_statement==='string'&&r.problem_statement.length>0);assert(typeof r.patch==='string');}}
function references(patch){return [...new Set([...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map(x=>x[1]).filter(production))];}
function production(p){return p.endsWith('.py')&&!/(^|\/)(tests?|testing|docs?|examples?|benchmarks?)(\/|$)/i.test(p)&&!/(^|\/)test[^/]*\.py$/.test(p);}
const stop=new Set('the a an and or of to in is it for on with this that from as be are was were by at not have has can will would should when if then than but all any some into out about also use using used does do did please thanks issue error expected actual behavior python version code example return returns self none true false def class import'.split(' '));
function tokenize(s){const raw=s.replace(/([a-z0-9])([A-Z])/g,'$1 $2').toLowerCase().match(/[a-z_][a-z_0-9]*/g)??[];return raw.flatMap(t=>t.includes('_')?[t,...t.split('_')]:[t]).filter(t=>t.length>=2&&!stop.has(t));}
function frequencies(s){const m=new Map();for(const t of tokenize(s))m.set(t,(m.get(t)??0)+1);return m;}
function rankBM25(docs,query){const terms=new Set(query.keys()),df=new Map();let total=0;const stats=docs.map(d=>{const tf=frequencies(d.text);const len=[...tf.values()].reduce((a,b)=>a+b,0);total+=len;for(const t of terms)if(tf.has(t))df.set(t,(df.get(t)??0)+1);return {tf,len};});const avg=total/docs.length||1;return stats.map(({tf,len})=>{let score=0;for(const [term,weight] of query){const n=tf.get(term)??0;if(!n)continue;const idf=Math.log(1+(docs.length-(df.get(term)??0)+0.5)/((df.get(term)??0)+0.5));score+=weight*idf*n*(config.retrieval.k1+1)/(n+config.retrieval.k1*(1-config.retrieval.b+config.retrieval.b*len/avg));}return score;});}
function retrieve(issue,files){
 const query=new Map(tokenize(issue).map(t=>[t,1]));for(const t of tokenize(issue.split(/\r?\n/)[0]))query.set(t,config.retrieval.titleWeight);
 const ordered=[...files].sort((a,b)=>ascii(a.file,b.file));
 const passages=[];for(const [index,f] of ordered.entries()){const lines=f.text.split('\n');for(let start=0;start<lines.length;start+=config.retrieval.strideLines)passages.push({index,start,end:Math.min(lines.length,start+config.retrieval.passageLines),text:f.file+'\n'+lines.slice(start,start+config.retrieval.passageLines).join('\n')});}
 const fscores=rankBM25(ordered.map(f=>({text:f.file+'\n'+f.text})),query),pscores=rankBM25(passages,query);
 const byFile=ordered.map(()=>[]);passages.forEach((p,i)=>byFile[p.index].push({...p,score:pscores[i]}));
 const normalizedIssue=issue.replaceAll('\\','/').toLowerCase();
 return ordered.map((f,i)=>{const p=byFile[i].sort((a,b)=>b.score-a.score||a.start-b.start);const name=f.file.toLowerCase(),module=name.replace(/\.py$/,'').replaceAll('/','.');const base=path.posix.basename(name);const exact=normalizedIssue.includes(name)||normalizedIssue.includes(module);const basename=base!=='__init__.py'&&base.length>5&&normalizedIssue.includes(base);const pathBoost=exact?config.retrieval.exactPathBoost:basename?config.retrieval.basenameBoost:0;return {...f,passages:p,score:config.retrieval.fileWeight*fscores[i]+config.retrieval.passageWeight*(p[0]?.score??0)+pathBoost,pathBoost};}).sort((a,b)=>b.score-a.score||ascii(a.file,b.file)).slice(0,config.candidates).map(f=>{const chosen=[];for(const p of f.passages){if(chosen.every(c=>p.end<=c.start||p.start>=c.end))chosen.push(p);if(chosen.length===config.retrieval.snippetPassages)break;}const lines=f.text.split('\n');const per=Math.floor(config.snippetChars/Math.max(1,chosen.length))-30;const snippet=chosen.sort((a,b)=>a.start-b.start).map(p=>`[lines ${p.start+1}-${p.end}]\n`+lines.slice(p.start,p.end).map((l,i)=>`${p.start+i+1}: ${l}`).join('\n').slice(0,per)).join('\n...\n').slice(0,config.snippetChars);return {file:f.file,sourceHash:hash(f.text),score:f.score,pathBoost:f.pathBoost,snippet};});
}
function clues(issue,files){return {candidatePathMentions:files.filter(f=>issue.includes(f.file)||issue.includes(f.file.replace(/\.py$/,'').replaceAll('/','.'))).map(f=>f.file),explicitAnswerLanguage:/\b(correct (?:answer|file)|answer\s*:|ground.?truth|referenceFiles|gold (?:label|file)|modify\s+\S+\.py|fix (?:is|in)\s+\S+\.py)\b/i.test(issue),patchInIssue:/^diff --git |^@@ .*@@/m.test(issue)};}
async function prepare(){
 assert(!fs.existsSync(at('results','smoke','raw.json'))&&!fs.existsSync(at('results','full','raw.json')),'Preparation is frozen after any provider run; do not tune based on outcomes');
 if(fs.existsSync(at('data','seal.json'))){load();console.log('Experiment 3 is sealed. Preparation will not rebuild or tune it after reference coverage is visible.');return;}
 fs.mkdirSync(at('data'),{recursive:true});let manifest;
 if(fs.existsSync(at('data','manifest.json'))){manifest=read(at('data','manifest.json'));console.log('Using existing frozen manifest; no resampling.');}
 else {
  let acquired;try{acquired=await dataset();validateRows(acquired.rows);}catch(e){save(at('data','preparation-blocker.json'),{status:'blocked',message:String(e.message),next:'Export the official SWE-bench_Lite test split as a JSON array, then node bench.mjs prepare --dataset=C:\\path\\test.json . Required fields: instance_id,repo,base_commit,problem_statement,patch. No fabricated substitutes.'});throw Error('Dataset acquisition blocked. See data/preparation-blocker.json. '+e.message);}
  const chosen=sample(acquired.rows,config.seed,config.count);assert.equal(chosen.length,config.count);assert(new Set(chosen.slice(0,config.fullCount).map(r=>r.repo)).size>=3,'Seeded full sample has fewer than 3 repositories; stop without choosing a favorable replacement');
  save(at('data','dataset.json'),acquired.rows);
  manifest={config,source:acquired.source,datasetHash:hash(acquired.rows),excluded,previousHash:hash(previous),protocolHash:hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8')),createdAt:new Date().toISOString(),tasks:chosen.map((r,i)=>({id:r.instance_id,partition:i<config.fullCount?'full':'smoke',repo:r.repo,baseCommit:r.base_commit,issueHash:hash(r.problem_statement)}))};
  save(at('data','manifest.json'),manifest);fs.writeFileSync(at('data','manifest.sha256'),hash(manifest));
 }
 assert.equal(hash(manifest),fs.readFileSync(at('data','manifest.sha256'),'utf8'));assert.equal(hash(config),hash(manifest.config),'Configuration changed after freeze');
 assert.equal(hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8')),manifest.protocolHash,'Retrieval/runner changed after sampling');assert.equal(hash(previous),manifest.previousHash);
 const rows=read(at('data','dataset.json'));assert.equal(hash(rows),manifest.datasetHash);
 const evidence=[],labels=[],audit=[];
 for(const task of manifest.tasks){
  const r=rows.find(x=>x.instance_id===task.id);
  try{
   const dir=at('cache',r.repo.replace('/','__'));if(!fs.existsSync(dir)){fs.mkdirSync(dir,{recursive:true});git(dir,'init','--bare');git(dir,'remote','add','origin',`https://github.com/${r.repo}.git`);}
   try{git(dir,'cat-file','-e',r.base_commit+'^{commit}');}catch{git(dir,'fetch','--depth=1','origin',r.base_commit);}
   const names=git(dir,'ls-tree','-r','--name-only',r.base_commit).trim().split('\n').filter(production).sort();
   const files=sources(dir,r.base_commit,names);
   const candidates=retrieve(r.problem_statement,files);assert.equal(candidates.length,5,'Fewer than 5 production Python candidates');
   const row={id:task.id,issue:r.problem_statement,candidates};evidence.push(row);
   // Extract reference labels only after candidate ranking and snippets are fixed.
   const ref=references(r.patch);labels.push({id:task.id,referenceFiles:ref});
   audit.push({id:task.id,status:'ready',sourceFiles:names.length,candidateAvailability:candidates.every(c=>names.includes(c.file)),referenceFilesInRepository:ref.filter(f=>names.includes(f)),referenceCandidates:ref.filter(f=>candidates.some(c=>c.file===f)),hasReferenceCandidate:ref.some(f=>candidates.some(c=>c.file===f)),clues:clues(row.issue,candidates),referencePathMention:ref.filter(f=>row.issue.includes(f)),labelCount:ref.length});
   console.log(`${task.id}: ready (${names.length} source files)`);
  }catch(e){if(!labels.some(l=>l.id===task.id))labels.push({id:task.id,referenceFiles:references(r.patch)});audit.push({id:task.id,status:'preparation_failed',error:String(e.message).slice(0,1000)});console.log(`${task.id}: preparation failed; retained in denominator`);}
  save(at('data','evidence.json'),evidence);save(at('data','labels.json'),labels);save(at('data','audit.json'),audit);
 }
 const seal={manifest:hash(manifest),evidence:hash(evidence),labels:hash(labels),audit:hash(audit),code:hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8'))};save(at('data','seal.json'),seal);
 console.log(`Frozen ${manifest.tasks.length} tasks; ${evidence.length} ready. Run dry-run before paid calls.`);
}
function load(){const m=read(at('data','manifest.json')),e=read(at('data','evidence.json')),l=read(at('data','labels.json')),a=read(at('data','audit.json')),s=read(at('data','seal.json'));for(const [k,v] of Object.entries({manifest:m,evidence:e,labels:l,audit:a}))assert.equal(hash(v),s[k],`${k} hash mismatch`);assert.equal(hash(m),fs.readFileSync(at('data','manifest.sha256'),'utf8'));assert.equal(hash(previous),m.previousHash);assert.equal(hash(config),hash(m.config));assert.equal(hash(fs.readFileSync(fileURLToPath(import.meta.url),'utf8')),s.code,'Runner changed after preparation');assert.equal(s.code,m.protocolHash);assert.equal(m.tasks.length,config.count);assert.equal(m.tasks.filter(t=>t.partition==='full').length,config.fullCount);assert.equal(m.tasks.filter(t=>t.partition==='smoke').length,config.smokeCount);assert(!m.tasks.some(t=>excluded.includes(t.id)));assert.equal(new Set(m.tasks.map(t=>t.id)).size,config.count);assert(new Set(m.tasks.filter(t=>t.partition==='full').map(t=>t.repo)).size>=3);for(const x of e){assert.equal(x.candidates.length,5);assert.equal(hash(x.issue),m.tasks.find(t=>t.id===x.id).issueHash);assert.equal(new Set(x.candidates.map(c=>c.file)).size,5);for(const c of x.candidates)assert(c.snippet.length<=config.snippetChars);}return {m,e,l,a,s};}
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
const flagged=a=>Boolean(a?.clues&&(a.clues.explicitAnswerLanguage||a.clues.patchInIssue||a.clues.candidatePathMentions.length));
function coverage(tasks,a){const audit=tasks.map(t=>a.find(x=>x.id===t.id));return {tasks:tasks.length,ready:audit.filter(x=>x?.status==='ready').length,preparationFailures:audit.filter(x=>x?.status!=='ready').length,referenceCandidateHits:audit.filter(x=>x?.hasReferenceCandidate).length,referenceCandidateMisses:audit.filter(x=>x?.status==='ready'&&!x.hasReferenceCandidate).length,clueFlagged:audit.filter(flagged).length};}
function analysisSummary(report){const summary=summarize(report);const covered=report.rows.filter(r=>r.referenceCandidateAvailable);summary.retrieval={tasks:report.rows.length,referenceCandidateHits:covered.length,coverage:covered.length/report.rows.length};summary.conditionalAccuracy=Object.fromEntries(['jev','openai'].map(p=>[p,{hits:covered.filter(r=>r[p].hit).length,denominator:covered.length,accuracy:covered.length?covered.filter(r=>r[p].hit).length/covered.length:null}]));summary.note='Overall accuracy is primary; conditional accuracy diagnoses retrieval. Different fresh tasks mean changes from Experiment 2 cannot be attributed solely to retrieval.';return summary;}
async function run(){
 const {m,e,l,a,s}=load();const smoke=args.includes('--smoke');const tasks=m.tasks.filter(t=>t.partition===(smoke?'smoke':'full'));
 if(args.includes('--dry-run')){const requests=e.map(x=>({id:x.id,...bodies(x)}));save(at('data','dry-run-requests.json'),requests);const report={experiment:3,full:coverage(m.tasks.filter(t=>t.partition==='full'),a),smoke:coverage(m.tasks.filter(t=>t.partition==='smoke'),a),repositories:[...new Set(tasks.map(t=>t.repo))],previousTaskOverlap:m.tasks.filter(t=>excluded.includes(t.id)).length,smokeFullOverlap:0,manifestHash:s.manifest,apiCalls:0};save(at('data','dry-run-report.json'),report);console.log(JSON.stringify(report,null,2));return;}
 for(const k of ['OPENAI_API_KEY','TYPESAFE_API_KEY'])assert(process.env[k],`${k} is missing; no calls made`);
 const mode=smoke?'smoke':'full',dir=at('results',mode);fs.mkdirSync(dir,{recursive:true});const lock=fs.openSync(at('run.lock'),'wx');
 try{
  assert(!fs.existsSync(path.join(dir,'raw.json')),'This mode already has a report. Refusing to silently rerun or overwrite.');
  const report={experiment:3,mode,startedAt:new Date().toISOString(),manifestHash:s.manifest,seal:s,config,notes:['No retries; serial requests; order alternates by frozen index.','Latency includes response body transfer and parsing; successful and paired summaries only. Failures retained in accuracy denominator.','Provider defaults may be stochastic. No token or cost imputation. Public cases may be memorized.','Smoke uses two reserved tasks, disjoint from the 40 full-run tasks. Do not tune based on smoke or coverage outcomes.'],rows:tasks.map((t,i)=>({id:t.id,repo:t.repo,referenceCandidateAvailable:Boolean(a.find(x=>x.id===t.id)?.hasReferenceCandidate),clueFlagged:flagged(a.find(x=>x.id===t.id)),order:i%2?['openai','jev']:['jev','openai'],jev:{status:'unattempted',hit:false},openai:{status:'unattempted',hit:false}}))};
  const persist=()=>{save(path.join(dir,'raw.json'),JSON.parse(redact(report)));save(path.join(dir,'summary.json'),analysisSummary(report));};persist();
  for(const row of report.rows){const evidence=e.find(x=>x.id===row.id);if(!evidence){for(const p of row.order)row[p]={status:'preparation_failed',hit:false};persist();continue;}
   const requests=bodies(evidence);
   for(const p of row.order){row[p]={status:'interrupted_or_inflight',hit:false,request:requests[p]};persist();row[p]=await call(p,requests[p],evidence);row[p].hit=row[p].status==='ok'&&l.find(x=>x.id===row.id).referenceFiles.includes(row[p].file);persist();console.log(`${row.id} ${p}: ${row[p].status}`);}
  }
  report.completedAt=new Date().toISOString();persist();console.log(JSON.stringify(analysisSummary(report),null,2));
 }finally{fs.closeSync(lock);fs.unlinkSync(at('run.lock'));}
}
function selftest(){const rows=Array.from({length:100},(_,i)=>({instance_id:'r-'+i}));assert.deepEqual(sample(rows,'seed',40),sample(rows.reverse(),'seed',40));const e={issue:'issue',candidates:Array.from({length:5},(_,i)=>({file:`p${i}.py`,snippet:'code'}))};const b=bodies(e);assert(!JSON.stringify(b).includes('referenceFiles'));for(const c of Object.values(b.jev.questions.file.criteria))assert(b.openai.messages[1].content.includes(c));assert(clues('correct answer: x',[]).explicitAnswerLanguage);assert.deepEqual(references('+++ b/src/a.py\n+++ b/tests/test_a.py'),['src/a.py']);assert.equal(summarize({mode:'test',rows:[{jev:{status:'timeout',hit:false},openai:{status:'ok',hit:true,latencyMs:10}}]}).providers.jev.denominator,1);console.log('Self-test passed: deterministic selection, prompt parity, clue detection, label extraction, failure denominator.');}
try{if(command==='prepare')await prepare();else if(command==='run')await run();else if(command==='self-test')selftest();else throw Error('Use: node bench.mjs prepare [--dataset=C:\\path\\test.json] | run --dry-run | run --smoke | run | self-test');}catch(e){console.error(redact(e.message));process.exitCode=1;}
