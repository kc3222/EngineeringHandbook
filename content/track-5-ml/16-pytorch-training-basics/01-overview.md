---
title: "PyTorch & Model Training Basics"
description: "Tensors, autograd, training loops — the fundamentals under every deep learning project."
track: 5
chapter: 16
page: 1
readMinutes: 3
---

:::info[Prerequisites]
None. This is the first chapter of the track — start here if you're starting anywhere.
Python fluency and a rough memory of the chain rule are enough.
:::

## Why this chapter exists

Deep learning has a small number of moving parts and an enormous amount of surrounding
noise. Underneath every model — vision, language, audio, whatever came out last month —
the same four things are happening:

1. Data is arranged into **tensors** of a particular shape, dtype, and device.
2. A forward pass computes a **loss**, recording each operation as it goes.
3. `backward()` walks that recording in reverse to get a **gradient** for every parameter.
4. An **optimizer** nudges the parameters and the loop repeats.

That's the whole machine. Architectures change what happens in step 2; nothing else
about the picture moves. An engineer who understands these four steps can read an
unfamiliar training script and know where to look when it misbehaves — and misbehaving
is the normal state of a training run.

The reason to learn this at the level of tensors rather than at the level of a
high-level trainer API is that **the failures surface at this level**. A model that
trains to a mediocre score rarely announces why. It's a normalisation applied twice, a
label tensor with the wrong dtype, a `zero_grad()` that isn't called, an evaluation run
with dropout still active. None of those raise an exception. All of them are obvious
once you know what the loop is supposed to be doing.

## What's in here

| Page | What it covers |
| --- | --- |
| Tensors, Shapes & Devices | The three attributes that decide whether your code runs, and broadcasting |
| Autograd & the Backward Pass | How gradients are actually computed, and what breaks the graph |
| Datasets & Input Pipelines | Feeding the GPU, and why the bottleneck is usually here |
| The Training Loop | Optimizers, learning rates, schedules, mixed precision, checkpoints |
| Debugging a Training Run | A diagnostic order that beats changing hyperparameters at random |

## Where this connects

Everything after this chapter assumes it. **Computer Vision Fundamentals** is this loop
with convolutional layers and image tensors in it; **Self-Supervised Learning** is this
loop with the labels removed and the loss replaced; **Competitive ML** is largely about
what you do *around* the loop — validation, ensembling — once the loop itself is
routine.

The framing is PyTorch because it's the current default for research code and most
applied work, but the concepts are framework-independent. JAX and TensorFlow arrange the
same four steps differently; knowing which step you're in transfers directly.

If you only read one page here, read **Debugging a Training Run**. It's the one that
saves days.

## References

- [PyTorch — official documentation](https://pytorch.org/docs/stable/index.html) and the [Learn the Basics tutorial](https://pytorch.org/tutorials/beginner/basics/intro.html)
- Paszke et al., [*PyTorch: An Imperative Style, High-Performance Deep Learning Library*](https://arxiv.org/abs/1912.01703) (2019) — the design rationale for eager execution and dynamic graphs
- Goodfellow, Bengio & Courville, [*Deep Learning*](https://www.deeplearningbook.org/) — the standard reference text, free online
