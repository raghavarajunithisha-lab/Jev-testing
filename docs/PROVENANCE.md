# Public repositories and how they are used

The task provenance below is taken from the frozen local manifests, not guessed from repository names. The sampled projects are upstream input material. Jev is not installed or patched into any of them.

## Dataset and benchmark framework

Experiments 2 and 3 use the official [princeton-nlp/SWE-bench_Lite test split](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Lite). It supplies instance IDs, issue text, repository names, pre-fix base commits and historical patch labels. The pinned downloaded dataset revision is `6ec7bb89b9342f664a54a6e0a6ea6501d3437cc2`; the cached JSON content hash is `faeabdbf2e822d73ce46de467b2fd3487f91c0498843f7ea88331a409cd611ae`. Experiment 3 reuses that verified snapshot and excludes Experiment 2 tasks.

[SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench) is the upstream benchmark project, cited for provenance. Its Docker evaluation harness is not executed or imported here. This repository implements a smaller file-choice proxy, not the official SWE-bench patch-resolution evaluation. The legacy pytest README identifies its five cases as the first five pytest entries in SWE-bench Verified sorted by creation date; they are retained as a historical pilot, not relabeled as Lite sample selections.

## Actual project repositories

| Public upstream repository | Experiment 1 | Experiment 2 full tasks | Experiment 3 full tasks | Use |
|---|---:|---:|---:|---|
| [mahmoud/boltons](https://github.com/mahmoud/boltons) | 3 PR cases | 0 | 0 | Pre-fix library modules and retrospective PR descriptions; perfect local baseline, Jev skipped |
| [astropy/astropy](https://github.com/astropy/astropy) | 0 | 3 | 0 | Issue/source localization evidence at recorded base commits |
| [django/django](https://github.com/django/django) | 0 | 13 | 13 | Issue/source localization evidence at recorded base commits |
| [matplotlib/matplotlib](https://github.com/matplotlib/matplotlib) | 0 | 6 | 3 | Issue/source localization evidence at recorded base commits |
| [pallets/flask](https://github.com/pallets/flask) | 0 | 0 | 1 | Issue/source localization evidence at recorded base commits |
| [psf/requests](https://github.com/psf/requests) | 0 | 0 | 2 | Issue/source localization evidence at recorded base commits |
| [pydata/xarray](https://github.com/pydata/xarray) | 0 | 1 | 0 | Issue/source localization evidence at recorded base commits |
| [pylint-dev/pylint](https://github.com/pylint-dev/pylint) | 0 | 2 | 1 | Issue/source localization evidence at recorded base commits |
| [pytest-dev/pytest](https://github.com/pytest-dev/pytest) | 5 tasks | 1 | 3 | Issue/source localization evidence at recorded base commits |
| [scikit-learn/scikit-learn](https://github.com/scikit-learn/scikit-learn) | 0 | 1 | 4 | Issue/source localization evidence at recorded base commits |
| [sphinx-doc/sphinx](https://github.com/sphinx-doc/sphinx) | 0 | 6 | 1 | Issue/source localization evidence at recorded base commits |
| [sympy/sympy](https://github.com/sympy/sympy) | 0 | 7 | 12 | Issue/source localization evidence at recorded base commits |

Experiment 3 additionally reserves two SymPy tasks for smoke checks, separate from its 40 full tasks. Experiment 2 smoke repeats its first two full tasks (both matplotlib); those are not extra full-sample tasks.

## Exactly what is done with upstream material

1. Read the official problem statement and frozen repository/base commit from the dataset.
2. Initialize a separate local bare Git cache and shallow-fetch the exact pre-fix commit.
3. Read Python file blobs as text with Git. Do not install the project, execute its code, or run its tests.
4. Perform local issue/source-only retrieval and generate bounded snippets. Both providers receive the same candidates.
5. Derive reference-file labels from the historical patch for auditing and scoring. The patch/labels are not provider prompts or retrieval features.
6. Keep all failures and retrieval misses; never insert reference files to improve coverage.

The three boltons PRs were [475](https://github.com/mahmoud/boltons/pull/475), [467](https://github.com/mahmoud/boltons/pull/467), and [464](https://github.com/mahmoud/boltons/pull/464). Their solution-bearing descriptions make that early screen unsuitable as strong independent evidence.

## Attribution and publication boundary

This is a custom Node.js benchmark harness using Node built-ins and the Git executable. No upstream project is a runtime npm dependency. Public source repositories and issues are not authored by this benchmark. API integrations use Jev/Typesafe and OpenAI; provider internals are not included.

Original snapshots and raw run artifacts remain local and excluded from the public commit. Public manifests and numeric outcomes link to upstream sources and preserve task/base-commit identities. The original boltons license notice is retained under experiment-1/LICENSE.boltons. Upstream license terms continue to apply to material fetched by users; this project does not assign a new license to those projects.
