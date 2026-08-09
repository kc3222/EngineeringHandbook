---
title: "Foundation Models & Downstream Use"
description: "What the term claims, how language supervision changed vision, and the adaptation menu — ending with why you shouldn't pretrain."
track: 5
chapter: 18
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**Contrastive & Joint-Embedding Methods** and **Masked & Generative Prediction** — this
page is about using what they produce.
:::

## What the term means

A **foundation model** is one trained on broad data at scale that can be adapted to many
downstream tasks. The word was chosen deliberately to name a shift in how systems get
built: rather than training a model per task, you adapt one general model many times, and
its properties — including its weaknesses and biases — propagate to everything built on
top.

That homogenisation is the substantive claim, and it cuts both ways. An improvement to the
base model lifts every application at once. So does a defect: a bias, a blind spot, or a
gap in the pretraining data is inherited by every downstream system, and the downstream
teams generally have no visibility into what those are.

## Language as supervision

The idea that changed vision most in the last few years wasn't a better pretext task; it
was noticing that the internet supplies image–text pairs by the hundreds of millions, and
that the caption is a **free, rich label** nobody had to commission.

**CLIP** trains an image encoder and a text encoder jointly with a contrastive objective:
matching image–caption pairs are pulled together, mismatched pairs pushed apart. Two
consequences follow, and both were surprising at the time.

The image representation is shaped by natural language rather than by a fixed taxonomy of
1,000 classes, so it generalises across a much wider range of concepts. And because images
and text share an embedding space, you can classify **zero-shot** — embed the candidate
class names as text, embed the image, and take the nearest. A new classification task
becomes a list of strings rather than a training run.

Zero-shot performance is not free accuracy. It is sensitive to the exact wording of the
class prompts, it is much weaker on fine-grained and specialist categories poorly
represented in web data, and a linear probe on a few hundred labels usually beats it
comfortably. But as a baseline available in ten minutes with no labels at all, it changed
what "start of a project" looks like — and the shared embedding space is also what makes
cross-modal retrieval work, which is the mechanism behind text-to-image search and the
conditioning of image generation models.

## The adaptation menu

Given a pretrained encoder, the options, cheapest first:

| Approach | Trainable parameters | Labels needed | When |
| --- | --- | --- | --- |
| **Zero-shot** (CLIP-style) | None | None | Baseline in minutes; broad, common categories |
| **Frozen features + k-NN** | None | A handful per class | Tiny datasets, prototyping, few-shot |
| **Linear probe** | ~`D × C` | Hundreds | The reliable default. Cache features and it's near-instant |
| **PEFT (LoRA, adapters)** | ~0.1–1% | Thousands | Large models, many tasks, one shared backbone |
| **Full fine-tuning** | All | Tens of thousands | Large domain gap, highest ceiling, most overfitting risk |

The strong recommendation is to work down this list rather than starting at the bottom.
The frozen-feature options take minutes and establish what the representation already
knows; a fine-tune that fails to beat a linear probe is a signal that something is wrong —
too little data, too high a learning rate, or a validation split that isn't consistent
between the two runs.

Frozen features have an underrated engineering property: because they don't change, you
can compute them once and store them. Retrieval, clustering, deduplication, near-duplicate
detection, and anomaly detection all become vector operations over a precomputed table.
Modern self-supervised encoders like DINOv2 were explicitly designed to be used this way —
strong enough frozen that fine-tuning is often unnecessary.

## Choosing one

Match the pretraining objective to the downstream use, and the pretraining data to your
domain:

- **Language-aligned (CLIP-family)** when you need zero-shot classification, text-to-image retrieval, or a shared space with text.
- **Self-supervised vision (DINOv2-family)** when you need the strongest frozen features for dense tasks, retrieval, or clustering.
- **Masked-pretrained (MAE-family)** when you intend to fine-tune fully.
- **Domain-specific checkpoints** when your images are not natural photographs. A model pretrained on pathology slides, satellite imagery, or radiographs beats a general one on those tasks, usually by a lot.

And check the practical constraints before the accuracy numbers: the licence (several
prominent checkpoints carry non-commercial or research-only terms), the inference cost at
your latency budget, and whether the model's pretraining data plausibly overlaps your
evaluation set.

## Risks you inherit

Adopting a foundation model means adopting properties you didn't choose and can't fully
inspect.

**Bias from uncurated web data** transfers into every downstream classifier, and it is
not removed by fine-tuning on a small clean dataset. Subgroup evaluation is the minimum
diligence.

**Opacity of training data.** For many checkpoints you cannot enumerate what was in the
corpus, which makes contamination checks impossible and licence provenance uncertain.

**Silent version drift.** A hosted embedding model that changes underneath you invalidates
every stored vector, because embeddings from two versions are not comparable. Pin
versions; treat an embedding-model upgrade as a full reindex. (The AI track's **Embeddings
& Vector Search** covers the operational side of this.)

**Concentration.** A handful of organisations can afford to pretrain at this scale, so a
common failure mode becomes a common failure mode *everywhere*.

## Should you pretrain your own?

Almost certainly not. Pretraining a competitive foundation model requires compute measured
in thousands of accelerator-days, a data pipeline whose curation quality matters more than
its size, and an experimental budget for choices that can only be evaluated downstream.

The cases where it genuinely pays:

- A large unlabelled corpus in a domain far from web imagery — millions of medical scans, industrial inspection frames, satellite tiles — combined with very few labels.
- A hard requirement that data never leaves your infrastructure, and no suitable licensed checkpoint.
- Research on pretraining itself.

Even then, **continued pretraining** — taking a public checkpoint and running its
self-supervised objective further on your unlabelled domain data — captures much of the
benefit for a small fraction of the cost. It's the option most teams should reach for
before considering training from scratch, and the one most often overlooked.

## What to take away

- A foundation model is a shared base whose strengths *and* defects propagate to everything built on it.
- CLIP-style language supervision gave vision zero-shot classification and a shared image–text space; treat zero-shot as a fast baseline, not a ceiling.
- Work down the adaptation ladder — zero-shot, frozen features, linear probe, PEFT, full fine-tune — and stop when it stops improving.
- Match the pretraining objective to your use, and check licence and data provenance before accuracy.
- Pin model versions; an embedding model change invalidates every stored vector.
- Don't pretrain from scratch. Continued pretraining on your unlabelled domain data is the affordable version.

## References

- Bommasani et al., [*On the Opportunities and Risks of Foundation Models*](https://arxiv.org/abs/2108.07258) (2021)
- Radford et al., [*Learning Transferable Visual Models From Natural Language Supervision*](https://arxiv.org/abs/2103.00020) (2021) — CLIP
- Oquab et al., [*DINOv2*](https://arxiv.org/abs/2304.07193) (2024) — frozen features designed to be used without fine-tuning
- Hu et al., [*LoRA*](https://arxiv.org/abs/2106.09685) (2021) · [Hugging Face — PEFT](https://huggingface.co/docs/peft/index)
- Gururangan et al., [*Don't Stop Pretraining: Adapt Language Models to Domains and Tasks*](https://arxiv.org/abs/2004.10964) (2020) — the continued-pretraining result
- Birhane, Prabhu & Kahembwe, [*Multimodal datasets: misogyny, pornography, and malignant stereotypes*](https://arxiv.org/abs/2110.01963) (2021) — what uncurated web-scale corpora contain
