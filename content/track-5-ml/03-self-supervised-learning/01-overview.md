---
title: "Self-Supervised Learning"
description: "Pretraining without labels — foundation model concepts and why they matter."
track: 5
chapter: 3
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Computer Vision Fundamentals**, particularly transfer learning — this chapter explains
where the pretrained models you were fine-tuning actually come from.
:::

## Why this chapter exists

The previous chapter's advice — start from a pretrained backbone — raises an obvious
question: pretrained on what, by whom, and at what cost? For a decade the answer was
supervised ImageNet classification: a million labelled images, and the features learned
along the way turned out to transfer. That was always an odd arrangement. Labels are the
scarce resource, and it made the quality of general-purpose visual features hostage to how
many of them someone had paid for.

**Self-supervised learning removes the labels from pretraining.** The supervision comes
from the data's own structure: predict a hidden part of the input from the visible part,
or make two views of the same thing agree while keeping different things apart. Both
constructions generate a training signal from raw, unlabelled data, of which there is
effectively an unlimited supply.

This is not a niche technique. It is the mechanism behind essentially every large model
now in use — language models are trained by predicting masked or subsequent tokens, and
the strongest general-purpose vision encoders are trained without labels. Once
pretraining is decoupled from labelling, scale becomes a question of compute and data
collection rather than annotation budget, and that shift is what produced the current
generation of foundation models.

## What's in here

| Page | What it covers |
| --- | --- |
| Pretraining Without Labels | The label bottleneck, pretext tasks, and how a representation is evaluated |
| Contrastive & Joint-Embedding Methods | InfoNCE, negatives, collapse, and what augmentation choice encodes |
| Masked & Generative Prediction | BERT, MAE, and why masking behaves differently in text and images |
| Foundation Models & Downstream Use | CLIP, frozen features, adaptation, and whether you should ever pretrain |

## Where this connects

Backwards: this is the source of the pretrained weights **Transfer Learning &
Fine-Tuning** told you to use, and it runs on the loop from **PyTorch & Model Training
Basics** with a different loss.

Sideways: **LLM Fundamentals** in the AI track describes the same idea from the language
end — next-token prediction *is* self-supervision — and **Embeddings & Vector Search**
uses the representations produced this way as its raw material. Reading those two
alongside this chapter makes the shared mechanism obvious.

The practical conclusion the chapter builds toward: almost nobody should pretrain a
foundation model, and almost everybody should understand how the one they're using was
made — because its training objective determines what it's good at and what it's blind to.

## References

- Balestriero et al., [*A Cookbook of Self-Supervised Learning*](https://arxiv.org/abs/2304.12210) (2023) — the practical survey, including evaluation protocols
- Bommasani et al., [*On the Opportunities and Risks of Foundation Models*](https://arxiv.org/abs/2108.07258) (2021) — where the term comes from and what it claims
- LeCun & Misra, [*Self-supervised learning: The dark matter of intelligence*](https://ai.meta.com/blog/self-supervised-learning-the-dark-matter-of-intelligence/) (2021) — the motivating argument, stated compactly
