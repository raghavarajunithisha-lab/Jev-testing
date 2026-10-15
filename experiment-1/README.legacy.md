# The boltons pilot: can search solve the task without AI?

This page explains the oldest part of Experiment 1. The word **legacy** in the filename means “kept from an earlier stage.” This explanation has been rewritten for clarity; the archived program, inputs, and results are unchanged.

For the full early-trial overview, read [Experiment 1's main guide](README.md).

## The question

Given the description of a known boltons problem, can a simple search identify a file that was changed by its historical fix?

[boltons](https://github.com/mahmoud/boltons) is a public collection of Python utilities. Three already completed changes supplied these cases:

| Historical change | Plain-language problem |
|---|---|
| [PR 475](https://github.com/mahmoud/boltons/pull/475) | Unicode line separators caused incorrect text splitting |
| [PR 467](https://github.com/mahmoud/boltons/pull/467) | Automatic histogram calculations failed for some repeated values |
| [PR 464](https://github.com/mahmoud/boltons/pull/464) | Seeking within a binary JSONL stream used the wrong newline type |

A PR, or pull request, is a proposed change to a project. These descriptions came from merged changes and included solution information. They were a small convenience sample, not fresh unsolved problems or randomly selected test cases.

## What the program does

1. Read the original descriptions from `cases.json`.
2. Read the source modules from the revision before each fix, stored in `data/`.
3. Rank modules by matching words in the description and source.
4. Take the five highest-ranked candidates.
5. Score the first candidate against the historical changed-file label.
6. If Jev was requested, first check whether it could improve the measured score. On this sample, search is already perfect, so the program makes no Jev request.

Earlier title-only exploration found two of the three files first. Using the complete available descriptions found all three. The final saved baseline uses those complete descriptions. This is a development history, not an independent held-out evaluation of both search settings.

## Recorded result

**Search scored 3/3. Jev calls: zero. OpenAI calls: zero.**

This part's `screen.mjs` has no OpenAI integration. That statement applies only to this boltons screen; a separate `compare.mjs` in Experiment 1 does include OpenAI.

The result supports stopping paid selection tests on this small sample. It does not show that Jev improved anything, wrote code, or fixed the three bugs.

## Files used by this screen

| File | Purpose |
|---|---|
| `screen.mjs` | Search, scoring, and the optional Jev path with a perfect-baseline stop |
| `verify.mjs` | Input checks and a test that unexpected network calls do not occur on this stop path |
| `cases.json` — local only | Exact case descriptions, upstream URLs, revisions, and expected changed files |
| `data/464.json`, `data/467.json`, `data/475.json` — local only | File names and source text from each pre-fix snapshot |
| `results/baseline.json` — local only | Detailed local search results |
| `results/prior-spending.json` — local only | Earlier accounting history; not new spending or a live balance |
| `LICENSE.boltons` | Original attribution/license notice |

The public [pilot-results file](../reports/experiment-1/pilots.json) gives the saved outcome without publishing the complete snapshots or accounting history.

## Running checks

Fresh clones do not contain these old snapshots. Read the public results, or use Experiments 2/3 for automatic preparation. On the original local checkout, run the project's offline checks from the top-level folder:

```powershell
node .\tools\verify-project.mjs
```

For a developer investigating the historical script, `node .\experiment-1\screen.mjs` reruns local search and writes its local baseline report. Adding `--jev` still makes zero provider calls on this exact perfect-baseline sample. If somebody changes the inputs so that search is no longer perfect, the optional path can make paid Jev calls; it is not a general promise that `--jev` is free.

## Lesson for a different workflow

First ask whether a simple rule or search already solves your evaluation examples. Only then measure whether an AI selector improves a clearly defined result. Use fresh examples for later validation and retain failures; do not remove useful evidence or weaken the baseline to create an apparent benefit.
