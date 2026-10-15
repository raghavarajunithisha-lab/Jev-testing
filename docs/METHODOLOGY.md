# Methodology and interpretation

These experiments test single-file localization: given an issue and five candidate source snippets, choose one file. A hit means the returned file overlaps a historical changed-production-file label. It does not establish that a patch works, that all necessary files were selected, or that a bug was fixed.

## Experiment 1

Development pilots, not a representative controlled sample. Three boltons PR descriptions already included solution details, and the local baseline was perfect. The five pytest tasks were a convenience subset described in the archived README. Jev was evaluated on all five; the saved Jev/OpenAI comparison is one task only.

## Experiment 2

40 tasks were selected from the official SWE-bench Lite test split using a fixed SHA-256 seed ordering, excluding the original five pytest IDs. All production Python files at each task's base commit were considered. A fixed lexical frequency rank selected five candidates and bounded snippets. No reference-file injection, favorable-result resampling or label-based retrieval tuning was used. Jev and OpenAI received identical issue/candidate evidence in their API schemas. Candidate coverage: 17/40. All 40 remain in primary accuracy. The two-task smoke check reused tasks later present in full, so it was not a cold-cache full run.

## Experiment 3

The protocol was chosen after observing Experiment 2's retrieval limitation, then frozen before evaluating a fresh sample. Exclude all 40 Experiment 2 IDs plus the original five pytest IDs. Fixed seed ordering selects 42 tasks: 40 full and two reserved smoke tasks, with zero overlap. BM25 file/passage ranking, fixed issue path/module boosts and bounded line-numbered snippets replace the simple lexical method. The code, configuration, exclusions, sample and partitions were frozen before the coverage audit. Once sealed, preparation validates rather than rebuilds. Candidate coverage: 31/40. There was no post-audit tuning, replacement or reference injection.

## Shared evaluation

- Both providers see the same complete issue and the same five candidate file paths/snippets. Only schema-specific choice/JSON output instructions differ.
- Historical patches and reference paths are evaluation labels, not provider-prompt evidence. Source is from the pre-fix base commit.
- Jev is a selector after local retrieval. OpenAI is an independent alternative selector over the same evidence.
- Alternate provider order. Record complete response latency, validity, HTTP errors, timeouts, model identifiers, native usage and cost only if returned.
- Preserve failures, preparation failures and retrieval misses in the primary denominator. No automatic paid retries or silent overwrites.
- Reference-covered accuracy is secondary and must be reported alongside overall accuracy. Clue exclusion is a sensitivity analysis, not a replacement primary result.
- The exact benchmark harness does not invoke SWE-bench's Docker evaluation, build patches, install the target projects, or execute their test suites.

The default requests do not guarantee matching internal compute or determinism across providers. Recorded latency measures provider response/transfer/parsing time, not retrieval time or end-to-end repair. Public historical tasks may have appeared in training. Samples are small and uneven across repositories. Experiments 2 and 3 use different tasks, so their score difference is not a controlled causal measurement of retrieval improvement. Small observed accuracy differences do not prove equality or superiority.
