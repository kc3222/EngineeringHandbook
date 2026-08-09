---
title: "Hallucination"
description: "Why it happens, and the four mitigations that actually move the number."
track: 4
chapter: 12
page: 7
readMinutes: 5
---

:::info[Prerequisites]
**How LLMs Work**. This page is the consequence of everything on that one.
:::

## Why it is the default

The model returns a distribution over next tokens and something is always sampled.
There is no state meaning "I don't know" — only a flatter distribution, which still
yields a confident-sounding sentence. Fluency and factuality are produced by the same
mechanism, so the surface of an answer carries almost no signal about its truth.

There is also a training-side reason worth knowing, because it explains why the problem
is stubborn rather than a bug awaiting a patch. Pretraining rewards predicting plausible
text, not abstaining. Evaluations that score a right answer as 1 and both a wrong answer
and "I don't know" as 0 make guessing strictly better than admitting uncertainty — so a
model optimised against them learns to guess. Under those incentives, confident
fabrication is the trained behaviour, not a failure of it.

It's useful to split the failure in two, because the fixes differ:

- **Extrinsic** — the answer contradicts the world. The fact is simply wrong.
- **Intrinsic** — the answer contradicts the source material it was given. Grounding was available and wasn't followed.

Retrieval attacks the first. Prompting, constraints, and verification attack the
second — and a system that retrieves well can still fail intrinsically, which is why
**Evaluating a RAG System** measures faithfulness separately from correctness.

Predictable high-risk zones:

- Precise identifiers: citations, DOIs, case numbers, API method names, version numbers, package names.
- Anything after the training cutoff.
- Long-tail entities the corpus barely covered.
- Questions built on a false premise — the model tends to answer the question as posed rather than challenge it.
- Aggregation and counting over supplied material, where each item is right and the total isn't.

## The four mitigations that move the number

**1. Ground it.** Retrieve the source material and instruct the model to answer only
from it, with an explicit escape hatch: *"if the answer isn't in the material, say
so."* This is what RAG is for, and it's the largest single improvement available. The
escape hatch is not optional — without explicit permission to decline, the model falls
back on its weights and the answer is indistinguishable in tone from a grounded one.

**2. Constrain the output.** A schema with enumerated values removes the room to
invent. Extraction with `"status": "active" | "suspended" | "closed"` cannot produce
a fourth status; free-text extraction can. Where the provider supports constrained
decoding, this is a guarantee rather than a request.

**3. Verify outside the model.** Check the claims that are checkable: does the cited
document ID exist, does the SQL parse, does the code compile, does the number match
the source row, does the package exist on the registry? Verification is a normal
program, and it's cheaper and more reliable than asking the model to double-check
itself. Most systems have far more checkable claims than they exploit.

**4. Give it tools.** A calculator, a search index, a database query. The model
should route to a source of truth rather than reconstruct facts from weights. This
converts a knowledge problem into a routing problem, which is a much easier problem.

## What helps less than expected

**Asking for a confidence score** yields a fluent number, not a calibrated one. Models
are poor at reporting their own uncertainty in words, and the number will look
reasonable while carrying little signal.

**Asking "are you sure?"** often flips a correct answer to an incorrect one. The
pressure to agree with an implied correction is stronger than the fact.

**Self-critique passes** catch formatting and reasoning slips more reliably than they
catch fabricated facts — the model has no independent access to the truth on the second
pass either. A critique pass with *new evidence* (a retrieval step, a tool result) is a
different and much more effective thing than a critique pass on the same context.

**A better prompt** has a ceiling. If a fact isn't in the weights and isn't in the
context, no phrasing produces it.

There is one uncertainty signal with real support, if you can afford it: **sampling the
same question several times and measuring whether the answers agree in meaning.** High
disagreement across samples is a reasonably good indicator that the model is
confabulating. It costs `n` calls, which limits it to high-stakes paths — but unlike a
self-reported confidence score, it measures something.

## Designing for it

Assume some rate of wrong output and decide what it costs. A drafting tool with a
human reviewer can tolerate a lot; a system that files a claim or sends a message
cannot. Where the cost is high, the answer is usually structural — grounding, a
verifier, or a human in the loop — rather than a better prompt.

Concretely, the questions worth answering before shipping:

- **What's the blast radius of a wrong answer?** Read-only advice, an outbound message, and an irreversible transaction are three different risk tiers and deserve three different amounts of machinery.
- **Who checks, and can they?** A reviewer who can't verify the claim isn't a control. Surfacing sources is what turns nominal review into real review.
- **What happens on "I don't know"?** A path that only handles success will paper over abstention with something worse.
- **How would you find out?** Track refusal rates and user corrections; both move before anyone files a bug.

Surface sources next to claims wherever possible. A user who can click through to the
paragraph an answer came from can catch what your pipeline can't — and the same
affordance is what makes the failure visible to you rather than silent.

## What to take away

- Hallucination is the default behaviour of the mechanism, reinforced by evaluations that reward guessing over abstaining. It is managed, not fixed.
- Separate extrinsic (wrong about the world) from intrinsic (wrong about the supplied source) — retrieval fixes one, grounding discipline the other.
- The four levers that work: retrieve, constrain the output, verify externally, and give it tools.
- Self-reported confidence and "are you sure?" are not controls. Sampling-based agreement is, at `n` times the cost.
- Design around an assumed error rate: know the blast radius, make review possible, and handle abstention as a real branch.

## References

- Ji et al., [*Survey of Hallucination in Natural Language Generation*](https://arxiv.org/abs/2202.03629) (2022) — the intrinsic/extrinsic distinction
- Kalai et al., [*Why Language Models Hallucinate*](https://arxiv.org/abs/2509.04664) (2025) — the training and evaluation incentives argument
- Farquhar et al., [*Detecting hallucinations in large language models using semantic entropy*](https://www.nature.com/articles/s41586-024-07421-0) (Nature, 2024) — sampling-based uncertainty
- Sharma et al., [*Towards Understanding Sycophancy in Language Models*](https://arxiv.org/abs/2310.13548) (2023) — why "are you sure?" backfires
- [OWASP — GenAI / LLM Top 10](https://genai.owasp.org/llm-top-10/) · [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
