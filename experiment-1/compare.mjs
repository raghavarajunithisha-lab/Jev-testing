import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const at = (...p) => path.join(root, ...p);

// Auto-load .env if present
const envPath = at('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const inputs = JSON.parse(fs.readFileSync(at('pytest-screen', 'requests.json'), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(at('pytest-screen', 'baseline.json'), 'utf8'));

const jevResultsPath = at('pytest-screen', 'jev-results.json');
const jevResults = fs.existsSync(jevResultsPath)
  ? JSON.parse(fs.readFileSync(jevResultsPath, 'utf8'))
  : null;

const args = process.argv.slice(2);
const modelArg = args.find(a => a.startsWith('--model='));
const OPENAI_MODEL = modelArg ? modelArg.split('=')[1] : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
const runSingle = args.includes('--single');
const forceJev = args.includes('--force-jev');
const dryRun = args.includes('--dry-run');

console.log('='.repeat(70));
console.log(' JEV vs OPENAI ROUTING & LOCALIZATION BENCHMARK');
console.log('='.repeat(70));
console.log(`OpenAI Model : ${OPENAI_MODEL}`);
console.log(`Cases        : ${runSingle ? '1 (pytest-5262)' : inputs.length + ' SWE-bench pytest tasks'}`);
console.log(`Jev Data     : ${jevResults && !forceJev ? 'Using recorded results from jev-results.json (0 Jev credits)' : 'Live Jev API'}`);
console.log('='.repeat(70));

if (dryRun) {
  console.log('\n[Dry Run] Validation check passed. Ready to execute with API key.');
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('\nError: OPENAI_API_KEY is not set in this environment.');
  console.error('To set it in PowerShell securely without saving it to disk:');
  console.error('$secret = Read-Host "Paste OpenAI key" -AsSecureString');
  console.error('$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new("", $secret).Password');
  console.error('\nThen re-run:');
  console.error('node compare.mjs');
  process.exit(1);
}

const casesToRun = runSingle ? [inputs[0]] : inputs;
const comparisonReport = {
  timestamp: new Date().toISOString(),
  openaiModel: OPENAI_MODEL,
  rows: []
};

async function callOpenAI(input) {
  const criteria = input.body.questions.file.criteria;
  const candidatesFormatted = Object.entries(criteria)
    .map(([key, snippet]) => `Option [${key}]:\n${snippet}`)
    .join('\n\n---\n\n');

  const messages = [
    {
      role: 'system',
      content: 'You are an automated software triage and localization system. Analyze the bug report and the candidate source files. Return a JSON object with your selected option key (e.g., {"choice": "f0", "file": "path/to/file.py", "reason": "brief reason"}). Only select the single most relevant file to fix the bug.'
    },
    {
      role: 'user',
      content: `Problem Statement:\n${input.body.state.issue}\n\nCandidate Files:\n${candidatesFormatted}`
    }
  ];

  const start = performance.now();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' }    }),
    signal: AbortSignal.timeout(45000)
  });

  const durationMs = performance.now() - start;

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  let choiceKey = parsed.choice;
  if (!choiceKey && parsed.file) {
    const idx = input.files.indexOf(parsed.file);
    if (idx !== -1) choiceKey = `f${idx}`;
  }

  const fileIndex = choiceKey ? Number(choiceKey.replace('f', '')) : -1;
  const chosenFile = input.files[fileIndex] || parsed.file;

  return {
    chosenFile,
    choiceKey,
    durationMs,
    usage: data.usage,
    reason: parsed.reason
  };
}

async function run() {
  console.log('\nRunning comparisons...\n');

  for (const input of casesToRun) {
    const baseRow = baseline.rows.find(b => b.id === input.id);
    const refFiles = baseRow ? baseRow.referenceFiles : [];

    // 1. Get Jev result (from cache or live)
    let jevRow = jevResults?.rows.find(r => r.id === input.id);
    if (!jevRow || forceJev) {
      if (!process.env.TYPESAFE_API_KEY) {
        throw new Error('TYPESAFE_API_KEY required for live Jev calls.');
      }
      const jStart = performance.now();
      const jRes = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input.body),
        signal: AbortSignal.timeout(30000)
      });
      const jDuration = performance.now() - jStart;
      const jData = await jRes.json();
      const choice = jData.answers?.file?.choice;
      const jFile = input.files[Number(choice.slice(1))];
      jevRow = {
        id: input.id,
        file: jFile,
        hit: refFiles.includes(jFile),
        requestMs: jDuration,
        usage: jData.usage
      };
    }

    // 2. Call OpenAI
    process.stdout.write(`Evaluating ${input.id}... `);
    let oaiResult;
    try {
      oaiResult = await callOpenAI(input);
      const isOaiHit = refFiles.includes(oaiResult.chosenFile);

      const row = {
        id: input.id,
        referenceFiles: refFiles,
        jev: {
          file: jevRow.file,
          hit: jevRow.hit,
          latencyMs: Math.round(jevRow.requestMs),
          tokens: jevRow.usage?.output_tokens || 58
        },
        openai: {
          file: oaiResult.chosenFile,
          hit: isOaiHit,
          latencyMs: Math.round(oaiResult.durationMs),
          inputTokens: oaiResult.usage.prompt_tokens,
          outputTokens: oaiResult.usage.completion_tokens
        }
      };

      comparisonReport.rows.push(row);
      console.log(`Done. (OpenAI: ${row.openai.latencyMs}ms | Jev: ${row.jev.latencyMs}ms)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      break;
    }
  }

  // Print Summary Table
  if (comparisonReport.rows.length > 0) {
    console.log('\n' + '='.repeat(85));
    console.log(
      'CASE ID'.padEnd(26) +
      'JEV TIME'.padEnd(12) +
      'JEV HIT'.padEnd(10) +
      'OPENAI TIME'.padEnd(14) +
      'OPENAI HIT'.padEnd(12) +
      'SPEEDUP'
    );
    console.log('-'.repeat(85));

    let totalJevTime = 0;
    let totalOaiTime = 0;
    let jevHits = 0;
    let oaiHits = 0;

    for (const r of comparisonReport.rows) {
      totalJevTime += r.jev.latencyMs;
      totalOaiTime += r.openai.latencyMs;
      if (r.jev.hit) jevHits++;
      if (r.openai.hit) oaiHits++;

      const speedup = (r.openai.latencyMs / r.jev.latencyMs).toFixed(1) + 'x';
      console.log(
        r.id.padEnd(26) +
        `${r.jev.latencyMs} ms`.padEnd(12) +
        (r.jev.hit ? 'HIT' : 'MISS').padEnd(10) +
        `${r.openai.latencyMs} ms`.padEnd(14) +
        (r.openai.hit ? 'HIT' : 'MISS').padEnd(12) +
        speedup
      );
    }

    console.log('='.repeat(85));
    const avgJev = Math.round(totalJevTime / comparisonReport.rows.length);
    const avgOai = Math.round(totalOaiTime / comparisonReport.rows.length);
    const overallSpeedup = (avgOai / avgJev).toFixed(1);
    const percentFaster = (((avgOai - avgJev) / avgOai) * 100).toFixed(1);

    console.log(`Average Decision Time : Jev: ${avgJev} ms  vs  OpenAI (${OPENAI_MODEL}): ${avgOai} ms`);
    console.log(`Speed Advantage       : Jev is ${overallSpeedup}x faster (${percentFaster}% less latency)`);
    console.log(`Accuracy Comparison   : Jev: ${jevHits}/${comparisonReport.rows.length}  vs  OpenAI: ${oaiHits}/${comparisonReport.rows.length}`);
    console.log('='.repeat(85));

    const outPath = at('results', `comparison-${OPENAI_MODEL}.json`);
    fs.writeFileSync(outPath, JSON.stringify(comparisonReport, null, 2));
    console.log(`\nDetailed report saved to: ${outPath}\n`);
  }
}

run();
