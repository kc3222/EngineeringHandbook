---
title: "Contrastive & Joint-Embedding Methods"
description: "InfoNCE, negatives, the collapse problem, and why your augmentation list is the real design decision."
track: 5
chapter: 3
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Pretraining Without Labels** — representations, evaluation protocols, and invariance as
a design choice.
:::

## The idea in one sentence

Take an image, produce two randomly augmented views of it, and train an encoder so those
two views land close together in feature space while views of *different* images land far
apart.

The first half is what teaches invariance: whatever your augmentations change — crop,
colour, blur — the representation is trained not to notice. The second half is what
prevents the degenerate solution, and it is the harder engineering problem, because a
model rewarded only for agreement can map every input to the same constant vector and
score perfectly. That's **collapse**, and everything distinctive about these methods is a
mechanism for avoiding it.

## InfoNCE and negatives

The contrastive answer is an explicit repulsion term. The **InfoNCE** loss treats one
positive pair against many negatives as a classification problem: given a view, identify
its partner among a batch of candidates.

```python
# z1, z2: (N, D) L2-normalised projections of two views of the same N images
logits = (z1 @ z2.T) / temperature      # (N, N); diagonal = positive pairs
labels = torch.arange(N, device=z1.device)
loss = F.cross_entropy(logits, labels)
```

Two hyperparameters that matter more than they look:

**Temperature** controls how sharply the loss focuses on the hardest negatives. Low
values concentrate the gradient on nearby negatives and sharpen local structure; high
values spread it out. Typical values sit around 0.05–0.2, and results are genuinely
sensitive to it.

**Number of negatives.** More negatives make the task harder and the features better,
which is why SimCLR needed batch sizes in the thousands — negatives came from the batch
itself, so batch size *was* the hyperparameter, and reproducing it required hardware most
labs didn't have.

**MoCo** decoupled the two by keeping a queue of representations from recent batches as
negatives, encoded by a slowly updated momentum copy of the network. That gives tens of
thousands of negatives at ordinary batch sizes — the momentum encoder exists because
queued vectors would otherwise be stale relative to a rapidly changing encoder.

One implementation detail with an outsized effect: the loss is applied not to the encoder
output but to a small MLP **projection head** on top of it, and the head is **discarded**
afterward — downstream tasks use the layer beneath. The projection head absorbs the
invariances the contrastive task demands, leaving more information in the representation
you keep. Removing it costs several points of linear-probe accuracy.

## Avoiding collapse without negatives

Negatives are awkward: they need large batches or queues, and they falsely repel images
that genuinely belong together (two photos of different dogs are treated as opposites).
A second line of work removes them.

| Method | How it avoids collapse |
| --- | --- |
| **BYOL** | Online network predicts the output of a momentum-averaged target network; the predictor plus stop-gradient breaks the symmetry that collapse requires |
| **SimSiam** | Shows the momentum encoder is optional — a **stop-gradient** on one branch is the essential ingredient |
| **DINO** | Self-distillation: a student matches a momentum teacher's sharpened output distribution, with centring to prevent one dimension dominating |
| **Barlow Twins / VICReg** | Regularise the *statistics* of the embedding — decorrelate feature dimensions and keep their variance above a floor, so a constant output is directly penalised |

The stop-gradient result is worth pausing on, because it's counterintuitive: a loss that
only rewards agreement, with no repulsion of any kind, does not collapse provided one
branch's gradient is blocked. The asymmetry is what does the work. Barlow Twins and VICReg
take the other route and make non-collapse an explicit constraint on the embedding's
covariance, which is arguably the more legible design.

DINO earned separate attention when its attention maps were found to segment objects
without ever being trained to — a sign that the representation had captured object
structure rather than just discriminative texture.

## Augmentation is the specification

The most important practical point in the chapter. In joint-embedding methods, the
augmentation list defines the task. It is a declaration of what should be considered *the
same thing*, and it becomes precisely what the representation ignores.

Ablations show random cropping and colour distortion carry most of the benefit for
natural images — and that colour distortion is essential specifically because two crops of
the same photo otherwise share a colour histogram, which the model would use as a
shortcut. Two crops, one trivially matched by colour statistics, is exactly the cheap
solution the previous page warned about.

Which is why augmentation choices don't transfer between domains for free:

- Colour jitter on a task where colour *is* the label trains away the signal. Quality inspection, plant disease, most histopathology stains.
- Aggressive cropping on medical or satellite imagery can crop out the finding entirely, making a positive and a negative "the same".
- Rotation invariance is right for microscopy and overhead imagery, wrong for photographs of a world with gravity.

Before adopting a recipe, read its augmentation list and ask whether each entry is
label-preserving in *your* domain.

## What this costs

These methods are compute-hungry — hundreds of epochs, large batches, long schedules —
and sensitive to hyperparameters in ways that make reproduction genuinely hard. The
momentum coefficient, temperature, projection dimension, and augmentation strength all
interact. There is no training-time metric that says it's working; you run a k-NN
evaluation periodically because the loss curve tells you almost nothing.

For applied work this argues strongly for downloading a pretrained encoder. The exception
that justifies running it yourself is a domain far from web images where you have a large
unlabelled corpus and few labels — medical archives, industrial imagery, satellite
collections. There the label efficiency is worth the compute, and it's one of the few
places pretraining from scratch still pays.

## What to take away

- Two views agree, different images differ. Everything else is machinery to stop the model collapsing to a constant.
- InfoNCE needs many negatives; MoCo's queue and momentum encoder decouple that from batch size.
- Negative-free methods work via stop-gradient asymmetry (BYOL, SimSiam) or explicit embedding statistics (Barlow Twins, VICReg).
- Train through a projection head and throw it away — the representation underneath is the product.
- The augmentation list *is* the task definition, and recipes tuned for natural images are often wrong for specialist domains.
- Expect to use someone else's checkpoint unless you have a large unlabelled corpus in an unusual domain.

## References

- Chen et al., [*SimCLR: A Simple Framework for Contrastive Learning of Visual Representations*](https://arxiv.org/abs/2002.05709) (2020) — augmentation ablations and the projection head
- He et al., [*Momentum Contrast (MoCo)*](https://arxiv.org/abs/1911.05722) (2020)
- Grill et al., [*Bootstrap Your Own Latent (BYOL)*](https://arxiv.org/abs/2006.07733) (2020) · Chen & He, [*Exploring Simple Siamese Representation Learning*](https://arxiv.org/abs/2011.10566) (2021) — the stop-gradient result
- Caron et al., [*Emerging Properties in Self-Supervised Vision Transformers (DINO)*](https://arxiv.org/abs/2104.14294) (2021)
- Zbontar et al., [*Barlow Twins*](https://arxiv.org/abs/2103.03230) (2021) · Bardes, Ponce & LeCun, [*VICReg*](https://arxiv.org/abs/2105.04906) (2022)
- van den Oord, Li & Vinyals, [*Representation Learning with Contrastive Predictive Coding*](https://arxiv.org/abs/1807.03748) (2018) — the InfoNCE objective
