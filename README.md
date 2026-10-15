# Jev and OpenAI: choosing the right file from a shortlist

This project asks a small, practical question: **when you already have five possible files, how quickly and accurately can an AI service choose the one related to a reported software problem?**

It compares Jev with OpenAI on historical problems from public software projects. You can read the results without writing code or paying for an API. Running a new comparison is optional and can cost money.

The programs **choose files**. They do not write a fix, change the public projects, or prove that a bug has been repaired.

## Start here

| What you want to do | Where to go |
|---|---|
| Understand the idea without running anything | Continue reading this page |
| Read the completed results | [Reports guide](reports/README.md) |
| Understand the early trials | [Experiment 1](experiment-1/README.md) |
| Understand the first 40-problem comparison | [Experiment 2](experiment-2/README.md) |
| Understand the fresh comparison with better search | [Experiment 3](experiment-3/README.md) |
| Find the Jev request template and API call | [Jev integration](docs/JEV-INTEGRATION.md) |
| See which public projects supplied the problems and code | [Source projects and provenance](docs/PROVENANCE.md) |
| Learn how to adapt this idea to your own work | [Workflow examples below](#using-the-idea-in-your-own-workflow) |

## The idea, with a simple example

Imagine someone reports, “The application displays the wrong date.” A large project could contain hundreds of files. Sending every file to an AI service would be expensive and difficult to evaluate.

This project separates the work into two steps:

1. **Find a shortlist.** Ordinary search code on your computer looks through the original source and selects five likely files.
2. **Choose from the shortlist.** Jev and OpenAI independently receive the same problem description and the same five file excerpts. Each chooses one file.

After both answers arrive, the program checks whether the choice matches a file changed by the historical fix. Those historical answer labels are kept out of the search and AI requests.

```text
Original problem + original source code
                  |
                  v
        Local search: five candidates
                  |
          +-------+-------+
          |               |
          v               v
       Jev API        OpenAI API
          |               |
          v               v
      One choice      One choice
          |               |
          +-------+-------+
                  |
                  v
     Check answers and record response times
```

An **API** is a way for this program to send a request to an external service. Jev is used at the choice step. It is not installed into Django, pytest, or any of the other public projects, and it does not do the local search in these experiments.

## What each experiment does

| Experiment | Purpose | What happened |
|---|---|---|
| [1: early trials](experiment-1/README.md) | Check the idea on a few known examples | A three-problem boltons search, a five-problem pytest trial, and a saved one-problem Jev/OpenAI comparison |
| [2: broader comparison](experiment-2/README.md) | Compare both services on 40 fixed problems | Simple word-based search produced five candidates per problem; many shortlists missed the historical answer |
| [3: stronger search, fresh problems](experiment-3/README.md) | Evaluate a revised search method on a separate sample | More careful file/passage search; 40 new full-run problems and two separate connection-check problems |

Experiments 2 and 3 use public SWE-bench Lite problems. SWE-bench normally evaluates software fixes; this project uses a narrower file-choice task. Experiment 3 excludes all Experiment 2 problems and the original five pytest problems.

## Results and what they mean

| Recorded full run | Jev correct choices | OpenAI correct choices | Jev average response | OpenAI average response | Problems with a historical answer in the shortlist |
|---|---:|---:|---:|---:|---:|
| Experiment 2 | 15/40 (37.5%) | 17/40 (42.5%) | 185.7 ms | 2,918.4 ms | 17/40 |
| Experiment 3 | 28/40 (70%) | 30/40 (75%) | 270.2 ms | 2,971.6 ms | 31/40 |

A millisecond, written **ms**, is one thousandth of a second. The recorded averages make Jev about 15.7 times faster in Experiment 2 and 11 times faster in Experiment 3 for this response task. OpenAI selected a historical reference file on two more problems in each run. Both full runs received valid choices from both services on all 40 problems.

The shortlist matters. If none of the five candidates is a historical reference file, neither service can earn a correct score by choosing one of them. We still count those problems in overall accuracy. When an answer was available, Experiment 3 scores were Jev 28/31 and OpenAI 30/31; those are additional diagnostics, not replacements for 28/40 and 30/40.

These are small public samples, and the providers may have seen the problems during training. The two experiments use different problems, so higher scores in Experiment 3 do not by themselves prove that search was the only cause. Response time is not bug-fixing time, and a small score difference does not prove equal accuracy or general superiority. See the [full methodology](docs/METHODOLOGY.md).

## How the folders and files fit together

```text
Jev-testing/
  README.md             This starting guide
  package.json          Shortcuts for running checks; no extra packages required
  .gitignore            Keeps keys, downloads, and raw local reports out of Git
  .gitattributes        Preserves frozen program files across computers

  experiment-1/         Early pilots; preserved for context
  experiment-2/         First 40-problem comparison
  experiment-3/         Fresh comparison with revised search
  docs/                 Method, Jev integration, sources, and publication details
  reports/              Public results and the original task lists
  tools/                Small utilities for checks and fresh-checkout preparation
```

Each experiment README explains its individual files. The [docs guide](docs/README.md), [reports guide](reports/README.md), and [tools guide](tools/README.md) explain every file in those folders.

Some folders exist on the original computer but are intentionally absent from GitHub:

| Local material | What it contains | Why it stays local |
|---|---|---|
| `experiment-2/data/` and `experiment-3/data/` | Downloaded dataset, task list, issue/candidate evidence, separate answer labels, checks, request previews | Avoid publishing complete issue/source snapshots and raw requests |
| `experiment-2/cache/` and `experiment-3/cache/` | Copies of public source at the original revisions | Large downloads; source belongs to the upstream projects |
| Each experiment's `results/` | Original local run reports, including full requests and responses | Public copies include selected safe fields instead |
| Experiment 1's input snapshots | Historical boltons/pytest inputs and original reports | Archived local inputs are not bundled in a fresh clone |

An absent local `data/` folder in a fresh GitHub download is expected. It does not mean that results are missing: the reviewed public copies are in `reports/`.

## Use the project without making paid calls

### Read-only route: no software setup needed

Open [reports/README.md](reports/README.md), then the experiment's `analysis.md`. GitHub displays these pages directly in your browser. You do not need an API key or a terminal to read them.

### Check the programs: no provider calls

To run commands, install Node.js version 22 or newer and Git first. The examples use Windows PowerShell. No `npm install` is required because the programs use Node's built-in features.

From a folder where you want to download the project:

```powershell
git clone https://github.com/raghavarajunithisha-lab/Jev-testing.git
cd .\Jev-testing
node .\tools\verify-project.mjs
```

If you already have this project, open PowerShell in its top-level folder and run only the last command. `npm test` is a shortcut for the same check.

The checks use made-up test responses, not paid AI requests. On a fresh clone, the legacy Experiment 1 input check says it is skipped because those old snapshots are local-only. That expected skip does not invalidate the Experiment 2/3 checks.

### Prepare the original sample on a fresh checkout

These commands download public data and source, but make no paid provider calls. Run them from the project's top-level folder:

```powershell
node .\tools\prepare-replay.mjs 3
node .\experiment-3\bench.mjs run --dry-run
```

For Experiment 2, use `2` in the first command and `experiment-2` in the second. This preparation restores the published task list and checks that the official dataset matches its recorded fingerprint. The dry run saves request previews and checks readiness without contacting either AI provider.

**Already-completed local experiments do not need preparation again.** The replay helper refuses to overwrite their data. Read the reports instead. If a download fails or a fingerprint differs, preserve the files and read the error; do not invent replacement problems or delete results to force a rerun.

## Optional: make a new paid comparison

Do this only in a prepared checkout with no existing report for that run. Each experiment refuses to silently overwrite its previous results.

1. Enter both API keys securely in the same PowerShell window:

```powershell
$secret = Read-Host 'OpenAI API key' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
$secret = Read-Host 'Jev / Typesafe API key' -AsSecureString
$env:TYPESAFE_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
```

The keys stay in that terminal's environment. Do not put real keys in a README, screenshot, Git commit, or chat. Experiments 2 and 3 do not load a `.env` file.

2. Run the small connection check, called a **smoke test**:

```powershell
node .\experiment-3\bench.mjs run --smoke
```

This makes up to four paid calls: two problems, sent to both providers. Experiment 3 reserves these problems separately from the full run. Do not change the frozen settings based on the smoke score.

3. Run the full comparison:

```powershell
node .\experiment-3\bench.mjs run
```

This makes up to 80 paid calls: 40 problems, sent to both providers. Reports are saved under `experiment-3/results/full/`. There are no automatic retries. If you see “report already exists,” preserve that report rather than deleting it to trigger new spending.

The requests use `gpt-6-astra` and `jev-latest`. The latter is an alias that can change; the completed runs recorded `jev-1.13.0`. Future service access, behavior, latency, and answers may differ. Costs are unknown when the service does not return a cost; missing cost is not zero.

## Using the idea in your own workflow

The reusable idea is **search first, then ask a service to choose from a small, clearly described set**. The experiments implement that for source files; the following business examples would need a separate adapter and evaluation. They are not integrations already built into this repository.

| Example workflow | Your first step | What a selector could choose | How to check it |
|---|---|---|---|
| Route support requests | Find five plausible teams using your routing rules | The best team for the request | Compare with reviewed historical routing decisions |
| Find a help article | Search your approved knowledge base | The most useful article from five excerpts | Have a reviewer judge whether it answers the request |
| Help developers investigate bugs | Search your own source at the relevant revision | A file worth inspecting first | Compare with reviewed fixes, then test any later patch separately |

To adapt the pattern:

1. Write one decision in plain language, such as “Which team should review this request?” Define what a correct choice means.
2. Collect examples that are appropriate to send to the services. Keep expected answers separate from request text.
3. Build a shortlist using your own search or rules. Measure how often the expected answer actually appears in it.
4. Write a choice template with stable option keys, such as `f0` to `f4`. A developer would replace this project's file-specific instructions and evidence for the new task.
5. If comparing providers, give them matching evidence and freeze your examples/settings before viewing scores. Do not remove failures or choose only favorable examples.
6. Measure overall accuracy, shortlist coverage, response time, failures, and available usage/cost. Compare against the simple alternative of taking the first search result.
7. Decide what happens when the choices are unsuitable. This benchmark forces one of five choices; a business adaptation might need a newly designed “none fit” or human-review path. That behavior is not currently implemented here.
8. Test on a fresh set before deploying. Treat these results as an example of evaluation, not a guarantee for your data or workflow.

You do not need to use both providers in a final product. Both are included here to compare the same decision. For a new workflow, copy the design into a separate project or experiment rather than editing the frozen benchmark programs.

## Small glossary

| Word in the files | Plain-language meaning |
|---|---|
| Candidate | One possible answer offered to the AI |
| Retrieval | The first search step that builds the shortlist |
| Baseline | A simpler method used for comparison, such as choosing search's first result |
| Reference / label | The historical expected file used for scoring |
| Coverage | How often the shortlist contains at least one expected answer |
| Manifest | The saved list of chosen problems and fixed settings |
| Seed | A fixed starting value that makes selection repeatable |
| Hash / fingerprint | A code used to detect whether saved content has changed |
| Smoke test | A small check that the requests and accounts work |
| Dry run | A readiness check and request preview without AI calls |
| Latency | Elapsed time for a provider response |
| `.mjs` | A JavaScript program you run with Node.js |
| `.json` | A structured data file that software can read |
| `.md` | A readable document, such as this README |

## More detail

- [How Jev is called and where the template lives](docs/JEV-INTEGRATION.md)
- [Exact experimental rules and limitations](docs/METHODOLOGY.md)
- [Public repositories, task counts, and attribution](docs/PROVENANCE.md)
- [What is published and how to reproduce the sample](docs/GITHUB.md)

Upstream projects keep their own licenses. This repository has not selected a new project-wide reuse license. The publication and provenance notes explain the current attribution and publication boundary.
