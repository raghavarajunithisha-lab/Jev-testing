# Jev context-selection screening

No OpenAI requests are implemented. This is a free-first feasibility screen, not a code-generation benchmark or evidence that Jev helps.

## Current result

Local retrieval finds a historically changed source file first in **3/3 cases**. No Jev or OpenAI calls were made. The optional Jev mode automatically stops for this perfect-baseline sample, because its top-one accuracy cannot improve.

## Real cases and provenance

- [PR 475: Unicode line separators](https://github.com/mahmoud/boltons/pull/475)
- [PR 467: zero interquartile range in histograms](https://github.com/mahmoud/boltons/pull/467)
- [PR 464: binary JSONL seeking](https://github.com/mahmoud/boltons/pull/464)

These three recent isolated fixes were chosen before model evaluation for their concrete descriptions and small source changes. This is a convenience sample, not random or representative. They are retrospective merged PR descriptions, including proposed solutions, **not fresh unsolved issues**. They cannot establish code-writing ability.

`cases.json` retains the exact original titles and descriptions, URLs, fixed revisions, first-parent buggy revisions and historical changed source files. `data/` contains the library modules from each pre-fix revision. The upstream BSD license is retained. No bug was inserted. No source names, function names, or explanatory details were removed to make search harder. Initial title-only exploration found 2/3; adding the full available descriptions yielded 3/3. The full descriptions are the final baseline and Jev input. No model calls influenced case selection or retrieval settings.

Retrieval is local BM25-style keyword search over all top-level Python library modules, using file names and complete source. Jev, if a future predeclared sample warrants it, chooses from the same top five candidates using bounded matching excerpts. Historical changed files are used only for scoring, never in Jev's input. A hit means overlap with a changed source file; that is only a localization proxy, not proof that context is sufficient or a fix is correct. Module-level tests are not executed in this context-only screen.

## Usage

```powershell
cd D:\Projects\Jev-testing
node screen.mjs
node screen.mjs --jev
```

The first command is always free. With the current sample the second command also makes **zero API calls**, printing the perfect-baseline stop reason. No keys are needed for either current path. A future non-perfect sample would require TYPESAFE_API_KEY and could make up to one Jev call per case, with no retries or automatic repeated runs. Jev has separate billing. Do not expand the sample or rerun paid screening blindly.

Results are saved in `results/baseline.json`. Previous conservative OpenAI accounting ($0.1350875) is retained in `results/prior-spending.json`; it is not new spending or a live balance. The old website, code-fix benchmark and experiment files were removed as requested.

## Next decision

Stop paid testing on this sample. It provides no localization opportunity for Jev. Do not remove useful report details or worsen retrieval to create one. A future study should preselect independently reported, unresolved-at-the-snapshot bugs in a larger repository, preserve complete reports, compare against a competent baseline, retain all cases, and only proceed to coding evaluation on fresh held-out bugs if localization improves. Even then, a positive result is not guaranteed.
