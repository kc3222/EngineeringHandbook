---
title: "Transfer Learning & Fine-Tuning"
description: "The recipes, when to freeze, the batch-norm trap, and the cases where pretraining genuinely doesn't help."
track: 5
chapter: 2
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Convolutional Networks** — what a backbone and a head are.
:::

## Why it works

Features learned on one large vision corpus are largely reusable on another. Early layers
converge to edge and colour detectors that are close to universal; middle layers capture
textures and parts; only the last layers are strongly specific to the original task. That
gradient of generality is the mechanism, and it means the useful question is not "should
I use a pretrained model" — you should — but **how far down to adapt it**.

Practically, transfer learning is what makes deep vision available at all outside labs
with millions of labelled images. A few thousand examples plus a pretrained backbone
routinely beats a hundred thousand examples trained from scratch.

## The recipes

Three, on a spectrum, with the choice driven mostly by how much data you have and how far
your domain sits from the pretraining corpus.

| Recipe | What trains | Data needed | Character |
| --- | --- | --- | --- |
| **Feature extraction / linear probe** | A new head only; backbone frozen | Hundreds | Fast, low memory, minimal overfitting risk. Backbone can be run once and cached |
| **Partial fine-tuning** | Head plus the last block or two | Low thousands | The usual sweet spot |
| **Full fine-tuning** | Everything, low LR | Tens of thousands, or a large domain gap | Highest ceiling, most overfitting risk, most compute |

Caching is an underrated property of the frozen case: if the backbone never changes, run
it over the dataset once, store the feature vectors, and train the head in seconds
instead of hours. Whole rounds of experimentation on the head become nearly free.

**Learning rate is the parameter that changes between recipes.** Fine-tuning uses roughly
one to two orders of magnitude less than training from scratch — around 1e-4 to 1e-5 with
AdamW is a sane starting band. Too high and the first few large gradients from a randomly
initialised head destroy the pretrained features before they can be useful, an effect
sometimes called catastrophic forgetting. Two standard mitigations:

- **Warm up the head first.** Freeze the backbone for an epoch or two so the head stops producing garbage gradients, then unfreeze.
- **Discriminative learning rates.** A lower rate for early layers, higher for later ones, since the early features need less adjustment.

## The batch-norm trap

The single most common fine-tuning bug in convolutional models. Batch norm layers hold
running mean and variance buffers, which are **updated in `train()` mode regardless of
whether the layer's parameters require gradients**. Freezing a backbone with
`requires_grad = False` therefore does *not* freeze it: the statistics drift toward your
new dataset while the weights stay put, and the mismatch degrades accuracy in a way that
looks like ordinary underperformance.

The fix is to put those layers in eval mode explicitly:

```python
for m in model.modules():
    if isinstance(m, torch.nn.modules.batchnorm._BatchNorm):
        m.eval()
```

Called after `model.train()`, each epoch. Models normalised with layer norm or group norm
— most transformer-based vision models — don't have this problem, which is one quiet
reason they're pleasanter to fine-tune.

## When pretraining doesn't help as much as expected

Three situations, all worth recognising before spending a week on the wrong approach.

**A large domain gap.** ImageNet is natural photographs. Medical scans, satellite
imagery, industrial radiographs, and microscopy are statistically very different — often
single-channel, different scales, different textures. Transfer still helps, but less, and
the gain concentrates in the early layers. When a domain-specific pretrained model exists
(and increasingly one does), it beats a general one comfortably.

**Enough target data.** Pretraining mainly buys sample efficiency and faster convergence.
Given a large enough target dataset and a long enough schedule, training from scratch can
match a fine-tuned model on detection-style tasks — the advantage of pretraining is that
you rarely have that dataset or that budget.

**Distribution shift at deployment.** Transfer learning does nothing about the gap
between your training data and the images your system will actually see. That's an
evaluation problem, covered in this chapter's last page.

A related and counterintuitive finding worth carrying: better ImageNet accuracy in a
backbone correlates with better transfer, but weakly and with exceptions — the correlation
weakens as the target domain moves further from natural images. "Pick the highest number
on the leaderboard" is a reasonable default and not a reliable rule.

## Parameter-efficient alternatives

Full fine-tuning produces a complete copy of the model per task, which is expensive to
store and to serve when there are many tasks. Parameter-efficient methods train a small
number of added parameters — LoRA's low-rank update matrices, adapters, prompt tuning —
and keep the backbone shared. They typically reach close to full fine-tuning quality at a
fraction of the trainable parameters and storage.

This originated in NLP and has become standard for large vision and multimodal models,
where a full copy is measured in tens of gigabytes. For a 25M-parameter ResNet it's
usually unnecessary complexity.

## A practical order of operations

1. Pick a pretrained backbone and use **its** preprocessing transform.
2. Replace the head with one matching your class count.
3. Freeze everything, train the head, record the number. This is your floor, and it takes minutes.
4. Unfreeze the last block or two, drop the learning rate, train again with BN layers held in eval mode.
5. Only if data volume justifies it, fine-tune fully with a cosine schedule and light warmup.
6. Compare all three on the *same* validation split, then stop.

Steps 3 and 6 are the ones people skip, and they're where the information is. A full
fine-tune that fails to beat a linear probe is telling you something — usually that the
dataset is too small, the learning rate is too high, or the split is inconsistent.

## What to take away

- Early layers are general, late layers are specific; that gradient determines how far down to adapt.
- Linear probe → partial fine-tune → full fine-tune, in that order, driven by data volume and domain gap.
- Fine-tuning learning rates are 10–100× lower than from-scratch ones; warm up the head before unfreezing.
- Freezing parameters does not freeze batch norm statistics. Put BN layers in `eval()` explicitly.
- A large domain gap or a large target dataset both narrow pretraining's advantage — but rarely eliminate it.
- Cache frozen-backbone features. It makes head-level experimentation nearly free.

## References

- Yosinski et al., [*How transferable are features in deep neural networks?*](https://arxiv.org/abs/1411.1792) (2014) — the layer-by-layer generality result
- Kornblith, Shlens & Le, [*Do Better ImageNet Models Transfer Better?*](https://arxiv.org/abs/1805.08974) (2019)
- He, Girshick & Dollár, [*Rethinking ImageNet Pre-training*](https://arxiv.org/abs/1811.08883) (2019) — when from-scratch catches up
- Kolesnikov et al., [*Big Transfer (BiT)*](https://arxiv.org/abs/1912.11370) (2020) — a well-specified transfer recipe
- Hu et al., [*LoRA: Low-Rank Adaptation of Large Language Models*](https://arxiv.org/abs/2106.09685) (2021)
- [PyTorch — finetuning torchvision models](https://pytorch.org/tutorials/beginner/finetuning_torchvision_models_tutorial.html)
