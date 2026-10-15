# Five real pytest tasks: context-selection pilot

The free baseline has completed: **3/5 top-one reference hits; 4/5 top-five reference hits**. No model requests were made during preparation.

Baseline: local BM25 over every Python module under src/ at each task's pinned base revision, prioritizing explicit source paths or qualified module mentions in the full issue description. Bare package names are not treated as file references. No report details were removed. This is a lightweight search baseline, not the strongest possible coding agent. Relevant files are identified for scoring from historical source patches after retrieval.

| Fix instance | Original issue | Baseline reference rank |
|---|---|---|
| 5262 | pytest #5257: captured stream mode | 1 |
| 5631 | pytest #5606: mocked array collection failure | 3 |
| 5787 | pytest #5786: chained exception serialization | 6, outside candidates |
| 5809 | pytest #5806: pastebin HTTP error | 1 |
| 5840 | pytest #5819: Windows import casing | 1 |

The five cases were fixed before retrieval, as the first five pytest entries in SWE-bench Verified sorted by dataset creation date. They are real historical bugs, not defects inserted for this experiment. All five are retained, including baseline successes and the unretrievable case. Selection scores use overlap with historical changed files, not proof of a correct fix. Case 5840 changed two files: the top-one overlap metric does not establish complete context.

## Run

```powershell
cd D:\Projects\Jev-testing
node pytest-screen/run.mjs --check
node pytest-screen/run.mjs --jev
```

Check is free. The Jev mode needs TYPESAFE_API_KEY in that terminal and makes at most **five Jev calls** (one per frozen case), no retries and no OpenAI calls. Jev charges are separate. It stops on the first error, persists attempted calls, and refuses another paid run if a report already exists. Do not delete the report to rerun blindly. A process crash may leave run.lock; verify that no run is active before removing the lock.

`requests.json` contains the complete, inspectable API payloads. Jev sees only the original dataset problem statement and the same five source candidates as the baseline, with excerpts chosen by query matches. It does not receive the historical patch, hidden tests or reference labels. These cases use about 62 KB of total request JSON across five requests; this is not a token or price estimate.

`baseline.json` contains the full local results and provenance. `jev-results.json` will contain all attempted Jev outcomes. Compare accuracy over the complete sample; do not select only Jev wins. A better result is only preliminary localization evidence. It does not measure code generation, fix correctness, or end-to-end speed. Historical test environments have not yet been run. Old public benchmark tasks can be memorized.

The previous boltons screen is left available. No OpenAI credit is used by this subproject.
