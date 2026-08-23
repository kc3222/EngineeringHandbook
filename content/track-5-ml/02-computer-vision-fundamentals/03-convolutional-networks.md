---
title: "Convolutional Networks"
description: "Convolution, receptive fields, residual connections — and how vision transformers change the assumptions."
track: 5
chapter: 2
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Images as Tensors** — layout and channel conventions.
:::

## Why convolution rather than a dense layer

A fully connected layer on a 224×224×3 image has 150,528 inputs per unit. Every pixel
position gets its own weight, so a pattern learned in the top-left corner is not
available in the bottom-right, and the parameter count is absurd before the model has
learned anything.

Convolution replaces that with a small filter — 3×3×`C_in` — slid across every position.
Two properties follow, and they are the whole argument:

**Weight sharing.** The same filter applies everywhere, so a feature learned at one
location transfers to all of them, and the parameter count depends on the filter size and
channel count rather than the image size.

**Locality.** Each output depends only on a small neighbourhood, which matches the fact
that nearby pixels are related and distant ones usually aren't.

These are *inductive biases*: assumptions about the problem baked into the architecture.
They make convolutional networks efficient on modest datasets, and — as vision
transformers later demonstrated — they are helpful assumptions rather than necessary ones.

A layer with `C_in` input channels, `C_out` output channels, and a *k*×*k* kernel has
`C_in × C_out × k² + C_out` parameters. Note what's absent: image size.

## Stride, padding, and receptive field

Three knobs control the geometry:

- **Stride** is the step between filter positions. Stride 2 halves the spatial dimensions and is the standard way to downsample.
- **Padding** adds a border so that output size matches input size (`padding = k//2` for odd *k*). Without it, every layer shrinks the map and edge pixels are under-sampled.
- **Dilation** spaces the filter's taps out, enlarging its reach without extra parameters. The main tool in segmentation, where you want context but not lower resolution.

The **receptive field** — the region of the input a given output unit can see — is the
concept that ties these together. A stack of 3×3 convolutions grows it slowly and
linearly; each stride-2 downsample doubles the rate. This is why classification networks
are built as a pyramid: spatial resolution falls, channel count rises, and by the final
layer each unit sees essentially the whole image.

It's also why two 3×3 convolutions are preferred to one 5×5. They have the same receptive
field, fewer parameters, and two nonlinearities instead of one. This observation is most
of what VGG contributed and it has held up.

If your model can't see the context it needs — a defect whose meaning depends on the
whole part, an object larger than the receptive field — no amount of training fixes it.
Check the arithmetic before assuming a data problem.

## The pieces that make deep networks trainable

Stacking convolutions alone stops working past a couple of dozen layers: deeper networks
became *harder to optimise*, not merely prone to overfitting. Three components fixed that,
and they appear in essentially every architecture since.

**Normalisation.** Batch norm standardises each channel using the current batch's
statistics during training and running averages at inference, which stabilises
optimisation and permits higher learning rates. Its dependence on batch composition is a
real liability — small batches make its estimates noisy, and the train/eval difference in
behaviour is a recurring bug source. Group norm and layer norm avoid the batch dependence
and are the norm of choice in detection with small batches and in transformer-style
vision models.

**Residual connections.** `y = x + F(x)`. The identity path gives gradients a route to
early layers that doesn't pass through every intervening weight, and it makes the
"do nothing" solution easy to represent, so adding a layer can't make the model strictly
worse. This is what made 50- and 100-layer networks routine, and it is the single most
important architectural idea in the chapter.

**Activation and downsampling.** ReLU and its variants (GELU, SiLU) supply nonlinearity;
max pooling and strided convolution supply downsampling. Modern networks increasingly use
strided convolutions rather than pooling, since it's a learned reduction rather than a
fixed one.

## Choosing an architecture

The honest summary is that architecture choice is a second-order decision for most
applied work. Data quality, resolution, and the fine-tuning recipe matter more. That said:

| Family | Character | Reach for it when |
| --- | --- | --- |
| ResNet | The reliable baseline; residual blocks, well understood, everywhere | You want a known quantity, or you're comparing against published numbers |
| EfficientNet / MobileNet | Compound scaling, depthwise separable convolutions | Edge or mobile deployment, tight latency budget |
| Vision Transformer (ViT) | Image as a sequence of patches, global attention | Large data or a strong pretrained checkpoint is available |
| ConvNeXt | A CNN modernised with transformer-era design choices | You want ViT-level accuracy with convolutional inductive bias |
| U-Net | Encoder–decoder with skip connections | Dense per-pixel output: segmentation, restoration, diffusion backbones |

Start with a pretrained ResNet-50 or a small ConvNeXt, get the pipeline and evaluation
right, and only then explore. Swapping backbones is a small code change; a broken
validation split is a wasted month.

## How vision transformers differ

A ViT cuts the image into fixed patches (typically 16×16), embeds each as a token, adds
positional embeddings, and runs a standard transformer encoder. Attention is global from
the first layer, so any patch can attend to any other — there's no locality assumption and
no weight sharing across positions in the convolutional sense.

The consequence is a genuine tradeoff. Without the convolutional priors, ViTs must learn
locality from data, so they underperform CNNs on small datasets and overtake them given
enough pretraining. That crossover point is why the practical answer today is usually
"use a pretrained ViT" rather than "train a ViT" — the pretraining has been done for you,
often self-supervised, at a scale you can't reproduce.

Hybrids blur the line further: ConvNeXt is a CNN adopting transformer training recipes
and design choices, hierarchical transformers like Swin reintroduce locality and
multi-scale structure, and the accuracy differences between well-trained members of these
families are small relative to the differences that data and recipe produce.

## What to take away

- Weight sharing and locality are what make convolution efficient — helpful assumptions, not necessary ones.
- Receptive field is arithmetic you can check. A model that can't see the evidence can't use it.
- Residual connections are the reason deep networks train; normalisation and learned downsampling are the supporting cast.
- Batch norm's batch dependence is a real liability at small batch sizes — group norm is the usual substitute.
- Architecture is a second-order choice. Start pretrained, get the data and evaluation right first.
- ViTs trade convolutional priors for scale. Use pretrained ones rather than training them yourself.

## References

- He et al., [*Deep Residual Learning for Image Recognition*](https://arxiv.org/abs/1512.03385) (2016) — ResNet
- Simonyan & Zisserman, [*Very Deep Convolutional Networks*](https://arxiv.org/abs/1409.1556) (2015) — VGG and the stacked-3×3 argument
- Ioffe & Szegedy, [*Batch Normalization*](https://arxiv.org/abs/1502.03167) (2015) · Wu & He, [*Group Normalization*](https://arxiv.org/abs/1803.08494) (2018)
- Dosovitskiy et al., [*An Image is Worth 16x16 Words*](https://arxiv.org/abs/2010.11929) (2021) — ViT, including the data-scale crossover
- Liu et al., [*A ConvNet for the 2020s*](https://arxiv.org/abs/2201.03545) (2022) — ConvNeXt · Liu et al., [*Swin Transformer*](https://arxiv.org/abs/2103.14030) (2021)
- Ronneberger, Fischer & Brox, [*U-Net*](https://arxiv.org/abs/1505.04597) (2015)
