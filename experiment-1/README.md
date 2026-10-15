# Experiment 1: archived early pilots

This folder preserves the original pilot scripts and their local inputs/results. They were moved together from the project root; their bytes and relative input paths were preserved. `README.legacy.md` is the historical boltons write-up, including its old root-directory commands. Use the updated paths below instead.

## What was actually run

1. Three retrospective PR cases from mahmoud/boltons: full descriptions and pinned pre-fix source modules; local search scored 3/3. `screen.mjs --jev` intentionally skips Jev because the local baseline already has maximum top-one accuracy. This is not a Jev win or a coding benchmark.
2. Five real pytest tasks: `pytest-screen/` contains the archived issue/candidate inputs, baseline and Jev run. Local baseline 3/5; Jev 4/5. One case had no reference file among the five candidates. All five were retained.
3. `compare.mjs` adds a compatible OpenAI API comparison over those pytest requests. The saved gpt-6-astra comparison contains **one task**, on which both providers hit. Its Jev request took 389 ms and OpenAI 4,224 ms. This is not representative comparative evidence.

## Where Jev appears

- `screen.mjs`: optional paid selector after local retrieval, with a perfect-baseline stop.
- `pytest-screen/run.mjs`: sends frozen issue/candidate requests to Jev and scores the returned choice.
- `compare.mjs`: uses recorded Jev results by default, or calls Jev live with `--force-jev`; calls OpenAI for comparison. The legacy default OpenAI model is gpt-4o-mini unless overridden; the saved comparison used gpt-6-astra. This legacy runner has weaker validation/reporting than Experiments 2 and 3 and is preserved as history.

Jev does not rank the local retrieval candidates, generate fixes, alter upstream source, or run tests in these pilots.

## Local read-only check

```powershell
cd D:\Projects\Jev-testing
node .\experiment-1\pytest-screen\run.mjs
```

This prints the prepared-request count without API calls. Do not rerun legacy paid paths merely to recreate already saved outcomes.

## Public GitHub contents

The archived scripts and documentation are published. Local `data/`, `cases.json`, `pytest-screen/*.json` and `results/` are excluded because they contain upstream issue/source snapshots or raw historical artifacts. Sanitized pilot results and task identities are under `../reports/experiment-1/`. Fresh clones can inspect the legacy code/results; the original legacy input snapshots are required to execute those pilot scripts. Experiments 2 and 3 provide automatic dataset/source preparation for new clones.

`LICENSE.boltons` is preserved with the original attribution. Upstream projects retain their own licenses; this project does not relicense their source.
