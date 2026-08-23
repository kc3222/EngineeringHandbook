---
title: "Computer Vision Fundamentals"
description: "Classification and detection basics — architectures, transfer learning, and where CV models tend to fail."
track: 5
chapter: 2
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**PyTorch & Model Training Basics** — tensors, the training loop, and transfer of a
pretrained model are all assumed here.
:::

## Why this chapter exists

Computer vision is the part of deep learning where the pretrained-model economy arrived
first and matured most. For a large fraction of real problems the answer is not "design a
network" but "take a backbone someone else trained on a hundred million images, replace
the head, and fine-tune on your few thousand". That works startlingly well, and it means
the engineering skill has moved elsewhere: to the data pipeline, the choice of task
formulation, the evaluation protocol, and knowing the ways a vision model fails that its
test-set accuracy will not reveal.

Those failures are the reason this chapter exists in a handbook rather than a tutorial.
Vision models latch onto whatever correlates with the label in the training set — the
background, the hospital's scanner, a watermark, an image's texture rather than its
shape. They are overconfident when wrong. They degrade sharply under changes in lighting,
compression, or camera that a human wouldn't register. None of this shows up in the
number you report, and all of it shows up in deployment.

## What's in here

| Page | What it covers |
| --- | --- |
| Images as Tensors | Layout, value ranges, resizing, and the preprocessing that must match your weights |
| Convolutional Networks | Convolution, receptive fields, residual connections, and how ViTs differ |
| Transfer Learning & Fine-Tuning | The recipes, when to freeze, and when pretraining doesn't help |
| Detection & Segmentation | Boxes, masks, IoU, NMS, mAP — and the annotation cost behind each |
| Evaluation & Where CV Models Fail | Metrics past accuracy, distribution shift, shortcut learning, calibration |

## Where this connects

This chapter is the applied counterpart to **PyTorch & Model Training Basics** — the same
loop with images in it. It leads directly into **Self-Supervised Learning**, which is
where the pretrained backbones now come from: the field moved from ImageNet-supervised
pretraining to label-free pretraining on far larger corpora, and the transfer recipes
here are what you apply to those models. **Competitive ML** shares the evaluation
discipline, from a different angle.

Deployment concerns — packaging a model, serving it, watching it drift — live in
**Cloud, DevOps & Observability** and in the FastAPI chapter of the backend track.

## References

- Russakovsky et al., [*ImageNet Large Scale Visual Recognition Challenge*](https://arxiv.org/abs/1409.0575) (2015) — the benchmark that shaped the field's habits, for better and worse
- Krizhevsky, Sutskever & Hinton, [*ImageNet Classification with Deep Convolutional Neural Networks*](https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html) (NeurIPS 2012) — the result that started the current era
- [torchvision — models and pretrained weights](https://pytorch.org/vision/stable/models.html) · [`timm` — PyTorch Image Models](https://huggingface.co/docs/timm/index)
