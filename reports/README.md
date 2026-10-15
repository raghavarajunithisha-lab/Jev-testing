# Reports guide: read the findings without running anything

This folder contains the reviewed public results. You can read it directly on GitHub; no Node.js, terminal, API key, or payment is needed.

Start with [Experiment 2's analysis](experiment-2/analysis.md) or [Experiment 3's analysis](experiment-3/analysis.md). For the early pilot counts, open [Experiment 1's results](experiment-1/pilots.json).

## What is in each experiment folder?

### Experiment 1

| File | What it tells you |
|---|---|
| `experiment-1/pilots.json` | Counts from the three boltons cases, selected outcome fields from the five-task Jev pytest trial, and the separate one-task Jev/OpenAI comparison |

There is no five-task OpenAI result hidden in this report. The one-task comparison must not be presented as a full five-task head-to-head test.

### Experiments 2 and 3

Both have the following files:

| Filename | Start here when you want to... | What is inside |
|---|---|---|
| `analysis.md` | Read a plain-language explanation | Results, disagreements, clue groups, repository breakdown, order groups, usage, and limitations |
| `summary.json` | Check the headline numbers | Overall correct choices, valid replies, timing statistics, and failure/status counts; Experiment 3 also includes coverage and conditional accuracy |
| `manifest.json` | Know exactly which problems were selected | Problem IDs, public repository names, pre-fix commits, fixed settings, dataset identity, and fingerprints |
| `outcomes.json` | Inspect individual full-run answers | Each provider's file choice, reference-hit result, response status, timing, model identifier, and reported usage/cost |
| `audit.json` | Check whether the choice task was answerable | Candidate availability, reference coverage, label count, and the fixed clue flags |
| `integrity.json` | Verify the identity of the original files | Fingerprints for the manifest, runner, prepared evidence, reference labels, and original audit |

Experiment 2's manifest has 40 tasks. Experiment 3's manifest has 42 because it includes **40 full tasks plus two separate smoke tasks**. Its public audit likewise includes preparation information for both groups; the `partition` field distinguishes them. The public full-run summary and outcomes still cover 40 tasks. Smoke results are not added to the headline score.

The fingerprints in `integrity.json` refer to the original complete local artifacts. The public `audit.json` is a selected-fields copy, so it is not expected to have the same content hash as that complete original audit. Likewise, public `outcomes.json` is not the raw API report.

## How to read the numbers

| Term | Meaning | Example from Experiment 3 |
|---|---|---|
| Hits / correct choices | Selected file matches a historical changed-file label | Jev 28; OpenAI 30 |
| Denominator | All selected full-run problems, including misses and failures | 40 |
| Overall accuracy | Hits divided by all selected problems | 28/40 = 70%; 30/40 = 75% |
| Candidate coverage | Problems whose five choices include a historical reference | 31/40 = 77.5% |
| Conditional accuracy | Hits divided only by problems with a reference candidate | 28/31 and 30/31; diagnostic, not the main score |
| Mean latency | Average complete provider response time | About 270 ms versus 2,972 ms |
| Median latency | The middle of the sorted response times, averaging the two middle values here | About 191 ms versus 2,491 ms |
| p95 latency | A response-time threshold covering approximately 95% of the observed replies | A way to see slower responses, not just the average |
| Valid response | An answer with a supported candidate key | Both providers had 40/40 valid choices |
| `null` cost | No dollar-cost value was returned | Unknown, not free |

**A valid reply can still be wrong.** A reference-file hit can still be insufficient to fix the bug. These experiments do not write patches or run the original projects' test suites.

## Why the missing-answer cases remain

If all five offered files are outside the historical reference set, the selector cannot earn a hit with any valid option. Removing these problems would hide a weakness in the first search stage. The primary score therefore includes them, while conditional accuracy helps explain the selector's performance when an answer was available.

Experiment 2 had 23 missing-answer shortlists; Experiment 3 had nine. The samples differ, so that change alone does not isolate the effect of the revised search.

## What clue flags mean

The fixed checks look for candidate path/module mentions, explicit answer language, and embedded patch text. A traceback naturally naming a file can be legitimate issue evidence. A flag is not automatic proof of cheating, and no flag is not proof that all clues are absent.

The analyses show flagged and unflagged groups as a sensitivity check. They retain all selected tasks as the main result; flags were not used to search for a favorable sample.

## What is deliberately absent from these public reports

Complete issue text, downloaded source excerpts, reference-label snapshots, full request/response bodies, Authorization headers, request IDs, private account information, and spending ledgers are not included. The original raw reports remain local under each experiment's `results/` folder.

The public outcome rows expose enough selected fields to inspect scores and timings without publishing the whole source/request collection. They are result records, not inputs supplied to either provider. See [publication details](../docs/GITHUB.md) and [upstream attribution](../docs/PROVENANCE.md).

## A fair reading of the completed runs

Jev had lower mean response latency; OpenAI had two more historical reference-file hits in each full sample. The small studies do not prove equal accuracy, a general winner, a cost advantage, or faster software repair. Returned token accounting is provider-specific; missing dollar costs cannot support a cost claim. Public problems may have been seen during training.

For a new workflow, reuse this reporting discipline: include every planned example, compare against a simple baseline, report missing candidates and failures, and keep expected answers outside provider inputs. Evaluate new workflow changes on fresh examples instead of tuning against these published outcomes.
