# GitHub publication and reproduction

Target repository: https://github.com/raghavarajunithisha-lab/Jev-testing

The public commit intentionally contains:

- Original benchmark and test scripts in three named experiment folders.
- Separate experiment READMEs and shared methodology/integration/provenance notes.
- Original sampled task IDs, base commits, issue hashes, fixed configuration and partition manifests.
- Summaries and sanitized per-task choices, reference-file hits, elapsed times and native usage.
- Scoring coverage/clue audit metadata, without original issue text or source snippets.

It does not contain environment files, API keys, private keys, Git source caches, downloaded datasets, raw requests/responses, request IDs, reference-label snapshots, complete issue text, source excerpts, or prior account/spending ledgers. All originals remain local and untouched except that the old root-level Experiment 1 material is relocated together under experiment-1.

No new project-wide reuse license has been selected. Upstream projects retain their own terms. The boltons notice is preserved, and downloaded source is not vendored into the public commit. See PROVENANCE.md for the upstream links.

## Before committing future changes

```powershell
npm test
git add README.md package.json .gitignore docs tools reports experiment-1 experiment-2 experiment-3
npm run check:publication
git diff --cached --stat
```

The publication checker examines indexed files for prohibited generated paths, embedded local paths and common credential patterns. It does not display possible secret values. It is a targeted check, not a guarantee that every possible secret format can be detected. Keep raw artifacts out of Git rather than depending only on regex scanning.

## Exact sample replay from a fresh clone

```powershell
node .\tools\prepare-replay.mjs 2
node .\tools\prepare-replay.mjs 3
```

The helper downloads official dataset rows and checks the historical dataset hash before restoring the published manifest. It refuses to overwrite an existing local manifest/dataset, so it is intended for a fresh checkout, not rerunning completed local experiments. `--dataset=C:\path\official-test.json` accepts an independently verified official JSON array if automatic acquisition is blocked. Source repositories are shallow-fetched at the recorded base commits; code is read as text, not executed.

After preparation, dry-run makes no paid calls. Smoke/full make new paid calls and save new local responses. Original model outputs cannot be guaranteed to repeat because provider aliases, internal compute and defaults can change. Reproduce the sample and prompt evidence separately from claiming deterministic model answers.
