---
title: "Images as Tensors"
description: "Layout, value ranges, resizing, augmentation — the preprocessing decisions that quietly decide your accuracy."
track: 5
chapter: 17
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Tensors, Shapes & Devices**, and **Datasets & Input Pipelines** for where transforms
belong.
:::

## The four things that define an image tensor

An image arrives as pixels and has to become a tensor. Four conventions decide whether
that tensor is the one your model expects, and every one of them differs between at least
two popular libraries.

| Convention | PyTorch expects | Commonly arrives as |
| --- | --- | --- |
| Dimension order | `(N, C, H, W)`, channels first | `(H, W, C)` from PIL, NumPy, OpenCV |
| Channel order | RGB | **BGR** from OpenCV's `imread` |
| Value range | Float in `[0, 1]`, then normalised | `uint8` in `[0, 255]` |
| Normalisation | Per-channel mean/std of the pretraining corpus | Nothing, or the wrong dataset's statistics |

`torchvision.transforms.ToTensor()` handles the first and third — it permutes to
channels-first and scales `uint8` to `[0, 1]`. It does **not** handle the second, and the
BGR/RGB mix-up is the classic silent bug: the model trains, converges to a mediocre score,
and looks fine in every log. Colour-swapped input costs a few points of accuracy without
ever erroring.

Normalisation is the fourth and the one most tied to transfer learning. A model
pretrained on ImageNet expects its inputs standardised with that corpus's per-channel
statistics (`mean = [0.485, 0.456, 0.406]`, `std = [0.229, 0.224, 0.225]`). Those numbers
are part of the model's interface, not a property of your data. Substituting your own
dataset's statistics, or skipping the step, shifts every input away from the distribution
the features were learned on. Modern weight APIs ship the correct transform alongside the
checkpoint precisely because this went wrong so often:

```python
weights = ResNet50_Weights.IMAGENET1K_V2
model = resnet50(weights=weights)
preprocess = weights.transforms()      # the exact resize, crop and normalisation
```

Use that when it's available. Hand-copying the constants is how they drift.

## Resizing, cropping, and aspect ratio

Networks want a fixed input size; photographs are not a fixed size. The reconciliation is
a modelling choice with visible consequences.

- **Resize to a square, ignoring aspect ratio** distorts geometry. Rarely a problem for
  scene classification; damaging when the label depends on shape.
- **Resize the short side, then centre-crop** is the standard evaluation recipe. It
  preserves aspect ratio and discards the edges — fine for centred subjects, not for
  images where the subject may be anywhere.
- **Letterbox (pad to square)** preserves everything at the cost of wasted pixels. The
  standard choice in detection, where cropping would remove objects.

Resolution itself is a first-order accuracy lever and often under-explored: many tasks
that plateau at 224px keep improving at 384px or beyond, particularly when the signal is
small relative to the frame (defects, lesions, distant objects). Compute cost scales with
the pixel count, so this is a real tradeoff rather than free accuracy — but it is usually
worth measuring before reaching for a bigger architecture.

Two lower-level details that bite in practice: **interpolation and antialiasing settings
must match between training and inference** — a model trained on bilinear-antialiased
resizes and served on nearest-neighbour ones loses accuracy for no visible reason — and
**EXIF orientation** is silently applied by some loaders and not others, so a portrait
photo can arrive rotated 90° depending on which library opened it.

## Augmentation, and what invariance it encodes

Augmentation is regularisation and it is also a statement about which transformations
should not change the label. That framing is the useful one, because it tells you which
augmentations are wrong for your problem.

Horizontal flips are standard for natural scenes and wrong for text, and wrong for any
task where left and right are distinct — a chest X-ray with situs inversus, a road sign,
a handedness classification. Colour jitter is standard for object recognition and
destructive when colour *is* the signal, as in most quality-inspection and many medical
tasks. Rotation is free for satellite and microscopy imagery, where there is no canonical
"up", and harmful for photographs, where there is.

A workable ladder, from most reliable to most aggressive:

| Level | Transforms | Use when |
| --- | --- | --- |
| Baseline | Random resized crop, horizontal flip | Almost always, for natural images |
| Standard | \+ colour jitter, slight rotation/affine | Moderate dataset, signs of overfitting |
| Strong | RandAugment / TrivialAugment, random erasing | Small dataset, or large models trained long |
| Mixing | Mixup, CutMix | Long schedules; also improves calibration |

Mixup and CutMix are unusual in that they blend *labels* as well as pixels, which is why
they need a soft-target loss. They help most on long training runs and large models, and
they can hurt on short fine-tunes.

The rule from the previous chapter applies without exception: **augmentation is for
training only**. Evaluation gets a deterministic resize and crop. The exception that
proves it is test-time augmentation, which is a deliberate ensembling technique — average
predictions over several augmented views — and belongs in Chapter 19's toolbox, not in
your validation transform by accident.

## The gap between your pipeline and production

The most common way a good vision model fails in deployment is that the images it sees at
serving time were prepared differently from the ones it trained on. Sources:

- A different library doing the decode and resize (PIL vs OpenCV vs a browser canvas).
- Re-encoded JPEGs at a different quality, adding compression artefacts.
- Colour space or channel order differing by one step in a longer pipeline.
- Images captured by a different camera, at a different resolution, under different lighting.

The structural fix is to have **one preprocessing function**, used by training,
evaluation, and serving, and to test it by running a handful of production images through
the training path and confirming the tensors match. Two implementations of "the same"
preprocessing in two languages will diverge; the only question is when you find out.

## What to take away

- Channels-first, RGB, float, normalised with the *pretraining* corpus's statistics — check all four.
- Use the weights API's bundled `transforms()` rather than copying constants.
- Aspect-ratio handling is a modelling choice; letterbox for detection, centre-crop for classification.
- Input resolution is an under-explored accuracy lever, and interpolation settings must match between training and serving.
- Every augmentation asserts an invariance. Flips, rotations, and colour jitter are wrong for some domains.
- Share one preprocessing implementation across training, evaluation, and serving.

## References

- [torchvision — transforms v2](https://pytorch.org/vision/stable/transforms.html) and [multi-weight support / `weights.transforms()`](https://pytorch.org/vision/stable/models.html)
- Cubuk et al., [*RandAugment: Practical automated data augmentation*](https://arxiv.org/abs/1909.13719) (2019) · Müller & Hutter, [*TrivialAugment*](https://arxiv.org/abs/2103.10158) (2021)
- Zhang et al., [*mixup: Beyond Empirical Risk Minimization*](https://arxiv.org/abs/1710.09412) (2018) · Yun et al., [*CutMix*](https://arxiv.org/abs/1905.04899) (2019)
- Touvron et al., [*Fixing the train-test resolution discrepancy*](https://arxiv.org/abs/1906.06423) (2019) — why the resize/crop mismatch between training and evaluation costs accuracy
