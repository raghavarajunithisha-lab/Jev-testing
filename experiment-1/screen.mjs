import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),at=(...p)=>path.join(root,...p);
const cases=JSON.parse(fs.readFileSync(at('cases.json'),'utf8'));
const stop=new Set(['the','in','a','an','to','of','for','and','with','fix','handle','support']);
const words=s=>(s.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!stop.has(w)).map(w=>w.length>4?w.replace(/s$/,''):w);
function retrieve(c){
 const {docs}=JSON.parse(fs.readFileSync(at('data',c.number+'.json'),'utf8'));
 const query=[...new Set(words(c.query))],indexed=docs.map(d=>({...d,tokens:words(d.file+' '+d.text)}));
 const avg=indexed.reduce((s,d)=>s+d.tokens.length,0)/indexed.length;
 const df=Object.fromEntries(query.map(w=>[w,indexed.filter(d=>d.tokens.includes(w)).length]));
 for(const d of indexed){const counts=new Map();for(const w of d.tokens)counts.set(w,(counts.get(w)||0)+1);d.score=query.reduce((s,w)=>{const n=counts.get(w)||0;return s+Math.log(1+(indexed.length-df[w]+.5)/(df[w]+.5))*n*2.2/(n+1.2*(.25+.75*d.tokens.length/avg));},0);}
 return indexed.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,5);
}
function summary(d,query){const q=new Set(words(query));const lines=d.text.split('\n');const ranked=lines.map((line,i)=>({i,score:words(line).filter(w=>q.has(w)).length})).sort((a,b)=>b.score-a.score||a.i-b.i);const selected=new Set();for(const {i} of ranked.slice(0,4))for(let j=Math.max(0,i-2);j<Math.min(lines.length,i+4);j++)selected.add(j);return [...selected].sort((a,b)=>a-b).map(i=>lines[i]).join('\n').slice(0,1800);}
fs.mkdirSync(at('results'),{recursive:true});
const save=(name,value)=>fs.writeFileSync(at('results',name),JSON.stringify(value,null,2));
const rows=cases.map(c=>{const list=retrieve(c);return {case:c.number,url:c.url,query:c.query,baseline:list[0].file,referenceFiles:c.referenceFiles,hit:c.referenceFiles.includes(list[0].file),referenceInTop5:list.some(d=>c.referenceFiles.includes(d.file)),candidates:list.map(d=>({file:d.file,score:d.score}))};});
const report={kind:'offline-context-screen',apiCalls:0,rows,hits:rows.filter(r=>r.hit).length,total:rows.length,metric:'Top-one overlap with historical changed source files; a localization proxy, not fix correctness.'};
save('baseline.json',report);
for(const r of rows)console.log(`#${r.case}: ${r.baseline} | ${r.hit?'REFERENCE HIT':'MISS'} | ${r.query}`);
console.log(`Local search: ${report.hits}/${report.total}. No OpenAI calls are supported by this project.`);
if(!process.argv.includes('--jev')){console.log('Free screen complete. No API calls.');process.exit(0);}
if(report.hits===report.total){console.log('STOP: baseline already achieves maximum top-one accuracy on this sample. Skipping all Jev requests to avoid unnecessary charges.');process.exit(0);}
if(!process.env.TYPESAFE_API_KEY){console.error('TYPESAFE_API_KEY is missing. No API calls.');process.exit(1);}
// A fixed sample is evaluated in full, including baseline successes. Never cherry-pick misses.
const ledgerPath=at('results','jev-calls.json');
let ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):[];
if(ledger.length){console.error('This screening sample has already been attempted. No automatic paid repeats.');process.exit(1);}
let lock;
try{
 lock=fs.openSync(at('results','jev.lock'),'wx');
 if(fs.existsSync(ledgerPath)&&JSON.parse(fs.readFileSync(ledgerPath,'utf8')).length)throw Error('Sample already attempted');
 for(const c of cases){
  const list=retrieve(c),criteria=Object.fromEntries(list.map((d,i)=>['f'+i,d.file+'\n'+summary(d,c.query)]));
  const body={model:'jev-latest',state:{issue:c.query},questions:{file:{type:'choice',instructions:'Select the source file most relevant to investigating this reported behavior.',criteria}}};
  const row={case:c.number,status:'reserved'};ledger.push(row);save('jev-calls.json',ledger);
  const start=performance.now();
  try{
   const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${process.env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Jev HTTP '+response.status);
   const result=await response.json(),choice=result.answers?.file?.choice;
   if(!Object.hasOwn(criteria,choice))throw Error('Invalid choice');
   row.file=list[Number(choice.slice(1))].file;row.hit=c.referenceFiles.includes(row.file);row.model=result.model;row.usage=result.usage;row.status='completed';
  }catch(e){row.status='failed';row.error=e.name==='TimeoutError'?'Timeout':String(e.message).split(process.env.TYPESAFE_API_KEY).join('[redacted]');}
  row.ms=performance.now()-start;save('jev-calls.json',ledger);console.log(row);
 }
 console.log('Screening only: even better localization would require fresh held-out coding tasks before claiming coding benefit. Jev billing is separate; no OpenAI credits used.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(lock!==undefined){fs.closeSync(lock);fs.unlinkSync(at('results','jev.lock'));}}
