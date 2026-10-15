# Five pytest problems: the second early trial

This small trial asks Jev to choose a source file from five candidates for each of five historical problems in [pytest](https://github.com/pytest-dev/pytest), a public Python testing project.

It belongs to [Experiment 1](../README.md). It is separate from the three boltons cases and separate from the saved one-example OpenAI comparison.

## What happened

| Method | Reference-file hits |
|---|---:|
| Take the first local search result | 3/5 |
| Let Jev choose from the five candidates | 4/5 |

The shortlist contained a historical reference file on four of the five problems. The fifth could not earn a hit with any offered choice. It was retained in the denominator rather than replaced.

OpenAI is **not called by this folder's `run.mjs`**. Experiment 1's parent `compare.mjs` provides a separate comparison path. The saved OpenAI comparison covers one task, not all five.

## Where the problems came from

The archived record describes these as the first five pytest entries in SWE-bench Verified, sorted by dataset creation date. They are real historical issues, not bugs inserted by this project.

| Task suffix | Original issue | Plain-language topic | Historical answer's search position |
|---|---|---|---:|
| 5262 | pytest #5257 | Whether a captured stream reports itself as binary | 1 |
| 5631 | pytest #5606 | Collecting tests when an array is mocked | 3 |
| 5787 | pytest #5786 | Keeping chained exceptions during serialization | 6; outside the five choices |
| 5809 | pytest #5806 | Pastebin requests failing with a lexer setting | 1 |
| 5840 | pytest #5819 | Windows import paths with different capitalization | 1 |

Search examined pre-fix Python modules under `src/`. It used word matches and gave priority to explicit source paths or qualified module names in the original issue. Historical changed files were used for scoring, not inserted into the shortlist. One task changed more than one file, so selecting one reference does not prove that all necessary context was found.

## Files in this folder

| File | What it contains | Included on GitHub? |
|---|---|---|
| `README.md` | This explanation | Yes |
| `run.mjs` | Read prepared requests, optionally call Jev, validate its choice, and save outcomes | Yes |
| `requests.json` | Original issue text and five candidate snippets in Jev's request structure | Local only |
| `baseline.json` | Source revisions, candidate rankings, scoring references, and local baseline results | Local only |
| `jev-results.json` | Original five-task Jev outcomes, timings, and reported usage | Local only |
| `run.lock` | Temporary marker that a run is in progress or was interrupted | Local only, when present |

The public [pilot-results file](../../reports/experiment-1/pilots.json) contains reviewed result fields. Fresh clones can read that file and inspect the code, but cannot execute this archived trial without the old local input JSON files.

## The request to Jev

Jev receives the complete original problem description plus five source-file paths and excerpts, labeled `f0` through `f4`. It is asked to choose one relevant file. The response key is mapped back to a file and compared with the scoring reference.

Jev does not receive the historical solution patch, hidden tests, or expected file labels. It does not edit pytest or run its tests. The same shortlist can still contain natural clues from issue descriptions or tracebacks; old public problems may also have appeared in model training.

## Inspecting the prepared requests without paying

On the original checkout, open PowerShell in the project's top-level folder and run:

```powershell
node .\experiment-1\pytest-screen\run.mjs
```

This prints how many requests are prepared and their total size. It makes no API calls. Without `requests.json` and `baseline.json`, a fresh clone cannot perform this check; their absence is expected.

## The historical paid command

For reference, adding `--jev` enables up to five paid Jev calls and requires `TYPESAFE_API_KEY` in the terminal environment. It stops at the first failure, saves attempted outcomes, and refuses to repeat the run if `jev-results.json` already exists. There are no automatic retries.

The original run is already complete. Do not delete its saved result to trigger another paid pass. If a `run.lock` remains after a crash, first confirm that no process is still running and preserve the report before investigating it.

For a new repeatable comparison with both providers and automatic data preparation, read [Experiment 3](../../experiment-3/README.md).

## What to reuse in your own work

This trial illustrates the second stage of a workflow: a search process prepares several possibilities, and a service selects one. Measure both stages separately. If search misses the correct option, improving the selector alone cannot solve that example. Use a larger fresh evaluation set before treating a small pilot as deployment evidence.
