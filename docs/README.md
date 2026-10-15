# Documentation guide: how this project works

This folder explains the reasoning behind the experiments. These are reading guides, not programs you need to run.

If you are new to the project, read the [main README](../README.md) first. For results, go directly to the [reports guide](../reports/README.md).

## Choose the question you want answered

| Your question | Document | What it explains |
|---|---|---|
| What exactly is being measured? | [METHODOLOGY.md](METHODOLOGY.md) | The rules, differences between experiments, scoring, and limitations |
| Where is Jev introduced? Where is its template? | [JEV-INTEGRATION.md](JEV-INTEGRATION.md) | The pipeline, request structure, API call, and code locations |
| Did this project use other people's repositories? | [PROVENANCE.md](PROVENANCE.md) | All 12 public source projects, dataset origins, task counts, and attribution |
| What is published and what stays on the computer? | [GITHUB.md](GITHUB.md) | The publication boundary, safe checks, and sample-replay procedure |
| How can I adapt this to my work? | [Workflow examples](../README.md#using-the-idea-in-your-own-workflow) | The reusable search-then-select pattern and what a new adapter would require |

`README.md` is this navigation page. The other four files are more detailed explanations. Nothing in this folder supplies hidden answers to the AI services or changes their requests.

## The most important distinction

There are three separate parts:

1. **Finding candidates:** ordinary local code searches for five plausible files.
2. **Choosing a candidate:** Jev and OpenAI each select one of those five.
3. **Evaluating the choice:** separate historical labels determine whether the selection earns a reference-file hit.

If the expected file is absent from the shortlist, a correct choice is impossible under this scoring rule. That is why the reports show both overall accuracy and candidate coverage. The project does not generate or test fixes, so a reference-file hit is not proof of a solved software problem.

## How this idea can become a different workflow

Replace the source-file shortlist with a clearly defined set of options relevant to your task. Examples include routing a support request to a team or selecting an approved help article. A developer would need to supply your data, search rules, choice instruction, output mapping, scoring examples, and review/fallback behavior.

The repository's current programs are specifically for file localization. They do not already connect to a ticket system, email account, knowledge base, or production application. Any new integration should live separately from the frozen experiment code and be tested on fresh examples.

## Reading and running are different

Reading these documents and the public analyses needs no API key. Offline program checks use synthetic responses. Data preparation downloads public material but makes no paid provider calls. Only the explicitly marked smoke/full commands contact Jev and OpenAI. See [the tools guide](../tools/README.md) before running commands.
