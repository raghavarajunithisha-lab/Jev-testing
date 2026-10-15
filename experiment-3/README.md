# Experiment 3: fresh tasks and stronger retrieval

Separate CLI-only benchmark. Requires Node 22+ and Git; no npm packages. Experiments 1 and 2 are not modified. No repository code is executed.

## Run in PowerShell

```powershell
cd D:\Projects\Jev-testing\experiment-3
node .\test.mjs
node .\bench.mjs prepare
node .\bench.mjs run --dry-run
node .\bench.mjs run --smoke
node .\bench.mjs run
```

Preparation and dry-run make zero paid provider calls. Smoke makes up to four calls on two reserved tasks. Full makes up to 80 calls on 40 different tasks. Both API keys must already be in this PowerShell process environment. No .env file is read; secrets are never printed or saved as headers. If needed:

```powershell
$secret = Read-Host 'OpenAI API key' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
$secret = Read-Host 'Jev / Typesafe API key' -AsSecureString
$env:TYPESAFE_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
```

## Preregistered design

- Dataset: official SWE-bench Lite test split. Reuse the exact Experiment 2 cached JSON read-only, checking its content hash against previous-experiment.json. Preserve source provenance in the new manifest. If the snapshot is unavailable, automatic download or an explicit local JSON export is supported.
- Exclude all 40 Experiment 2 IDs and the original five pytest IDs. Sample 42 distinct tasks by ascending SHA-256(seed + NUL + instance_id), with ASCII tie comparison. Seed: jev-experiment-3-v1. First 40 are the full benchmark; last two are reserved for smoke. Full must span at least three repositories, otherwise preparation stops without choosing another seed.
- Freeze IDs, partitions, configuration, previous-experiment hash, dataset hash and runner-code hash before source retrieval or reference-file auditing. No seed search, task replacement, oracle candidate injection, or label-based tuning. Successful preparation seals the evidence/audit/labels; subsequent prepare commands validate rather than rebuild it. A code change after manifest freeze is rejected.
- Both providers receive the same complete issue and the same five file paths/snippets. Keep the Experiment 2 shared instruction, models, 3,000-character per-file limit and 60-second deadlines. Use Jev systemone and OpenAI chat completions with JSON output in their compatible schemas. Provider defaults remain recorded as defaults rather than pretending to match internal compute.
- Alternate provider order across frozen tasks. No automatic retries or cached response reuse. Store raw requests/responses, HTTP status, request ID, chosen file, validity, reference overlap, latency, returned model, native usage and cost when present. Missing usage/cost is not imputed.

## Retrieval method fixed before the new audit

Read all production Python source blobs from the exact base commit. Exclude test/testing/docs/examples/benchmark directories and test-prefixed files, consistently with Experiment 2. No issue labels, patches, hints, failure labels or post-fix code enter retrieval or provider prompts.

Tokenization keeps original snake_case identifiers, adds underscore components, splits camelCase, lowercases and removes a fixed stopword set in bench.mjs. Query terms have weight 1; terms in the issue's first line have weight 2. BM25 uses k1=1.2 and b=0.75 over both full-file documents and 60-line passages with 30-line stride. Each document includes its source path. File ranking is 0.35 times full-file BM25 plus 0.65 times its highest passage score. An exact path or dotted-module mention in the issue adds 20; a nontrivial filename mention adds 4 when no exact path/module matches. Equal scores break by ASCII source path.

Take the top five files. For each, extract at most two highest-scoring, non-overlapping passages; line-number them, order them by source position and truncate to a total of 3,000 characters per file. Reference labels are extracted only after the candidates/snippets for that task are fixed. These fixed heuristics are intended to improve retrieval; no improvement is assumed or guaranteed.

## Audit and interpretation

`data/audit.json` records actual candidate availability, reference existence, reference coverage and answer-clue heuristics. All retrieval misses and preparation failures remain in the full denominator. Clue flags are descriptive; they are not a reason to resample. Absence of flags does not prove absence of clues. Public historical cases can have appeared in training data.

Primary accuracy: reference-file hits divided by all 40 full tasks. Secondary diagnostic: hits divided by tasks with a reference candidate. Summary reports include candidate coverage and both accuracy measures. Report latency on valid responses and paired valid responses, with failures/timeouts separately retained. No software fixes are generated or tested, so results measure file localization only.

The new tasks differ from Experiment 2. A difference in coverage or accuracy cannot by itself be attributed solely to the retrieval change. This is a fresh evaluation after a development decision informed by Experiment 2, not proof that the providers never saw these public tasks. Do not tune after reading this experiment's audit or smoke output.

## Files and interruptions

`data/manifest.json`, `manifest.sha256`, `seal.json`: frozen design and integrity checks.

`data/evidence.json`: label-free issue/candidate evidence. `data/labels.json`: scoring labels kept out of requests. `data/audit.json`: availability and clue checks. `data/dry-run-requests.json`: complete provider request previews. `data/dry-run-report.json`: coverage and zero-call validation.

`results/smoke/raw.json` and `summary.json`: two reserved smoke tasks. `results/full/raw.json` and `summary.json`: 40 full tasks. Reports save after each attempt and cannot be silently overwritten. A leftover run.lock indicates interruption. Preserve all reports and inspect statuses before manually removing a stale lock; there is no automatic paid resume/repeat command.

If automatic acquisition fails, inspect `data/preparation-blocker.json`. Export the official test split to a JSON array with instance_id, repo, base_commit, problem_statement and patch, then run:

```powershell
node .\bench.mjs prepare --dataset=C:\path\swebench-lite-test.json
```

Local-export provenance must be independently verified. Never invent tasks or substitute favorable outcomes. Repository-fetch failures are recorded without replacement. Retry interrupted preparation only with the same frozen protocol; once sealed, preparation is read-only.
