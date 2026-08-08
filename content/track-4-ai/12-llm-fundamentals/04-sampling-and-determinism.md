---
title: "Sampling & Determinism"
description: "Temperature, top-p, and why the same prompt gives two answers."
track: 4
chapter: 12
page: 4
readMinutes: 3
---

:::info[Prerequisites]
**How LLMs Work** — the model returns a distribution, not a token.
:::

## The model proposes, the sampler disposes

The forward pass produces a score for every token in the vocabulary. Turning that
into one token is a separate, configurable step — and it is where variability comes
from.

- **Temperature** rescales the distribution before sampling. Below 1 sharpens it
  towards the most likely tokens; above 1 flattens it. At 0 the sampler becomes
  greedy: always take the argmax.
- **Top-p (nucleus)** keeps only the smallest set of tokens whose probabilities sum
  to `p`, then samples within it. It adapts: where the model is confident the set is
  tiny, where it is unsure the set is wide.
- **Top-k** keeps a fixed number of candidates regardless of confidence — blunter,
  and mostly superseded by top-p.

Tune one of temperature or top-p, not both. Moving them together makes the effect of
either impossible to reason about.

## Temperature 0 is not determinism

Greedy decoding removes the sampler's randomness, and it still won't guarantee
identical output across calls. Floating-point reductions on GPUs are not
associative, batching changes how requests are grouped, and providers update model
weights and serving stacks behind a stable model name. Near-ties in the
distribution can therefore flip.

If you need reproducibility, the honest options are: pin an explicit model version,
pass a `seed` where the provider supports it (best-effort, not a contract), and
**cache by prompt hash** so a repeat of the same input returns the same stored
answer. The cache is the only one of the three that actually guarantees anything.

## Choosing a setting

| Task | Setting | Why |
| --- | --- | --- |
| Extraction, classification, structured output | 0 – 0.2 | You want the single most likely parse |
| Summarisation, rewriting, general Q&A | 0.3 – 0.7 | Some variety without drifting from the source |
| Brainstorming, creative drafts | 0.8 – 1.0 | Range matters more than any single output |
| Ensembling / self-consistency | 0.7 – 1.0 | Diversity is the point — you sample *n* and vote |

A useful counter-intuition: low temperature does not mean "more accurate", it means
"more typical". If the most likely continuation is wrong, temperature 0 will produce
that wrong answer every single time, with complete confidence — and your evals will
look stable while being consistently wrong.

## Testing under non-determinism

Assertions on exact strings will flake. Test at a level that tolerates variance:
assert on schema validity, on a set of required facts, on numeric ranges, or use a
grader model with a rubric. Then run each case several times and track a *rate*
rather than a pass/fail — a check that passes 7 times in 10 is information, not a
flake to be retried away.
