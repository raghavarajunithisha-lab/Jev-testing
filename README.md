# Jev vs OpenAI: file-localization experiments

Three separate CLI experiments comparing source-file selection. **This measures overlap with historical changed-file labels, not successful bug fixes.** Jev and OpenAI are called as external APIs; neither provider is installed into the upstream projects.

## Project layout

```text
experiment-1/   Archived early pilots: boltons screen and five pytest tasks
experiment-2/   40 seeded SWE-bench Lite tasks, lexical retrieval
experiment-3/   40 fresh tasks + 2 separate smoke tasks, BM25 file/passage retrieval
docs/          Method, public repository provenance, Jev integration, publishing
reports/       Public manifests, summaries and sanitized task-level outcomes
tools/         Offline checks, publication checks, exact-manifest preparation
```

Downloaded datasets, source caches, reference-label files and raw provider reports remain local and are ignored by Git. Public reports omit issue text, code excerpts, request headers, account information and absolute personal paths. See [what is published](docs/GITHUB.md).

## Recorded results

| Experiment | Jev reference hits | OpenAI reference hits | Jev mean latency | OpenAI mean latency | Candidate coverage |
|---|---:|---:|---:|---:|---:|
| 2: 40 tasks | 15/40 (37.5%) | 17/40 (42.5%) | 185.7 ms | 2,918.4 ms | 17/40 |
| 3: 40 fresh tasks | 28/40 (70.0%) | 30/40 (75.0%) | 270.2 ms | 2,971.6 ms | 31/40 |

Jev had 15.7 times lower mean response latency in Experiment 2 and 11.0 times lower mean latency in Experiment 3. OpenAI had two more reference-file hits in each sample. Both full runs recorded 40 valid responses per provider. These small, different public task samples do not establish accuracy equivalence, general superiority, or a causal retrieval improvement.

Experiment 1 includes a boltons pilot with a perfect local baseline (3/3, so Jev was skipped), a five-task pytest pilot (local baseline 3/5, Jev 4/5), and a saved **one-task** Jev/OpenAI comparison. Do not describe that last comparison as a five-task head-to-head run.

## Offline checks

Requires Node 22+ and Git. No package installation is needed.

```powershell
cd D:\Projects\Jev-testing
npm test
```

Tests make no provider calls. Archived Experiment 1 input checks are isolated in a temporary folder when its local snapshots are available; otherwise those archival checks are explicitly skipped.

## Prepare from a fresh clone

The public manifests preserve the original task sample, partitions and protocol. This command obtains the official dataset, checks its recorded content hash, restores the published manifest into the experiment's ignored local data folder, and fetches pre-fix source commits. It makes no paid provider calls:

```powershell
node .\tools\prepare-replay.mjs 2
node .\experiment-2\bench.mjs run --dry-run

node .\tools\prepare-replay.mjs 3
node .\experiment-3\bench.mjs run --dry-run
```

Already-completed local experiments must be preserved; replay preparation refuses to overwrite their local files. A dataset download/hash mismatch stops with a clear error. An independently verified official JSON export can be supplied with `--dataset=C:\path\test.json`.

## Paid runs

Set `OPENAI_API_KEY` and `TYPESAFE_API_KEY` in the terminal environment; never put real keys in the repository. Use secure entry instructions in each experiment's README. OpenAI is fixed to `gpt-6-astra`; Jev requests `jev-latest` and records the returned model version.

```powershell
# Experiment 2: smoke reuses the first two full-run tasks
node .\experiment-2\bench.mjs run --smoke
node .\experiment-2\bench.mjs run

# Experiment 3: two smoke tasks are separate from the 40 full-run tasks
node .\experiment-3\bench.mjs run --smoke
node .\experiment-3\bench.mjs run
```

Each smoke run makes up to four paid calls; each full run up to 80. Existing reports prevent silent reruns. Do not delete reports to bypass these guards. Alternating provider order, failures, timeouts, native token usage and costs when returned are recorded. No automatic retries or price estimates are introduced.

Read [methodology](docs/METHODOLOGY.md), [where Jev is introduced](docs/JEV-INTEGRATION.md), and [public repository provenance](docs/PROVENANCE.md).
