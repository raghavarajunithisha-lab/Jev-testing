# Experiment 2 — frozen file-localization comparison

Requires Node 22+ and Git. Uses only built-in Node modules. Experiment 1 is read only and is not imported at runtime. No website, package installation, or automatic paid calls.

```powershell
cd D:\Projects\Jev-testing\experiment-2
node .\bench.mjs self-test
node .\bench.mjs prepare
node .\bench.mjs run --dry-run
node .\bench.mjs run --smoke
node .\bench.mjs run
```

`prepare` downloads the official SWE-bench Lite test split, selects 40 distinct tasks by a fixed SHA-256 seed ordering, and freezes manifest.json plus its hash BEFORE fetching repository code or calling either provider. Five original pytest IDs are excluded. Selection is uniform by deterministic hash over tasks, not balanced by repository; at least three repositories are required or preparation stops. No outcome, label, retrieval success, or clue is used to select or replace tasks. Git shallow-fetches the exact base commits into separate bare caches; repository code is never executed. The dataset revision and cached content hash are recorded. HF viewer cannot pin a revision, so the exact downloaded JSON hash is the replay identity; the repository revision is checked before/after acquisition. Preserve data and manifest to reproduce the sample. This is public historical data, so provider training contamination cannot be ruled out.

Retrieval considers all production Python files (documented test/docs/example exclusions). Five candidates are ranked using the issue and pre-fix source only. Snippets are deterministic, line numbered, bounded to 3,000 characters per candidate, and centered around the best lexical matching line. This is a deliberately fixed lexical baseline, not oracle retrieval. Identical issue/candidate text reaches both providers in their existing schemas. The shared instruction is fixed; OpenAI additionally receives a JSON output instruction. Full prompt bodies are saved in dry-run and raw reports. The historical patch, test patch, hints, expected failures and reference-file labels are never provider inputs. Labels are extracted from the production-file patch paths and used only in audits and post-response scoring.

`data/audit.json` checks real candidate availability at the base commit, whether reference files exist and appear among candidates, literal reference/candidate path clues, solution-like answer language, and embedded patches. Clues are flagged, not automatically removed or resampled; this avoids selecting easier/favorable cases. These heuristics do not prove the absence of answer clues. Inspect the audit before calls. A candidate miss or label outside the defined Python universe stays in the primary denominator; preparation failures also stay in it. There is no label-based injection of the correct file. Tasks without production Python labels are unscorable and conservatively counted as misses; labelCount exposes them.

Dry-run makes zero provider calls and writes requests for review. Smoke makes up to four provider calls on the first two frozen tasks. Full makes up to 80 calls; it reuses smoke tasks with fresh calls and separate reports. Do not change prompts, seed, candidate selection, or task selection after smoke. Hash checks bind the manifest, evidence, labels, audit, configuration and runner. Preparation is blocked after a provider report exists. No automatic retries, silent cache reuse, or overwrites. If interrupted, raw.json marks in-flight and unattempted entries. A leftover run.lock signals interruption; preserve reports and inspect them before manually removing it. There is intentionally no automatic paid resume/repeat command.

Provider order alternates Jev/OpenAI, then OpenAI/Jev, sequentially. Both have 60-second deadlines. Reports retain HTTP errors, timeouts, malformed answers, invalid candidate choices, network errors and preparation failures. Each result stores raw body, request body, returned model, request ID, HTTP status, usage and cost if returned. Latency includes complete response transfer and parsing. No token/cost estimates are fabricated; absent values are null. Accuracy includes every selected task; latency summaries use successful responses and explicitly paired successes. Failed attempts retain their elapsed latency in raw.json. Summary latency is not a claim about software repair speed. The models may have different internal compute budgets and nondeterministic defaults.

Outputs: `results/smoke/raw.json`, `results/smoke/summary.json`, `results/full/raw.json`, `results/full/summary.json`. Reports are incrementally saved after each attempt. Usage is provider native, without invented normalization; invoice costs require your account's actual pricing.

Keys are read only from process environment; no .env is loaded. Request headers are never saved. Known environment key strings are redacted from report/error text. Do not paste keys into chat. If needed, enter them in this PowerShell session:

```powershell
$secret = Read-Host 'OpenAI API key' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
$secret = Read-Host 'Jev / Typesafe API key' -AsSecureString
$env:TYPESAFE_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
```

If automatic dataset acquisition fails, `data/preparation-blocker.json` records the blocker; no tasks/results are invented. Export the official dataset's full test split as a JSON array (not JSONL), preserving instance_id, repo, base_commit, problem_statement and patch. With Python and the Hugging Face datasets package already available, the following preparation-only export is one option:

```powershell
python -c "from datasets import load_dataset; import json; d=load_dataset('princeton-nlp/SWE-bench_Lite', split='test'); json.dump(list(d),open('swebench-lite-test.json','w',encoding='utf-8'),ensure_ascii=False)"
node .\bench.mjs prepare --dataset=.\swebench-lite-test.json
node .\bench.mjs run --dry-run
```

An imported file's hash is recorded; local provenance must be independently checked. Repository fetch failures are retained without replacement. Re-running prepare before any provider calls retries the same frozen tasks, never draws new ones. For exact replay preserve all frozen files, cache, runner and source JSON.

Official source: https://huggingface.co/datasets/princeton-nlp/SWE-bench_Lite
