# Tools guide: checking and preparing the project

These utilities help you check the project, reproduce its task sample, and inspect what would be published to GitHub. **None of these three tools makes a paid Jev or OpenAI request.** Data preparation does use the internet to download public material.

Run the examples from the project's top-level folder. Node.js 22 or newer and Git must be installed. No `npm install` is needed.

## Every file in this folder

| File | Purpose | Internet needed? | What it can write |
|---|---|---|---|
| `README.md` | This guide | No | Nothing |
| `verify-project.mjs` | Run offline checks and verify the published sample sizes and separation | No | A temporary copy for old Experiment 1 checks, then cleans that copy up |
| `prepare-replay.mjs` | Restore an exact published Experiment 2 or 3 sample on a fresh checkout | Yes for official data/source downloads; a supplied dataset file avoids the dataset download | The selected experiment's local ignored `data/` and `cache/` files |
| `check-publication.mjs` | Check the files staged/tracked in Git for prohibited generated material and common credential patterns | No | Nothing; it prints a pass/fail result |

## 1. Check that the programs work offline

```powershell
node .\tools\verify-project.mjs
```

`npm test` runs the same tool. It checks the Experiment 2 and 3 programs using fake requests/responses, confirms the published manifest sizes, and confirms that their task sets do not overlap.

If the original Experiment 1 snapshots are available, it checks them in a temporary copy so the archived originals are not rewritten. On a fresh GitHub clone it prints an explicit skip for that legacy input check. The skip is expected because those old snapshots are not published.

Passing these checks shows that the checked program behavior works. It does not prove that live AI answers will be correct, that your accounts support the requested models, or that a historical problem was solved.

## 2. Prepare a published sample on a fresh checkout

For Experiment 3:

```powershell
node .\tools\prepare-replay.mjs 3
node .\experiment-3\bench.mjs run --dry-run
```

For Experiment 2:

```powershell
node .\tools\prepare-replay.mjs 2
node .\experiment-2\bench.mjs run --dry-run
```

The replay helper performs these steps:

1. Read the public manifest in `reports/experiment-2/` or `reports/experiment-3/`.
2. Refuse if local manifest/dataset/seal files already exist. This protects completed local work.
3. Obtain the official SWE-bench Lite test records, or read a separately supplied official JSON export.
4. Check the data's content fingerprint against the historical recorded value. If it differs, stop instead of silently changing the sample.
5. Save the official dataset and original manifest under the experiment's ignored local `data/` folder.
6. Start that experiment's preparation program, which fetches the exact pre-fix source and builds the frozen candidate evidence.

The dry run then saves provider-request previews and checks readiness without making provider calls. Preparation does not guarantee that model responses or timing will match the old run.

### Existing experiment or interrupted preparation

If local data already exists, do not delete it to make the replay helper run. For a completed experiment, read its saved results. For a source download that failed after the helper restored the manifest, retry the original preparation command for that same experiment, for example:

```powershell
node .\experiment-3\bench.mjs prepare
```

The experiment's own guards still apply. Experiment 3 will validate a sealed experiment rather than rebuild it. Neither experiment should be retuned or resampled after seeing outcomes.

### An official dataset export is available

On a fresh checkout, you can supply an independently verified JSON array instead of the automatic dataset download:

```powershell
node .\tools\prepare-replay.mjs 3 --dataset=C:\path\official-test.json
```

That file must match the published dataset fingerprint. A local file does not become trusted merely because it is named “official.” Never invent substitute tasks or edit the expected hash to bypass a mismatch.

## 3. Check a Git publication

Git's **staging area**, also called its **index**, is the set of file contents selected for a commit. After staging intended changes, run:

```powershell
node .\tools\check-publication.mjs
```

`npm run check:publication` is a shortcut. The tool checks indexed content rather than assuming every local file will be published. It checks for:

- Downloaded/raw paths that should stay outside Git, such as `data/`, `cache/`, and `results/`.
- Common credential/private-key patterns and personal absolute paths, without printing possible secret values.
- Unexpectedly large publication files.
- Experiment 2/3 runner bytes that differ from the frozen recorded runner fingerprints.

The exact fake credential `synthetic-secret` is allowed in offline fixtures. The checker is targeted and cannot guarantee detection of every possible secret format. Keep secrets out of the staging area in the first place.

If there are no indexed files, the tool asks you to stage the intended publication first. If a check fails, inspect it privately and fix the publication selection; do not publish the flagged data simply to get past the check.

## Where paid calls begin

The `bench.mjs run --smoke` and `bench.mjs run` commands are separate from these tools. They can spend API credits and are explained in the experiment guides. Preparation, dry-run, and tests are not substitutes for choosing to make those paid calls.

## Reusing the tools for a different workflow

Use the design principles—offline tests, saved examples, content-change checks, and publication checks—in your own application. The existing files know this project's names, manifests, and source-file format. A ticket-routing or document-selection project needs its own adapter and tests; renaming a folder does not make these utilities generic business integrations.
