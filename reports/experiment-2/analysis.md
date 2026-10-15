# Experiment 2 analysis

Saved full-run reports only; no provider calls or benchmark changes.

Integrity checks passed for manifest, evidence, labels and audit hashes. Correctness was recomputed from labels. Both provider requests contain matching issue text and candidate evidence on all 40 tasks. This verifies saved artifacts, not provider training-data provenance or hidden internal behavior.

## Main results

| Metric | Jev | OpenAI gpt-6-astra |
|---|---:|---:|
| Correct file selections | 15/40 (37.5%) | 17/40 (42.5%) |
| Valid responses | 40/40 | 40/40 |
| Mean latency | 185.7 ms | 2,918.4 ms |
| Median latency | 162.7 ms | 2,601.5 ms |
| p95 latency | 262.5 ms | 4,522.5 ms |

The ratio of mean latencies is 15.72. Jev used 93.64% less mean elapsed time in this run. No failures or timeouts were recorded. Latency includes full response transfer and parsing.

## Retrieval bottleneck

Only 17/40 tasks had a reference file among the five candidates. The other 23 cannot score a reference-file hit with a valid choice. The maximum possible primary accuracy is therefore 42.5%. Jev scored 15/17 (88.2%) and OpenAI 17/17 (100%) on the answerable subset. Keep 15/40 and 17/40 as the primary results; conditional accuracy is a diagnostic. No tasks should be replaced after observing outcomes.

## Paired correctness and disagreements

Both correct: 15; only Jev correct: 0; only OpenAI correct: 2; both wrong: 23. A two-sided exact paired binomial test on the two discordant correctness outcomes gives p=0.50. This small sample does not establish accuracy equivalence or a reliable accuracy difference.

- **django__django-13315**: Jev chose `django/db/models/fields/related.py`; OpenAI chose `django/forms/models.py`. Reference files: `django/forms/models.py`.
- **matplotlib__matplotlib-23476**: Jev chose `lib/matplotlib/backend_bases.py`; OpenAI chose `lib/matplotlib/figure.py`. Reference files: `lib/matplotlib/figure.py`.

There were 7 different file selections overall; the JSON report lists all of them, including disagreements where both missed.

## Repository breakdown

| Repository | Tasks | Answerable | Jev hits | OpenAI hits |
|---|---:|---:|---:|---:|
| astropy/astropy | 3 | 1 | 1 | 1 |
| django/django | 13 | 6 | 5 | 6 |
| matplotlib/matplotlib | 6 | 3 | 2 | 3 |
| pydata/xarray | 1 | 0 | 0 | 0 |
| pylint-dev/pylint | 2 | 0 | 0 | 0 |
| pytest-dev/pytest | 1 | 1 | 1 | 1 |
| scikit-learn/scikit-learn | 1 | 1 | 1 | 1 |
| sphinx-doc/sphinx | 6 | 3 | 3 | 3 |
| sympy/sympy | 7 | 2 | 2 | 2 |

Small and uneven repository samples limit comparisons between repositories.

## Clue sensitivity

| Group | Tasks | Answerable | Jev hits | OpenAI hits |
|---|---:|---:|---:|---:|
| flagged | 6 | 4 | 4 | 4 |
| unflagged | 34 | 13 | 11 | 13 |

Flagged means a candidate path/module mention, explicit answer language, or embedded patch according to the fixed heuristic. Natural paths and tracebacks can be legitimate issue evidence. Flags do not prove contamination, and unflagged does not prove clue absence. This is a post-run sensitivity analysis, not a new primary benchmark.

## Provider order

| Order | Tasks | Jev mean ms | OpenAI mean ms |
|---|---:|---:|---:|
| jevFirst | 20 | 156.4 | 2925.7 |
| openaiFirst | 20 | 214.9 | 2911.1 |

The groups contain different tasks. Order and task difficulty are confounded, so this table cannot isolate a causal order effect. Alternation balances counts; a separate repeated, counterbalanced design would be needed for that claim.

## Usage and cost

- jev: returned model jev-1.13.0; usage available on 40/40 requests; input tokens 223,388; output tokens 2,320; cost reported on 0/40 requests.
- openai: returned model gpt-6-astra; usage available on 40/40 requests; input tokens 177,632; output tokens 1,470; cost reported on 0/40 requests. Reported cached input tokens: 8,746 (4.9% of input tokens).

Missing costs are unknown, not zero. Token accounting differs between providers. Cache reporting is provider-native and has not been independently verified; do not describe this as a cold-cache comparison. Both providers have different internal behavior and compute budgets. No prices or dollar costs were inferred.

## Supported conclusion and next step

On this fixed 40-task file-localization sample, Jev returned valid choices with 15.7 times lower mean latency, while OpenAI matched the changed-file labels on two more tasks. Retrieval excluded all reference candidates on 23 tasks. This does not measure successful bug fixes or establish general superiority. Public historical tasks may have appeared in training data.

Preserve Experiment 2. For a future separate experiment, predeclare a stronger issue/source-only retrieval method, freeze a fresh sample and prompts before paid calls, and report both candidate coverage and provider selection accuracy. Do not inject reference files or tune against this sample and present it as new held-out evidence.
