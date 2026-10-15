import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),at=n=>path.join(root,n);
const inputs=JSON.parse(fs.readFileSync(at('requests.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(at('baseline.json'),'utf8'));
const args=process.argv.slice(2);
console.log('Baseline top-one: 3/5; top-five: 4/5. Context selection only; no OpenAI calls.');
if(!args.includes('--jev')){console.log(`Prepared ${inputs.length} Jev requests, ${inputs.reduce((s,c)=>s+Buffer.byteLength(JSON.stringify(c.body)),0)} total request bytes. No calls made. Use --jev for one paid Jev pass.`);process.exit(0);}
if(!process.env.TYPESAFE_API_KEY){console.error('Set TYPESAFE_API_KEY in this PowerShell session. Do not paste it into chat.');process.exit(1);}
let lock;
const output=at('jev-results.json');
try{
 lock=fs.openSync(at('run.lock'),'wx');
 if(fs.existsSync(output))throw Error('A run already exists; refusing paid repeats. Inspect jev-results.json.');
 const report={kind:'jev-localization-pilot',rows:[],apiAttempts:0,openaiCalls:0};
 const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));save();
 for(const input of inputs){
  const row={id:input.id,status:'reserved',hit:false};report.rows.push(row);report.apiAttempts++;save();
  const start=performance.now();
  try{
   const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${process.env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(input.body),signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw Error('Jev HTTP '+r.status);
   const data=await r.json();const choice=data.answers?.file?.choice;
   if(!Object.hasOwn(input.body.questions.file.criteria,choice))throw Error('Invalid file choice');
   row.file=input.files[Number(choice.slice(1))];row.usage=data.usage;row.model=data.model;row.status='completed';
   // Historical reference is used for evaluation only, after the API response.
   row.hit=baseline.rows.find(b=>b.id===input.id).referenceFiles.includes(row.file);
  }catch(e){row.status='failed';row.error=String(e.message).split(process.env.TYPESAFE_API_KEY).join('[redacted]');}
  row.requestMs=performance.now()-start;save();console.log(`${row.id}: ${row.file||row.error} | ${row.hit?'REFERENCE HIT':'MISS/FAIL'}`);
  if(row.status==='failed'){console.log('Stopping after failure to avoid wasting credits; no retries. Remaining cases are unattempted.');break;}
 }
 report.baselineHits=baseline.summary.topOneHits;report.jevHits=report.rows.filter(r=>r.hit).length;report.totalCases=inputs.length;report.unattempted=inputs.length-report.rows.length;report.note='File-selection proxy only. Includes easy cases and retrieval misses. A higher score is preliminary; no coding correctness or speed improvement established. Old public benchmark cases may be memorized.';save();
 console.log(`Baseline ${report.baselineHits}/5; Jev ${report.jevHits} reference hits, ${report.unattempted} unattempted. No OpenAI credits used. Report: ${output}`);
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(at('run.lock'));}}
