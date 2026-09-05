# verigit

> Demo GIF: `verigit digest --strict` recording coming after VHS capture is configured.

A git repository intelligence CLI that generates AI-narrated activity digests, with every claim verified against the underlying stats before it's shown to you.

Verigit turns repository activity into summaries grounded in structured statistics rather than raw logs or diffs. Its validation pipeline checks both whether the numbers are cited correctly and whether the claims use those numbers with the right meaning.

## Install

```bash
npx verigit digest
```

Set `GROQ_API_KEY` in a root `.env` file before running digest commands. The `.env` file is ignored by Git.

## Commands

```bash
verigit report --since=30d --format=table
verigit report --since=90d --format=json
verigit digest --since=7d
verigit digest --since=7d --strict
```

`report` is the deterministic stats fallback. `digest` generates a concise natural-language summary from the stats contract. `--strict` enables deterministic citation checking, coverage checking, semantic judging, and one bounded repair attempt.

## How validation works

Verigit uses two complementary validation layers before a strict digest is accepted.

1. **Deterministic citation checking** verifies that every numeric figure in the digest exists in the structured stats and that required facts, including the reporting period and top churned file, are covered.
2. **Semantic judge verification** evaluates the complete digest against the validated stats schema. It checks metric attribution, reporting periods, unsupported claims, overgeneralization, causation, and other semantic failure modes.

If strict validation fails, Verigit makes one bounded regeneration attempt using the same structured stats and validation findings. The repaired digest is then sent through the full validation pipeline again. If it still fails, Verigit rejects it rather than printing an unverified summary.

The semantic judge uses structured Groq output and is evaluated against a labeled 20-case locked calibration set. The locked set is gated in CI before release evaluation can proceed.

## Failure-mode taxonomy

The semantic judge classifies unsupported or misused claims into six failure modes:

- **misinterpretation**: a supported value is attributed to the wrong metric or given the wrong meaning.
- **overgeneralization**: a bounded fact is extended into a universal or exhaustive claim the evidence does not support.
- **causation_error**: repository activity is presented as causing an outcome that the evidence does not establish.
- **temporal_error**: a value or claim is assigned to the wrong reporting period or comparison period.
- **insufficient_evidence**: the claim concerns a specific topic for which the supplied stats provide no meaningful evidence.
- **unsupported_claim**: the claim makes a repository assertion with no relevant numerical, file, range, or comparison anchor.

## Calibration results

Locked-set results from two observed runs:

| Run | Cases | Accuracy | F1 | False-positive rate | Gate |
| --- | ---: | ---: | ---: | ---: | --- |
| Local | 20 | 0.95 | 1.00 | 0.00 | Passed |
| GitHub Actions | 20 | 0.90 | 1.00 | 0.00 | Passed |

The release gate currently requires accuracy >= 0.90, F1 >= 0.90, and false-positive rate <= 0.05. Both observed locked-set runs passed all thresholds.

The accuracy range of 0.90-0.95 reflects run-to-run variance in LLM-judge evaluation, even with temperature set to 0. The remaining variance is most visible near genuine category boundaries. Results should be interpreted with care because some failure-mode categories have very small samples; `insufficient_evidence` has only one locked case. These results are useful evidence for the current version, not a statistically stable benchmark of general judge performance.

## What's built

Verigit v1 includes structured Git history parsing, repository statistics, SHA-keyed caching, table/JSON/Markdown reports, schema-grounded digest generation, deterministic citation and coverage checks, semantic claim judging, one bounded repair attempt, and CI-gated locked-set calibration.
