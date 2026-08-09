---
title: "Evaluation & Where CV Models Fail"
description: "Metrics past accuracy, shortcut learning, distribution shift, and why a model is overconfident exactly when it's wrong."
track: 5
chapter: 17
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**Transfer Learning & Fine-Tuning**, and **Datasets & Input Pipelines** for splits and
leakage.
:::

## Accuracy is usually the wrong headline

Accuracy is only informative when classes are balanced and errors cost the same. Neither
is true in most applied work. A defect detector on a line with a 0.5% defect rate scores
99.5% by predicting "fine" forever.

| Metric | What it tells you | Use it when |
| --- | --- | --- |
| Precision | Of the things flagged, how many were right | False positives are expensive (review cost, alarm fatigue) |
| Recall | Of the things present, how many were caught | False negatives are expensive (safety, screening) |
| F1 | Harmonic mean of the two | You need one number and both matter |
| PR-AUC | Threshold-free summary under imbalance | Rare positives — far more informative than ROC-AUC here |
| ROC-AUC | Ranking quality across thresholds | Roughly balanced classes |
| Per-class / confusion matrix | Where the errors concentrate | Always. This is the diagnostic |

Under heavy imbalance ROC-AUC is misleading: because the false positive rate is divided
by a large negative count, a model can look excellent while its flagged set is mostly
wrong. PR-AUC exposes that.

**The confusion matrix is the artefact to look at first.** A single scalar tells you how
much is wrong; the matrix tells you *what* is wrong, and the pattern is usually
actionable — two classes that are genuinely ambiguous, a class with too few examples, or
a labelling convention that shifted midway through the dataset.

## Choosing a threshold is a product decision

Models output scores; deployed systems need decisions. That conversion is a choice, and
it belongs to whoever owns the consequences rather than being left at 0.5 by default.

Pick it from the relative cost of the two error types, on the validation set, and then
report the confusion matrix at that threshold. For screening applications the threshold
is usually set to hit a required recall and the precision is whatever it turns out to be;
for automation-without-review it's the reverse. Under class imbalance the useful
threshold is often nowhere near 0.5.

## Confidence is not probability

Modern networks are systematically **overconfident**: a set of predictions made with 95%
confidence will be correct considerably less than 95% of the time. Worse, confidence
stays high on inputs from outside the training distribution — the exact case where you
would most want the model to hesitate. A model given an image of something it has never
seen returns a familiar class with a high score, because the softmax is required to
distribute all its mass across the classes it knows.

Two consequences. If a downstream system routes low-confidence cases to a human, the
scores must be **calibrated** first — temperature scaling on a held-out set is a
one-parameter fix that works well. And genuine out-of-distribution detection is a
separate mechanism, not a threshold on the class score.

## Shortcut learning

The deepest failure mode, and the one most invisible to a test set. A model minimises loss
by any available route, and if something incidental correlates with the label more
reliably than the intended signal, that's what it will learn.

Documented, real cases follow a pattern: pneumonia classifiers keying on which hospital's
scanner produced the image, because the scanner is visible in the image and disease
prevalence varies by site. Dermatology models using the presence of a surgical ruler,
which appears in photographs of lesions a clinician already suspected. Detectors reading
watermarks, borders, JPEG artefacts, or background context rather than the object.

There is also a general form: standard vision models are biased toward **texture** over
shape, and will classify a cat-shaped image with elephant texture as an elephant. That's
not a bug in one model; it's a property of what the training objective rewards.

A held-out split from the same collection process cannot detect any of this, because the
shortcut is present there too. What does detect it:

- **Evaluate on data from a different source** — another site, camera, batch, or time period. The single most informative test available.
- **Look at saliency or attention maps** for correct predictions, not just wrong ones. A model right for the wrong reason looks identical in the metrics.
- **Ablate the suspect signal** — crop out the border, mask the background, remove the metadata overlay — and see whether performance collapses.
- **Check subgroup performance**, sliced by site, device, demographic, capture condition. An aggregate metric hides a class of failure that a slice makes obvious.

## Distribution shift and robustness

The test set is drawn from the same distribution as the training set. Production is not,
and the gap is bigger than intuition suggests: models lose accuracy on newly collected
data from the same nominal distribution, and degrade sharply under corruptions humans
barely notice — mild blur, JPEG compression, brightness shifts, sensor noise.

Sources of shift in the field, roughly in order of frequency: a camera or sensor change,
a lighting or seasonal change, a software update that alters preprocessing, a change in
what users photograph, and gradual population change. The first and third are the ones
that arrive without warning and are easiest to prevent — pin your preprocessing, version
it, and test it.

Practical defences: train with augmentations resembling the shifts you expect, evaluate on
a deliberately corrupted version of your test set to get a robustness number, monitor
input statistics and score distributions in production rather than waiting for a
complaint, and keep a small continuously refreshed evaluation set drawn from live data.

Adversarial robustness — imperceptible perturbations crafted to flip predictions — is a
different threat model that matters when someone has an incentive to fool the system.
Standard training provides essentially no protection against it.

## Label noise

A quiet ceiling on everything above. Widely used benchmark test sets contain a
non-trivial fraction of wrong labels, and applied datasets are usually worse. Two
consequences: your reported accuracy has an error bar you can't see, and past a point
"the model is wrong" and "the label is wrong" become indistinguishable.

The cheap diagnostic is to sort validation examples by loss and read the worst hundred by
hand. That list is a mix of genuinely hard cases and mislabelled ones, and the ratio tells
you whether your next hour is better spent on the model or on the labels. It is almost
always the labels.

## What to take away

- Report precision, recall, and the confusion matrix. Accuracy alone is uninformative under imbalance; PR-AUC beats ROC-AUC there.
- The decision threshold is a product choice driven by error costs, not a default of 0.5.
- Networks are overconfident and stay confident out of distribution. Calibrate before routing on confidence.
- Shortcut learning is invisible to a same-distribution test set. Evaluate on a different source, slice by subgroup, ablate the suspect signal.
- Expect real accuracy loss under mild corruption and camera changes; monitor inputs in production.
- Read your highest-loss validation examples. The labels are often the problem.

## References

- Guo et al., [*On Calibration of Modern Neural Networks*](https://arxiv.org/abs/1706.04599) (2017) — overconfidence and temperature scaling
- Geirhos et al., [*Shortcut Learning in Deep Neural Networks*](https://arxiv.org/abs/2004.07780) (2020) · Geirhos et al., [*ImageNet-trained CNNs are biased towards texture*](https://arxiv.org/abs/1811.12231) (2019)
- Zech et al., [*Variable generalization performance of a deep learning model to detect pneumonia in chest radiographs*](https://doi.org/10.1371/journal.pmed.1002683) (PLOS Medicine, 2018) — the cross-site failure case
- Hendrycks & Dietterich, [*Benchmarking Neural Network Robustness to Common Corruptions and Perturbations*](https://arxiv.org/abs/1903.12261) (2019)
- Recht et al., [*Do ImageNet Classifiers Generalize to ImageNet?*](https://arxiv.org/abs/1902.10811) (2019) — the cost of a genuinely fresh test set
- Northcutt, Athalye & Mueller, [*Pervasive Label Errors in Test Sets*](https://arxiv.org/abs/2103.14749) (2021)
