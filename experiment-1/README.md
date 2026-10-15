# Experiment 1: the early trials

This folder records the small trials that came before the two larger comparisons. It contains **three related activities**, not one large controlled benchmark. Start with this guide; you do not need to run the programs to understand the results.

All activities asked where a reported problem was likely to belong. They did not generate a software fix or run the public project's tests.

## What was tried

| Part | Question | Recorded outcome |
|---|---|---|
| Three boltons problems | Can ordinary search already identify the historical file? | Search was correct on all three. The program skipped Jev because there was no room to improve that score. |
| Five pytest problems | Can Jev choose the right file from five search candidates? | Search's first choice scored 3/5. Jev scored 4/5. One problem's reference file was outside the shortlist. |
| One saved Jev/OpenAI comparison | Can both request formats work on the same example? | Both chose a reference file. Jev took 389 ms and OpenAI 4,224 ms on that one saved example. |

The one-example comparison is **not** evidence from five OpenAI tasks. The boltons descriptions were written for already completed fixes and included solution hints. These early results motivated broader trials; they do not establish general accuracy or bug-fixing ability.

## How this folder is arranged

| File or folder | What it does | Available on GitHub? |
|---|---|---|
| `README.md` | Explains the whole early experiment | Yes |
| [`README.legacy.md`](README.legacy.md) | Explains only the three-problem boltons screen, in updated plain language | Yes |
| `screen.mjs` | Searches the boltons source; can call Jev after search, but skips it for the perfect current baseline | Yes |
| `verify.mjs` | Checks those input records and verifies that the perfect-baseline path makes no network request | Yes |
| `compare.mjs` | Reads the prepared pytest requests and compares OpenAI with stored or live Jev choices | Yes |
| [`pytest-screen/`](pytest-screen/README.md) | The separate five-problem pytest trial; its README explains each file | Programs/docs only |
| `LICENSE.boltons` | Preserves the original boltons attribution/license notice | Yes |
| `.gitignore.legacy` | Archived list of files the original pilot excluded from Git | Yes; historical, not the current project-wide rule |
| `package.legacy.json` | Archived original command shortcuts | Local only; use the current root `package.json` instead |
| `cases.json` | Original boltons case descriptions, revisions, and scoring labels | Local only |
| `data/` | Original boltons source snapshots, one JSON file per PR | Local only |
| `results/` | Original boltons results, the saved one-task comparison, and historical accounting | Local only |

The original files were moved here from the project's top-level folder. Programs and input/result snapshots kept their content. The README explanations were subsequently rewritten; they are not frozen original documentation.

## Where Jev fits

The local search runs first. The optional Jev request then contains a problem description and five file excerpts. Jev returns one option key, such as `f2`, which the program maps to a file.

- In `screen.mjs`, that call is inside the optional `--jev` path. The current three-case sample stops before calling the service.
- In `pytest-screen/run.mjs`, Jev chooses from prepared requests for all five tasks.
- In `compare.mjs`, recorded Jev results are reused by default. `--force-jev` requests live Jev responses. OpenAI is called independently.

Jev is not installed into boltons or pytest. It does not alter either project's source. See [the integration guide](../docs/JEV-INTEGRATION.md) for the request structure and locations.

## How to inspect this experiment

For anyone reading on GitHub, open [the public pilot results](../reports/experiment-1/pilots.json). These contain the counts and selected safe result fields. You do not need API access.

If you are using the original local checkout with the archived inputs, this command prints the prepared pytest request count without calling either provider. Run it from the project's top-level folder:

```powershell
node .\experiment-1\pytest-screen\run.mjs
```

For project checks that protect the archived originals, run:

```powershell
node .\tools\verify-project.mjs
```

The tool checks the legacy boltons inputs in a temporary copy when they are available. On a fresh clone it explicitly skips that old input check. Fresh GitHub clones do not include the legacy input snapshots needed to run `screen.mjs` or `compare.mjs`; their code and public results remain readable.

The legacy `compare.mjs` is kept for history, not recommended for a new paid run: its default OpenAI model is `gpt-4o-mini` unless changed, it can reuse recorded Jev results, and its failure/report handling is less complete than the newer programs. The saved comparison used `gpt-6-astra`. Use [Experiment 2](../experiment-2/README.md) or [Experiment 3](../experiment-3/README.md) for the reproducible comparison procedure.

## How the idea applies elsewhere

This trial demonstrates why you should measure an ordinary search method before adding an AI choice step. If search already gets every evaluation example right, paying another service cannot improve that particular score. It might still change other qualities, but this pilot did not establish those benefits.

For your own workflow, collect a separate set of examples, keep expected answers out of the requests, and compare the selector against a useful simple baseline. Do not make the search deliberately worse to create a win for AI. See [workflow adaptation examples](../README.md#using-the-idea-in-your-own-workflow).
