---
title: "Pretraining Without Labels"
description: "The label bottleneck, what makes a representation good, and the evaluation protocols that tell you whether you got one."
track: 5
chapter: 3
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Transfer Learning & Fine-Tuning** — the idea that features learned on one task serve
another.
:::

## The label bottleneck

Supervised learning needs labelled examples, and labels are expensive in a way that
scales badly. ImageNet's million labels took years and a crowdsourcing platform.
Segmentation masks cost tens of times more per image. Specialist domains are worse
still — a radiologist's time, a pathologist's second opinion, a domain expert who is the
only person qualified to disagree.

Meanwhile unlabelled data is nearly free and effectively unbounded: billions of images,
trillions of words, endless recorded audio and video.

Self-supervision constructs a training signal from the data alone by **hiding part of it
and asking the model to recover that part from the rest**. No annotation is involved, the
supervision is exact, and the amount of it is limited only by how much raw data you can
process. That's the whole trick, and its consequences are structural: the ceiling on
representation quality moved from "how many labels can we afford" to "how much compute
and data can we apply".

## Pretext tasks, and why the early ones underdelivered

The first wave of self-supervised vision work invented puzzles: predict the relative
position of two image patches, reassemble a shuffled jigsaw, predict the rotation applied
to an image, colourise a greyscale photo. Each is solvable only by understanding
something about objects, so a model that solves it should have learned useful features.

They worked, partially, and stalled well below supervised pretraining. The instructive
reason is that **a model will solve the pretext task by any available means**, and these
tasks admitted shortcuts. Jigsaw solvers learned to match chromatic aberration and
compression artefacts along patch edges. Rotation prediction learned that sky is at the
top. The features learned were features for the puzzle, not for vision.

That failure defined the design criterion for what came next: the pretext task must have
no cheap solution, and what it forces the model to represent must be what you actually
want. Two families satisfy it, and they now account for nearly all of the field.

| Family | The task | Typical of |
| --- | --- | --- |
| **Joint embedding** | Make representations of two views of the same input agree, while keeping different inputs apart | SimCLR, MoCo, BYOL, DINO |
| **Masked / generative prediction** | Reconstruct a deliberately hidden portion of the input | BERT, MAE, GPT-style language models |

The next two pages take one each.

## What "a good representation" means

The pretext task is a means, not the goal — nobody wants a model that predicts rotations.
The goal is a **representation**: a vector encoding of an input, learned once, that makes
many downstream tasks easy.

Concretely, the properties that matter:

- **Linear separability.** Classes are distinguishable by a linear boundary in the feature space, so a trivial head suffices.
- **Transfer breadth.** The same features work across many tasks and domains, not just the one resembling the pretraining data.
- **Label efficiency.** Downstream tasks reach good accuracy with very few labels. This is usually the point.
- **Invariance to nuisances, sensitivity to signal.** Lighting and crop shouldn't move the representation; object identity should.

That last one is a design decision rather than a property that emerges, and it's the
subtlest thing in the chapter. Whatever transformations you declare "the same" during
pretraining, the model learns to ignore — so a representation trained to be
colour-invariant is a poor starting point for a task where colour is the label.

## How you evaluate a representation

Since there's no pretraining accuracy worth reporting, evaluation happens on downstream
proxies. Four standard protocols, and they answer different questions:

| Protocol | Procedure | What it measures |
| --- | --- | --- |
| **Linear probe** | Freeze the encoder, train a linear classifier on its features | Is the information linearly accessible? The field's standard headline |
| **k-NN classification** | Classify by nearest neighbours in feature space | Is the geometry itself meaningful? No training, no hyperparameters |
| **Few-shot / low-label** | Fine-tune with 1%, 10% of labels | Label efficiency — usually the practical question |
| **Full fine-tuning** | Unfreeze everything | Best achievable, but partly measures the architecture, not the pretraining |

Report more than one. Linear probe and fine-tuning routinely disagree, and the
disagreement is informative: masked-prediction methods often probe poorly and fine-tune
excellently, because their features are rich but not linearly organised, while contrastive
methods are the reverse. Ranking methods on a single protocol has repeatedly produced
conclusions that didn't survive the second one.

Two evaluation hazards worth naming. **Pretraining data overlaps downstream benchmarks**
more often than reported — web-scale corpora contain the test sets — so a suspiciously
good transfer number deserves a contamination check. And **the evaluation protocol has
hyperparameters of its own**; comparisons where the probe's learning rate was tuned for
one method and not the other are common and meaningless.

## What it actually buys you

Set against supervised pretraining, self-supervision offers: no annotation cost, so far
more pretraining data; features that are less specialised to one label taxonomy and
therefore often transfer better to distant domains; and a substantial advantage in the
low-label regime, which is where most applied projects live.

The costs are real too. Pretraining runs are long and compute-intensive, results are
sensitive to augmentation and hyperparameter choices in ways that are still partly
empirical, and there is no training-time metric that tells you whether it's working — you
have to run a downstream evaluation to find out.

Which is the argument for the position this chapter ends on: use somebody else's
pretrained encoder. The value of understanding the mechanism is in choosing the right one
and knowing what it will be blind to.

## What to take away

- Self-supervision replaces annotation with structure already present in the data, moving the ceiling from labels to compute.
- Early pretext tasks underperformed because models solved them with shortcuts — the task must have no cheap solution.
- Two families dominate: joint embedding and masked prediction.
- A good representation is linearly separable, transfers broadly, and is label-efficient.
- Whatever augmentations you treat as label-preserving become the invariances you're stuck with.
- Evaluate with at least two protocols; linear probe and fine-tuning frequently disagree, and the disagreement is the signal.

## References

- Balestriero et al., [*A Cookbook of Self-Supervised Learning*](https://arxiv.org/abs/2304.12210) (2023)
- Doersch, Gupta & Efros, [*Unsupervised Visual Representation Learning by Context Prediction*](https://arxiv.org/abs/1505.05192) (2015) — including the chromatic-aberration shortcut
- Noroozi & Favaro, [*Unsupervised Learning of Visual Representations by Solving Jigsaw Puzzles*](https://arxiv.org/abs/1603.09246) (2016) · Gidaris et al., [*Unsupervised Representation Learning by Predicting Image Rotations*](https://arxiv.org/abs/1803.07728) (2018)
- Bengio, Courville & Vincent, [*Representation Learning: A Review and New Perspectives*](https://arxiv.org/abs/1206.5538) (2013) — what the objective actually is
