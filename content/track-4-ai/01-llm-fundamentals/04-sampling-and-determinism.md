---
title: "Sampling & Determinism"
description: "Temperature, top-p, and why the same prompt gives two answers."
track: 4
chapter: 1
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**How LLMs Work** — the model returns a distribution, not a token.
:::

## The model proposes, the sampler disposes

The forward pass produces a score for every token in the vocabulary. Turning that
into one token is a separate, configurable step — and it is where variability comes
from.

- **Temperature** rescales the logits before the softmax. Below 1 sharpens the
  distribution towards the most likely tokens; above 1 flattens it. At 0 the sampler
  becomes greedy: always take the argmax.
- **Top-p (nucleus)** keeps only the smallest set of tokens whose probabilities sum
  to `p`, then samples within it. It adapts: where the model is confident the set is
  tiny, where it is unsure the set is wide.
- **Top-k** keeps a fixed number of candidates regardless of confidence — blunter,
  and mostly superseded by top-p.

Tune one of temperature or top-p, not both. Moving them together makes the effect of
either impossible to reason about, and some providers reject the combination outright.

Why nucleus sampling exists at all is worth one line: pure greedy decoding on
open-ended text produces repetitive, degenerate output, because the single most likely
continuation is often "say that again". Truncating the distribution's long tail while
keeping some randomness above it was the fix.

Two secondary controls appear in most APIs. **Frequency and presence penalties**
discount tokens that have already appeared, discouraging loops — useful for long-form
generation, harmful for anything where legitimate repetition matters, like code or
tabular output. **Stop sequences** end generation when a string appears, which is a
cheap way to cut off a format without spending tokens on it.

## Temperature 0 is not determinism

Greedy decoding removes the sampler's randomness, and it still won't guarantee
identical output across calls. The reasons are all in the serving stack rather than the
model:

- **Floating-point reductions on GPUs are not associative.** Summing the same numbers in a different order gives fractionally different results.
- **Batching changes that order.** Your request is grouped with whatever else arrived at the same time, so the kernel's reduction shape varies with unrelated traffic.
- **Providers update weights and serving software behind a stable model name.** The alias you pinned may not be the artefact you tested against.

Any of these can flip a near-tie in the distribution, and one flipped token changes
every token after it. If you need reproducibility, the honest options are: pin an
explicit model version rather than an alias, pass a `seed` where the provider supports
one (best-effort, not a contract), and **cache by prompt hash** so a repeat of the same
input returns the same stored answer. The cache is the only one of the three that
actually guarantees anything.

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
look stable while being consistently wrong. Deterministic and correct are independent
properties.

Note also that several recent model families have removed sampling parameters
altogether, replacing them with a coarser "how much effort to spend" control. Where
that's the case, the levers below — structure and ensembling — are what you have left,
which is a reason to understand them rather than to rely on temperature.

## Constraining rather than tuning

Turning temperature down is a weak way to get reliable structure. Two stronger tools:

**Constrained decoding.** If the API supports a response schema or strict tool
parameters, the runtime masks out tokens that would make the output invalid. The result
is *guaranteed* to parse — a categorically different guarantee from "we asked nicely and
set temperature to 0". Where it's available, use it; it eliminates an entire class of
retry logic.

**Self-consistency.** For problems with a single right answer arrived at by reasoning,
sample several answers at a moderate temperature and take the majority. It costs `n`
times as much and measurably improves accuracy on multi-step tasks — a real
accuracy-for-money trade, and one worth making selectively for the queries that warrant
it rather than uniformly.

## Testing under non-determinism

Assertions on exact strings will flake. Test at a level that tolerates variance:
assert on schema validity, on a set of required facts, on numeric ranges, or use a
grader model with a rubric.

Then run each case several times and track a **rate** rather than a pass/fail — a check
that passes 7 times in 10 is information, not a flake to be retried away. That number is
also the only honest basis for a regression test: a suite that runs each case once will
report improvements and regressions that are indistinguishable from noise. Fix the seed
and the model version where you can, accept that the residual variance is real, and set
thresholds on rates rather than on individual runs.

## What to take away

- Sampling is a separate, configurable step after the model; it is where run-to-run variation comes from.
- Tune temperature *or* top-p, never both.
- Temperature 0 is not determinism — batching, floating-point non-associativity, and silent model updates all break it. Only a cache guarantees a repeat.
- Low temperature buys typicality, not accuracy. A confidently wrong answer becomes a consistently wrong answer.
- Prefer constrained decoding over prompt-plus-low-temperature when you need valid structure.
- Evaluate with rates over repeated runs; a single-run suite cannot distinguish a regression from noise.

## References

- Holtzman et al., [*The Curious Case of Neural Text Degeneration*](https://arxiv.org/abs/1904.09751) (2019) — the nucleus sampling paper
- Wang et al., [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171) (2022)
- Willard & Louf, [*Efficient Guided Generation for Large Language Models*](https://arxiv.org/abs/2307.09702) (2023) — how constrained decoding works
- [Anthropic — structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · [OpenAI — structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
