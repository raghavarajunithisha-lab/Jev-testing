import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw Error('No indexed files. Stage the intended publication files first.');
const forbidden=/(^|\/)(?:data|cache|results|node_modules)\/|(^|\/)\.env(?:\.|$)|(^|\/)(?:raw|labels|dry-run-requests)\.json$|^experiment-1\/(?:cases\.json|pytest-screen\/[^/]+\.json)$|\.(?:pem|key|pfx|p12)$/i;
// The exact literal synthetic-secret is a deliberately fake credential in offline tests.
const patterns=[/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/gh[pousr]_[A-Za-z0-9]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/(?:OPENAI_API_KEY|TYPESAFE_API_KEY)\s*[:=]\s*["'](?!synthetic-secret["'])[A-Za-z0-9_-]{12,}/,/[A-Z]:[\\/]Users[\\/][^\s"'<>]+/i];
const problems=[];
for(const file of files){if(forbidden.test(file)){problems.push({file,reason:'prohibited generated/secret path'});continue;}const content=execFileSync('git',['show',':'+file],{cwd:root,maxBuffer:10*1024*1024});if(content.length>5*1024*1024)problems.push({file,reason:'unexpectedly large publication file'});const text=content.toString('utf8');if(patterns.some(p=>p.test(text)))problems.push({file,reason:'possible credential or personal absolute path; inspect privately'});}
for(const exp of [2,3]){const proof=JSON.parse(execFileSync('git',['show',`:reports/experiment-${exp}/integrity.json`],{cwd:root,encoding:'utf8'}));const runner=execFileSync('git',['show',`:experiment-${exp}/bench.mjs`],{cwd:root});const hash=crypto.createHash('sha256').update(runner).digest('hex');if(hash!==proof.runnerSHA256)problems.push({file:`experiment-${exp}/bench.mjs`,reason:'indexed runner bytes differ from the frozen run'});}
if(problems.length){console.error(JSON.stringify(problems,null,2));process.exitCode=1;}else console.log(`PASS: ${files.length} indexed files checked; no prohibited generated paths, common credential patterns or personal absolute paths detected. No secret values printed.`);
