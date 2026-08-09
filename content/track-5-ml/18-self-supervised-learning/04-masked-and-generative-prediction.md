---
title: "Masked & Generative Prediction"
description: "Hide part of the input and reconstruct it — why that works so well in text, and what had to change for images."
track: 5
chapter: 18
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Pretraining Without Labels**. Familiarity with **LLM Fundamentals** from the AI track
helps but isn't required.
:::

## Hide something, predict it

The second family of self-supervised methods is simpler to state than the first: remove
part of the input, ask the model to reconstruct it from what remains, and use the encoder
you're left with.

There's no collapse problem here, because the objective is reconstruction against ground
truth rather than agreement between two branches. There's no negative sampling, no
momentum encoder, no temperature. The design questions are different and mostly reduce to
**what to mask, how much, and what target to reconstruct**.

Two variants of "hide":

- **Masked (bidirectional).** Hide a random subset; the model sees everything else on both sides. BERT, MAE.
- **Autoregressive (causal).** Hide everything after position *t*; the model sees only the past. GPT-family language models.

The second is the objective behind every large language model, which makes next-token
prediction the most economically significant self-supervised task ever deployed. The AI
track's **LLM Fundamentals** covers what it produces; here the point is structural — the
model is trained by predicting parts of unlabelled data, exactly like everything else in
this chapter.

## Why it worked in language first

Masked language modelling was a step change in NLP, and the reasons it worked so cleanly
are worth stating because they explain why vision needed different choices.

Text is **discrete**, so prediction is classification over a finite vocabulary —
well-conditioned, and a correct answer is exactly correct. Text is **dense in
information**: dropping 15% of tokens removes a lot, and recovering a missing word often
requires syntax, world knowledge, and long-range context. And **the required masking rate
is low**, because a missing word is genuinely hard to guess.

Images invert all three. Pixels are continuous, neighbouring pixels are highly redundant,
and masking a small patch is trivially solved by interpolating from its surroundings —
which teaches texture continuity and nothing about objects.

## What masked image modelling had to change

**MAE** made two changes that resolved this, and they're instructive.

**Mask most of the image — around 75%.** With three-quarters of the patches gone, local
interpolation is unavailable; reconstructing the missing regions requires some
understanding of what the object is. The high ratio isn't a tuning detail, it's the thing
that makes the task non-trivial.

**Use an asymmetric encoder–decoder.** The encoder processes only the *visible* patches,
and a lightweight decoder reconstructs from the encoded patches plus mask tokens. Because
the encoder sees a quarter of the input, pretraining is several times faster than it would
otherwise be — which is how the method became practical at scale. The decoder is discarded
afterward, like the contrastive projection head.

The reconstruction target is the other open choice. MAE regresses raw pixels; BEiT
predicts discrete visual tokens from a learned codebook, on the argument that pixel-level
detail is not what you want the representation to spend capacity on. Both work. Pixel
targets are simpler and have proven surprisingly hard to beat.

Masked prediction also transferred cleanly to audio: wav2vec 2.0 masks spans of a
continuous speech signal and solves a contrastive task over quantised targets, which is a
genuine hybrid of the two families and is the basis of most modern speech recognition.

## Masked vs joint-embedding, compared

| | Masked prediction | Joint embedding |
| --- | --- | --- |
| Objective | Reconstruct hidden input | Agree across views |
| Collapse risk | None | Central design problem |
| Augmentation dependence | Low — masking is the augmentation | High; the recipe is domain-specific |
| Linear probe | Weaker | Stronger |
| Full fine-tuning | Strong, often best | Strong |
| Compute per epoch | Low (MAE encodes 25% of patches) | High (two views, large batches) |
| Features are | Rich, less linearly organised | Explicitly discriminative |

The probe-versus-fine-tune split is the practically important row. Masked models keep
information that isn't linearly accessible — a linear probe can't reach it, and a
fine-tune can. If you plan to freeze the encoder and train a linear head, that difference
decides which family to pick; if you plan to fine-tune, it mostly doesn't.

The two are complementary rather than competing, and the current strongest vision
encoders combine them — DINOv2 uses both a self-distillation objective and a masked
image-modelling objective, plus careful data curation.

## Denoising, generatively

Masking is one instance of a much older idea: corrupt the input, train the model to
undo the corruption, keep the representation. Denoising autoencoders formalised this in
2008, and the same principle underlies diffusion models, which learn to reverse
progressively added noise. That diffusion models learn useful representations as a side
effect of learning to generate is an active and unresolved thread — generation and
representation are related objectives, but "a good generative model implies good
features" has not held up as a general rule. A model can spend enormous capacity on
perceptual detail that no downstream classifier needs.

## What to take away

- Masked prediction reconstructs hidden input; no collapse problem, no negatives, far less augmentation sensitivity.
- Autoregressive next-token prediction is the same family, and is what produced modern LLMs.
- Images need a very high masking ratio (~75%) because pixels are redundant; low ratios teach interpolation.
- MAE's asymmetric encoder (visible patches only) is what makes it cheap enough to scale.
- Masked models fine-tune excellently and probe less well than contrastive ones — pick accordingly, or use a model trained with both.
- Generative quality does not automatically imply representation quality.

## References

- Devlin et al., [*BERT: Pre-training of Deep Bidirectional Transformers*](https://arxiv.org/abs/1810.04805) (2019)
- He et al., [*Masked Autoencoders Are Scalable Vision Learners*](https://arxiv.org/abs/2111.06377) (2022) — the 75% masking ratio and asymmetric design
- Bao et al., [*BEiT: BERT Pre-Training of Image Transformers*](https://arxiv.org/abs/2106.08254) (2022)
- Baevski et al., [*wav2vec 2.0*](https://arxiv.org/abs/2006.11477) (2020)
- Vincent et al., [*Extracting and Composing Robust Features with Denoising Autoencoders*](https://dl.acm.org/doi/10.1145/1390156.1390294) (ICML 2008)
- Oquab et al., [*DINOv2: Learning Robust Visual Features without Supervision*](https://arxiv.org/abs/2304.07193) (2024) — combining both objectives
