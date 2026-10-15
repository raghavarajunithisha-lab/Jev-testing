# Experiment 3: stronger search on a fresh set of problems

Experiment 3 tests the same file-choice idea as Experiment 2, using a revised search method and different problems. **Search builds five candidates; Jev and OpenAI independently choose one.** Neither service writes or tests a fix.

Read [the completed analysis](../reports/experiment-3/analysis.md) if you want the findings without running code or paying for new calls.

## Why this experiment exists

Experiment 2's search missed every historical reference file on 23 of 40 tasks. A selector could not recover a reference that was not offered.

For Experiment 3, the search design was changed first. It looks at both entire files and shorter passages, accounts for how distinctive matching words are, and gives extra weight to source paths explicitly mentioned in the issue. The method is called **BM25**, a word-based search scoring method.

The new problem list, search settings, and runner were fixed before checking reference coverage. No task was replaced and no reference file was inserted to make results better. Because the tasks also changed, a score difference from Experiment 2 cannot be attributed solely to the new search method.

## What was selected

| Group | Size | Purpose |
|---|---:|---|
| Full benchmark | 40 problems across nine repositories | Main Jev/OpenAI comparison |
| Smoke check | 2 additional problems | Check that both services accept requests |

All 42 tasks exclude the 40 Experiment 2 tasks and the original five pytest cases. The two smoke tasks are **not included in the 40 full tasks**. You do not need to run Experiment 2 first.

## Recorded result

| Measure | Jev | OpenAI gpt-6-astra |
|---|---:|---:|
| Correct choices across all 40 problems | 28/40 (70%) | 30/40 (75%) |
| Correct choices when a reference was offered | 28/31 (90.3%) | 30/31 (96.8%) |
| Valid responses | 40/40 | 40/40 |
| Average response time | 270.2 ms | 2,971.6 ms |
| Median response time | 191.1 ms | 2,490.5 ms |

Search offered a historical reference on 31/40 problems. The other nine stay in overall accuracy. Jev was faster on every task, with about 11 times lower average latency, while OpenAI scored two more hits. Simply taking search's first candidate would have scored 22/40; that is an additional after-run diagnostic, not a replacement primary result.

Fourteen problems triggered path/module clue checks. None triggered the explicit-answer-language or embedded-patch checks. Excluding flagged tasks as a sensitivity check gives Jev 17/26 and OpenAI 18/26; the main results still include all 40 tasks. Natural paths in an issue are not by themselves proof of improper label leakage.

These results do not prove equal accuracy, a reliable general accuracy gap, or successful bug fixes. Public historical tasks may have appeared in training. The [analysis](../reports/experiment-3/analysis.md) lists disagreements, repository results, order groups, and available usage. Neither provider returned dollar costs for this run.

## How one task travels through the program

1. Use the saved problem ID and original source revision from the manifest.
2. Read eligible Python source files as text from that revision. Do not execute the public project.
3. Search files and passages using issue/source evidence only.
4. Keep five candidates and at most 3,000 excerpt characters for each.
5. Build a Jev choice request and an OpenAI JSON-choice request with matching evidence.
6. Call the services in alternating order; accept only a valid option key.
7. Record the reply and timing, then score reference-file overlap. Keep failures and missing-answer cases in the results.

The historical solution patch, test labels, and reference-file paths are not sent to the services or used to choose candidates. In this program, each task's reference labels are extracted after its candidates and excerpts have been fixed.

## File guide

| File or folder | What it does |
|---|---|
| `README.md` | This plain-language guide |
| `bench.mjs` | Main program: task selection, search, request building, calls, checks, and reports |
| `test.mjs` | Offline checks using synthetic inputs/responses; no paid calls |
| `previous-experiment.json` | Experiment 2's task IDs and dataset identity, used to exclude previous tasks and verify the reused snapshot; no previous scores |
| `.gitignore` | Extra local files this experiment does not publish |
| `cache/` — local only | Public source snapshots fetched at exact pre-fix revisions |
| `data/` — local only | Prepared task inputs, separate labels, readiness checks, and previews |
| `results/` — local only | Original small-check and full-run reports |
| [`../reports/experiment-3/`](../reports/experiment-3/) | Published task list, summary, safe outcomes, checks, and analysis |

### Local `data/` files

| File | Plain-language meaning |
|---|---|
| `dataset.json` | Official downloaded problem records |
| `manifest.json` | Saved task list, full/smoke split, source revisions, settings, and protocol fingerprint |
| `manifest.sha256` | Fingerprint used to detect manifest changes |
| `evidence.json` | Problem text and the five candidates; no reference-label fields |
| `labels.json` | Historical expected file paths, kept separate from service evidence |
| `audit.json` | Checks real candidate availability, reference coverage, and possible answer clues |
| `seal.json` | Fingerprints linking the runner and prepared files |
| `dry-run-requests.json` | Full generated request previews, without Authorization headers |
| `dry-run-report.json` | Readiness counts, sample-overlap checks, coverage, and zero-call confirmation |
| `preparation-blocker.json` | Written if automatic dataset acquisition is blocked |

`results/smoke/raw.json` and `summary.json` contain the two-task smoke check. `results/full/raw.json` and `summary.json` contain the 40-task comparison. The raw file stores individual request/response details; the summary stores scores, coverage, conditional accuracy, and timing statistics. Raw files stay local; reviewed public copies omit original request bodies and source excerpts.

A temporary `run.lock` prevents overlapping runs. An interrupted process can leave it behind; preserve reports and verify that no run is active before investigating a stale lock. There is no automatic paid resume or report-overwrite command.

## Where the Jev template lives

Open `bench.mjs` and find `bodies(e)`. It builds a `jev` object containing the original issue and five candidate entries named `f0` through `f4`. The shared instruction is:

> Select the source file most relevant to investigating and fixing the reported behavior. The snippets may be incomplete.

`call()` sends that object to the Jev API, using `TYPESAFE_API_KEY` from your terminal. It reads `answers.file.choice` and maps that key to the chosen file. Jev's requested model is `jev-latest`; the recorded returned version was `jev-1.13.0`. OpenAI receives the same evidence through `gpt-6-astra`.

There is no separate template file. Jev is introduced **after local search**, not into sampling, BM25, upstream source, or test execution. See [the integration diagram and locations](../docs/JEV-INTEGRATION.md).

For developers: `sample()` chooses IDs; `tokenize()`, `rankBM25()`, and `retrieve()` implement local search; `prepare()` creates/fixes inputs; `bodies()` builds requests; `call()` contacts providers; `analysisSummary()` adds coverage diagnostics; and `run()` manages a pass.

## Run only the free checks

Open PowerShell in the project's top-level folder. Node 22+ and Git must be installed; no extra packages are required.

```powershell
node .\experiment-3\test.mjs
```

This uses fake service responses to check parsing, error handling, key redaction, scoring, search, exclusions, and the separate smoke/full groups.

On a **fresh checkout**, restore the exact published task sample and download its source:

```powershell
node .\tools\prepare-replay.mjs 3
node .\experiment-3\bench.mjs run --dry-run
```

Preparation downloads public material but makes no paid provider calls. The dry run checks the sealed inputs, saves request previews, and displays coverage. The helper refuses to overwrite existing local data.

If the experiment is already prepared on this computer, skip replay preparation. If it is already completed, read its results rather than running another paid pass. A sealed `prepare` command validates existing files; it will not rebuild or tune them after reference coverage is visible.

## Optional paid check and full run

Use a prepared checkout with no existing report for that run. Enter keys following [the secure steps in the main guide](../README.md#optional-make-a-new-paid-comparison), then run these commands from the project root:

```powershell
# Two reserved tasks; up to four paid provider calls
node .\experiment-3\bench.mjs run --smoke

# Forty different tasks; up to 80 paid provider calls
node .\experiment-3\bench.mjs run
```

The accounts must support the requested APIs/models. Do not alter settings based on smoke answers or the coverage audit. Original run reports are saved after each attempt; failures, invalid answers, timeouts, and unattempted entries remain visible. There are no automatic retries. If the program says a report already exists, preserve it rather than deleting it to bypass the guard.

## Fixed search rules, for technical readers

- Seed `jev-experiment-3-v1`; sort eligible IDs by SHA-256(seed + NUL + ID), with ASCII comparison. Select 42: first 40 full, last two smoke. Require at least three repositories in full; do not search for a favorable seed.
- Use production Python files, with the defined test/docs/example/benchmark exclusions. Keep original snake_case identifiers and add their components; split camelCase; lowercase; remove the fixed stopword list.
- Query terms have weight 1; terms from the issue's first line have weight 2. BM25 uses `k1=1.2`, `b=0.75` for full files and 60-line passages with a 30-line stride. Source paths are included in the searchable text.
- File score: 35% full-file score plus 65% best-passage score. Explicit path/dotted-module mentions add 20; a qualifying filename mention adds 4 if no exact path/module matches. Equal scores break by ASCII source path.
- Select five files. For each, take up to two strongest non-overlapping passages, order by source position, line-number them, and bound total excerpt size to 3,000 characters.
- Freeze configuration, code identity, exclusions, task IDs, and groups before measuring coverage. Once preparation seals the artifacts, code/data changes are rejected rather than silently accepted.
- Alternate provider order, use 60-second timeouts, record returned model identifiers, and keep errors/misses in primary accuracy. Latency measures full response transfer/parsing, not search or repair time. Missing usage/cost is not filled with estimates.

## If preparation is blocked

Read the error and any `data/preparation-blocker.json`. An independently verified official JSON export can be supplied on a fresh checkout:

```powershell
node .\tools\prepare-replay.mjs 3 --dataset=C:\path\official-test.json
```

Its content fingerprint must match the published historical snapshot. If the helper restored the manifest but a source fetch then failed, retry the same protocol with `node .\experiment-3\bench.mjs prepare`. Keep the selected tasks unchanged. Do not fabricate substitutes, insert answer files, or remove difficult cases.

## Adapting the idea

Use a search stage suited to your own data, then ask a selector to choose from the returned options. For a support desk, the candidates might be teams or approved help articles instead of source files. This requires a separate request builder, input source, scoring rule, and review process; those integrations are not included here.

Measure shortlist coverage before blaming the selector for every miss. Compare against taking search's first result, record failures and available costs, and validate on fresh examples. The current benchmark forces one of five choices, so an operational “none fit” or human-review path would need to be designed separately. Keep the published experiment frozen and put adaptations in a new project or experiment.
