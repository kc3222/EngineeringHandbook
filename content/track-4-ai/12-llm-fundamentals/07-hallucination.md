---
title: "Hallucination"
description: "Why it happens, and the four mitigations that actually move the number."
track: 4
chapter: 12
page: 7
readMinutes: 3
---

:::info[Prerequisites]
**How LLMs Work**. This page is the consequence of everything on that one.
:::

## Why it is the default

The model returns a distribution over next tokens and something is always sampled.
There is no state meaning "I don't know" — only a flatter distribution, which still
yields a confident-sounding sentence. Fluency and factuality are produced by the same
mechanism, so the surface of an answer carries almost no signal about its truth.

Predictable high-risk zones:

- Precise identifiers: citations, DOIs, case numbers, API method names, version numbers.
- Anything after the training cutoff.
- Long-tail entities the corpus barely covered.
- Questions built on a false premise — the model tends to answer the question as posed.

## The four mitigations that move the number

**1. Ground it.** Retrieve the source material and instruct the model to answer only
from it, with an explicit escape hatch: *"if the answer isn't in the material, say
so."* This is what RAG is for, and it's the largest single improvement available.

**2. Constrain the output.** A schema with enumerated values removes the room to
invent. Extraction with `"status": "active" | "suspended" | "closed"` cannot produce
a fourth status; free-text extraction can.

**3. Verify outside the model.** Check the claims that are checkable: does the cited
document ID exist, does the SQL parse, does the code compile, does the number match
the source row? Verification is a normal program, and it's cheaper and more reliable
than asking the model to double-check itself.

**4. Give it tools.** A calculator, a search index, a database query. The model
should route to a source of truth rather than reconstruct facts from weights.

## What helps less than expected

Asking the model for a confidence score yields a fluent number, not a calibrated
one. Asking "are you sure?" often flips a correct answer to an incorrect one, since
the pressure to agree is stronger than the fact. Self-critique passes catch
formatting and reasoning slips more reliably than they catch fabricated facts — the
model has no independent access to the truth on the second pass either.

## Designing for it

Assume some rate of wrong output and decide what it costs. A drafting tool with a
human reviewer can tolerate a lot; a system that files a claim or sends a message
cannot. Where the cost is high, the answer is usually structural — grounding, a
verifier, or a human in the loop — rather than a better prompt.

Surface sources next to claims wherever possible. A user who can click through to the
paragraph an answer came from can catch what your pipeline can't.
