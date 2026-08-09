---
title: "Detection & Segmentation"
description: "Boxes, masks, IoU, NMS and mAP — the tasks past classification, and the annotation cost behind each."
track: 5
chapter: 17
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**Convolutional Networks** — receptive fields and feature pyramids.
:::

## Pick the weakest task that answers the question

Detection and segmentation are more expensive than classification in every dimension:
annotation, training time, inference latency, and evaluation complexity. Choosing the
task is therefore the first design decision, and the discipline is to choose the *least*
informative output that still answers the question being asked.

| Task | Output | Relative annotation cost | Answers |
| --- | --- | --- | --- |
| Classification | One label per image | 1× | "Is there a defect?" |
| Multi-label | Several labels per image | 1–2× | "Which of these are present?" |
| Detection | Boxes + labels | 10× | "How many, and where?" |
| Semantic segmentation | Per-pixel class | 30–50× | "Which pixels are road?" |
| Instance segmentation | Per-pixel, per-object | 50×+ | "Which pixels belong to *that* car?" |

Those multipliers are approximate but the ordering is stable, and it's usually the
deciding factor. If the downstream action is "flag the image for review", classification
is enough and a detection dataset is a year of labelling you didn't need. If the action
is "count the objects" or "measure the area", you need the stronger task.

Weak supervision is worth knowing as a middle path: classification-trained models produce
usable coarse localisation through attention or class-activation maps, and promptable
segmentation models can turn a cheap box annotation into a mask. Neither is as good as
full labels; both can be dramatically cheaper.

## Boxes and IoU

A bounding box is four numbers, and which four varies by library — `(x1, y1, x2, y2)`
corners, `(x, y, w, h)` with a top-left origin, or a normalised centre-and-size form.
Conversions are a routine source of silent bugs; a model whose predictions are uniformly
offset or scaled is nearly always a format mismatch rather than a training failure.

**Intersection over Union** measures overlap: the area of intersection divided by the
area of union. It's the currency of the whole subfield — it defines what counts as a
correct detection, it drives duplicate suppression, and variants of it (GIoU, DIoU, CIoU)
are used directly as box regression losses, because optimising IoU-like quantities beats
optimising corner coordinates independently.

Convention: an IoU of 0.5 is the loose threshold, 0.75 strict, and modern benchmarks
average across thresholds from 0.5 to 0.95.

## How detectors are built

Nearly all detectors share a skeleton: a **backbone** extracts features, a **neck**
(typically a feature pyramid) combines resolutions so that small and large objects are
both representable, and a **head** predicts boxes and classes. The families differ in the
head.

**Two-stage** (Faster R-CNN and descendants) proposes candidate regions, then classifies
and refines each one. More accurate historically, slower, still strong where precision
matters more than latency.

**One-stage** (YOLO family, SSD, RetinaNet) predicts boxes and classes directly across a
dense grid in a single pass. Much faster, and the accuracy gap has largely closed. This is
where most production detection sits.

One-stage detectors face a severe foreground/background imbalance — tens of thousands of
candidate locations, a handful of objects — which is what **focal loss** was designed to
address by down-weighting the easy negatives that would otherwise dominate the gradient.

**Set-prediction transformers** (DETR and successors) drop hand-designed anchors and
non-maximum suppression entirely, predicting a fixed-size set of objects matched to
ground truth by bipartite matching. Conceptually much cleaner; originally slow to
converge, which later variants improved.

**Non-maximum suppression** is the post-processing step almost every non-DETR detector
needs: sort candidate boxes by score, keep the highest, discard everything overlapping it
above an IoU threshold, repeat. It's a hyperparameter you own — set the threshold too low
and adjacent real objects get suppressed, too high and duplicates survive. In crowded
scenes this single number can matter more than the model.

## Reading mAP

Detection's headline metric is **mean average precision**: for each class, sweep the
confidence threshold to trace a precision–recall curve, take the area under it, and
average across classes. COCO-style mAP then averages that over IoU thresholds from 0.50 to
0.95 in steps of 0.05, and reports breakdowns by object size.

Two things to keep in mind. **mAP numbers are only comparable within the same protocol** —
"mAP 0.62" means nothing without knowing the IoU threshold, the dataset, and the
max-detections cap. And **mAP is threshold-free by construction, while your deployed
system is not**. You will ship a single confidence threshold, and the operating point you
choose determines the precision/recall balance a user actually experiences. Report mAP for
comparability; choose and report your operating point separately, driven by the relative
cost of a false positive and a false negative in the application.

## Segmentation

Three distinct tasks that get conflated:

- **Semantic** — every pixel gets a class, instances are not distinguished. Road scenes, land cover, tissue type.
- **Instance** — separate mask per object. Counting, per-object measurement.
- **Panoptic** — both: instance masks for countable things, semantic regions for the rest.

The architectural workhorse is the encoder–decoder with skip connections (U-Net), which
recovers spatial detail lost during downsampling by reconnecting the encoder's
high-resolution features to the decoder. Mask R-CNN adds a mask head to a two-stage
detector for the instance case.

Loss choice matters more here than in classification because of extreme class imbalance —
a lesion may be 0.1% of pixels. Plain cross-entropy will happily predict "background"
everywhere and score 99.9%. Dice loss and its relatives optimise overlap directly and are
usually combined with cross-entropy. Evaluate with mean IoU or Dice, and **never** with
pixel accuracy.

Promptable, general-purpose segmentation models have changed the economics recently: a
foundation model can produce good masks from a point or box prompt without task-specific
training, which makes it viable to generate masks for annotation rather than draw them.

## What to take away

- Choose the weakest task that answers the question — annotation cost rises steeply.
- Box format conversions are a real bug class; IoU is the shared currency of the subfield.
- One-stage detectors are the production default; focal loss exists because of foreground/background imbalance.
- NMS thresholds are yours to tune and matter most in crowded scenes.
- mAP is only comparable within a protocol, and it doesn't choose your deployment threshold — do that from the cost of each error type.
- Segmentation with rare classes needs Dice-style overlap losses; pixel accuracy is a useless metric.

## References

- Ren et al., [*Faster R-CNN*](https://arxiv.org/abs/1506.01497) (2015) · He et al., [*Mask R-CNN*](https://arxiv.org/abs/1703.06870) (2017)
- Redmon et al., [*You Only Look Once*](https://arxiv.org/abs/1506.02640) (2016) · Lin et al., [*Focal Loss for Dense Object Detection*](https://arxiv.org/abs/1708.02002) (2017)
- Carion et al., [*End-to-End Object Detection with Transformers*](https://arxiv.org/abs/2005.12872) (2020) — DETR
- Lin et al., [*Microsoft COCO*](https://arxiv.org/abs/1405.0312) (2014) and the [COCO detection evaluation protocol](https://cocodataset.org/#detection-eval)
- Ronneberger, Fischer & Brox, [*U-Net*](https://arxiv.org/abs/1505.04597) (2015) · Kirillov et al., [*Panoptic Segmentation*](https://arxiv.org/abs/1801.00868) (2019)
- Kirillov et al., [*Segment Anything*](https://arxiv.org/abs/2304.02643) (2023) — promptable segmentation and its use for annotation
