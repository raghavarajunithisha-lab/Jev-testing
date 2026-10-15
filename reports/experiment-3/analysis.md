# Experiment 3 findings

Read-only analysis of the completed 40-task full run. Smoke results are excluded. No new API calls or changes to benchmark inputs/reports.

Integrity checks passed for frozen hashes, runner/protocol hash, previous-experiment exclusions, full/smoke separation, task order, both providers’ saved issue/candidate evidence, choice-to-file mapping and recomputed scores. These checks validate saved artifacts, not provider training provenance or hidden behavior.

## Main results

| Metric | Jev | OpenAI gpt-6-astra |
| --- | --- | --- |
| Reference-file hits | 28/40 (70.0%) | 30/40 (75.0%) |
| Hits when reference available | 28/31 (90.3%) | 30/31 (96.8%) |
| Valid answers | 40/40 | 40/40 |
| mean latency (ms) | 270.2 | 2971.6 |
| median latency (ms) | 191.1 | 2490.5 |
| p95 latency (ms) | 558.1 | 5132.6 |

Jev had 11.00 times lower mean latency and was faster on 40/40 tasks. The mean elapsed-time reduction was 90.91%. Both providers returned valid choices on all tasks; no failures/timeouts were recorded. Latency measures complete provider response transfer/parsing, not software repair or retrieval time.

## Retrieval and diagnostic baseline

Reference coverage was 31/40 (77.5%). Nine tasks cannot earn a reference hit with the supplied candidates; they remain in the primary denominator. Of the 31 covered tasks, Jev missed three and OpenAI missed one. Coverage is higher than Experiment 2’s 17/40, but the fresh task sample prevents isolating the causal effect of retrieval.

Selecting the first retrieval candidate without either provider would score 22/40 (55.0%). This is a post-run diagnostic, not a new preregistered primary comparison. It helps assess whether provider selection adds value over retrieval ranking.

## Paired correctness and task disagreements

Both correct: 28; only Jev correct: 0; only OpenAI correct: 2; both wrong: 10. Two-sided exact paired binomial p=0.500 (binomial null probability 0.5 on the 2 discordant correctness outcomes). This small sample does not establish an accuracy difference or equivalence. The observed difference is 5 percentage points in OpenAI’s favor.

| Task | Jev choice | OpenAI choice | Correct provider | Clue flagged |
| --- | --- | --- | --- | --- |
| pytest-dev__pytest-8906 | `src/_pytest/outcomes.py` | `src/_pytest/python.py` | OpenAI | no |
| matplotlib__matplotlib-26011 | `lib/matplotlib/axes/_base.py` | `lib/matplotlib/axis.py` | OpenAI | yes |

There were 4 different file choices overall. The companion JSON lists all disagreements, references and whether a reference candidate was available.

Both providers also missed **psf__requests-2148**, selecting `requests/packages/urllib3/response.py` while the reference was `requests/models.py`. That reference was available among the candidates. The choices alone do not establish why they missed it.

Relative to selecting the first retrieval candidate, jev corrected 7 misses and overrode 1 correct first choices; openai corrected 9 misses and overrode 1 correct first choices.

## Clue sensitivity

| Group | Tasks | Reference available | Jev hits | OpenAI hits |
| --- | --- | --- | --- | --- |
| flagged | 14 | 13 | 11/14 | 12/14 |
| unflagged | 26 | 18 | 17/26 | 18/26 |

Flags come from the fixed candidate path/module, explicit answer-language and embedded-patch heuristics. Natural issue paths and tracebacks can be valid evidence; these flags do not establish label leakage. Unflagged tasks are not proven clue-free. Removing flags is a post-run sensitivity analysis only; retain all 40 tasks as the primary result.

All 14 flagged tasks had candidate path/module mentions; 0 triggered explicit answer language and 0 contained a detected patch. On covered, unflagged tasks, Jev scored 17/18 and OpenAI 18/18.

## Repository results

| Repository | Tasks | Reference available | Jev hits | OpenAI hits |
| --- | --- | --- | --- | --- |
| django/django | 13 | 11 | 11 | 11 |
| matplotlib/matplotlib | 3 | 2 | 1 | 2 |
| pallets/flask | 1 | 1 | 1 | 1 |
| psf/requests | 2 | 2 | 1 | 1 |
| pylint-dev/pylint | 1 | 0 | 0 | 0 |
| pytest-dev/pytest | 3 | 2 | 1 | 2 |
| scikit-learn/scikit-learn | 4 | 4 | 4 | 4 |
| sphinx-doc/sphinx | 1 | 1 | 1 | 1 |
| sympy/sympy | 12 | 8 | 8 | 8 |

Samples are small and uneven; zero hits can reflect zero reference coverage rather than selection quality.

## Provider order

| Order | Tasks | Jev mean ms | OpenAI mean ms | Jev hits | OpenAI hits |
| --- | --- | --- | --- | --- | --- |
| jev first | 20 | 179.0 | 2793.1 | 15 | 16 |
| openai first | 20 | 361.3 | 3150.1 | 13 | 14 |

Each group has different tasks, so order is confounded with task difficulty. Alternation balances counts but does not isolate a causal order effect.

## Usage and costs

| Provider | Returned model | Input tokens | Output tokens | Usage records | Cost records |
| --- | --- | --- | --- | --- | --- |
| jev | jev-1.13.0 | 218110 | 2320 | 40/40 | 0/40 |
| openai | gpt-6-astra | 173623 | 1083 | 40/40 | 0/40 |

OpenAI reported 0 cached input tokens (0.0% of prompt tokens). Jev cache usage was not available in the analyzed fields. Accounting is provider-native and may differ. Missing dollar costs are unknown, not zero; no prices or dollar estimates were invented.

## Conclusion and next action

On this frozen sample, Jev was about 11 times faster in mean response latency; OpenAI had two more reference-file hits (30 versus 28). This is a latency/selection-accuracy tradeoff under this configuration, not evidence of equal accuracy, general superiority or successful bug fixes. Public SWE-bench tasks may have been seen in training.

Preserve Experiment 3 and use this report alongside Experiment 2. Before another paid experiment, inspect the disagreement tasks and the first-candidate baseline. Any new evaluation should use a separately preregistered design and avoid tuning on these frozen outcomes. No further calls are required to interpret this run.
