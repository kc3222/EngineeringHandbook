---
title: "Ensembling & the Endgame"
description: "Blending, stacking on out-of-fold predictions, shakeup, submission selection — and what of this belongs in production."
track: 5
chapter: 19
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Validation Discipline** — out-of-fold predictions are the core object on this page.
:::

## Why ensembles work

Averaging several models beats the best single model when their **errors are
uncorrelated**. Each model's prediction is the truth plus an error term; averaging keeps
the truth and partially cancels the errors, and how much cancels depends entirely on how
independent those errors are.

The practical consequence follows immediately: **diversity matters more than individual
strength**. Three near-identical gradient-boosted models blend into something barely
better than one. A boosted tree, a neural network, and a linear model — worse individually,
wrong in different places — often blend into something better than any of them.

Sources of diversity, roughly in decreasing order of value:

- Different **model families** (trees vs neural networks vs linear).
- Different **feature sets** or preprocessing.
- Different **target formulations** (regression vs binned classification).
- Different **hyperparameters**.
- Different **random seeds** — the weakest form, but nearly free and reliably worth a little.

## Blending: get this right first

Simple averaging captures most of the available gain, and it's hard to break.

**Arithmetic mean** of probabilities or predictions is the default. **Rank averaging** —
convert each model's predictions to ranks, then average — is the right choice when the
metric is rank-based (AUC) or when models are on different scales; it's robust to one
model being poorly calibrated. **Geometric mean** suits probabilities under log loss.
**Weighted averages** with weights fitted on out-of-fold predictions are better still, as
long as you remember that fitting the weights is itself model selection and can overfit if
there are many models and little data — constraining the weights to be non-negative and
sum to one helps considerably.

A power-law heuristic worth knowing: adding a second model of comparable strength usually
gives a clear jump, the third and fourth give less, and by the tenth you are buying the
fourth decimal place. Where you stop is a judgement about how much the fourth decimal
place is worth.

## Stacking, and the one rule that makes it valid

Stacking trains a second-level model on the first-level models' predictions. The rule that
makes it work:

**The meta-model must be trained on out-of-fold predictions.** For each base model, the
prediction for a row must come from a fold in which that row was *not* used for training.
Train a model on the full data and feed its in-sample predictions to the meta-model, and
you have handed it predictions that are far more accurate than any it will see at test
time. The stack learns to trust them, and it collapses on the test set. This is the single
most common way stacking is implemented incorrectly.

The mechanics:

1. Run K-fold CV for each base model, collecting a full column of out-of-fold predictions.
2. Also predict the test set from each fold's model and average, giving matching test-set columns.
3. Train the meta-model on the OOF matrix against the true targets — **cross-validated with the same folds**.
4. Apply it to the test columns.

Keep the meta-model simple. Ridge or logistic regression is usually the right level: with
a handful of highly correlated inputs and only as many rows as your training set, anything
more expressive overfits. Multi-level stacks appear in winning solutions and are rarely
worth the complexity or the leakage risk outside of them.

Cheaper relatives that are often enough: **seed averaging** (same configuration, several
seeds), **snapshot ensembling** (checkpoints from different points in a cyclic schedule),
and **test-time augmentation** (average predictions over several augmented views of each
test input). TTA in particular is a genuine ensemble for the price of extra inference,
with no extra training at all.

## The shakeup

The public leaderboard is scored on a slice of the test set; the final standing uses the
rest. When those disagree, positions move — sometimes by hundreds of places. That's the
**shakeup**, and it is not bad luck. It is the predictable outcome of competitors
selecting for a small public sample.

Shakeups are largest when the public split is small, the metric is high-variance, the
dataset has few rows, or there's meaningful distribution shift between public and private
portions. The defences are all things already covered:

- Trust cross-validation over the public leaderboard.
- Prefer solutions that are robust across folds to ones with the single best mean.
- Watch the gap: a model far better on public than on CV is fitted to the public split.
- Be sceptical of anything tuned on leaderboard feedback — thresholds especially.

**Selecting final submissions** is its own small decision, since most competitions let you
choose two. The standard advice is to pick your best CV score and your best public-LB
score, which hedges the two failure modes. If those coincide, take a diversified second
choice — a different ensemble, a more conservative blend — rather than two near-identical
submissions.

## From leaderboard to production

The last thing to say about competitive ML is what doesn't survive contact with a real
system.

| Transfers well | Doesn't transfer |
| --- | --- |
| Validation design and leakage awareness | 30-model ensembles for +0.001 |
| Error analysis as a habit | Features exploiting a dataset artefact |
| Reading the metric before modelling | Ignoring latency, memory, and cost |
| Fast iteration and experiment logging | Assuming the data distribution is fixed |
| Calibration and threshold selection | Assuming labels are correct and complete |
| Baseline-first discipline | A pipeline nobody but you can retrain |

The framing that makes the difference: a competition optimises **one metric on a fixed
dataset**, while a production system optimises a business outcome under constraints on
latency, cost, maintainability, fairness, and drift, on data that changes. A single
well-chosen model that a team can retrain, monitor, and reason about beats an ensemble
scoring 0.3% higher that nobody can maintain — and the ensemble's advantage will not
survive the first distribution shift anyway.

Knowledge distillation is the honest compromise where the accuracy genuinely matters:
train the big ensemble, then train one small model to reproduce its outputs. You keep much
of the gain in something you can actually deploy.

## What to take away

- Ensembles work by cancelling uncorrelated errors — diversity beats individual strength.
- Simple and rank averaging capture most of the gain; fit weights on out-of-fold predictions if you go further.
- Stacking is only valid on out-of-fold predictions, and the meta-model should be simple.
- TTA and seed averaging are cheap ensembles requiring no extra training.
- Shakeup is the predictable cost of fitting a small public split; trust CV and select two diverse submissions.
- Take the validation discipline into production; leave the 30-model ensemble behind, or distil it.

## References

- Wolpert, [*Stacked Generalization*](https://doi.org/10.1016/S0893-6080%2805%2980023-1) (*Neural Networks* 5(2), 1992) — the original formulation, including the out-of-fold requirement
- Breiman, [*Bagging Predictors*](https://doi.org/10.1007/BF00058655) (*Machine Learning* 24, 1996) — why averaging decorrelated models reduces error
- Dietterich, [*Ensemble Methods in Machine Learning*](https://doi.org/10.1007/3-540-45014-9_1) (MCS 2000) — the standard survey of why ensembles work
- Huang et al., [*Snapshot Ensembles: Train 1, Get M for Free*](https://arxiv.org/abs/1704.00109) (2017)
- Hinton, Vinyals & Dean, [*Distilling the Knowledge in a Neural Network*](https://arxiv.org/abs/1503.02531) (2015)
- [Kaggle — how final submissions and private scoring work](https://www.kaggle.com/docs/competitions)
