---
title: "What Actually Moves the Score"
description: "Baselines, reading the metric, model choice by data type, and the point at which hyperparameter tuning stops paying."
track: 5
chapter: 19
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Validation Discipline** — you need a trustworthy local score before any of this is
measurable.
:::

## Build the pipeline before the model

The first deliverable is an end-to-end path from raw data to a valid submission, using
the dumbest model that runs. Predict the mean. Fit a logistic regression. Whatever takes
twenty minutes.

This is not a warm-up exercise. It establishes the floor that every later result is
compared against, it surfaces format and shape errors while they're cheap, and it means
that from that point on you always have something submittable. Teams that spend three days
on features before producing a single prediction routinely discover on day four that they
misread the target definition.

Then improve one thing at a time, against fixed folds, recording every result. An
experiment log — configuration, CV mean, CV standard deviation, leaderboard score — is
what makes the difference between iterating and wandering. Its main function is negative:
it stops you retrying variants you already disproved, which is otherwise remarkably easy
to do.

## Read the metric properly

The metric is the objective. Optimising something correlated with it is a self-inflicted
handicap, and misreading it is a common way to lose while modelling well.

- **Log loss / AUC** care about calibrated probabilities and ranking respectively. A model that ranks perfectly can have terrible log loss, and post-hoc calibration is then free points.
- **RMSE vs MAE** differ in outlier sensitivity — RMSE rewards getting the extremes right, MAE rewards the median. They can prefer opposite models.
- **Metrics with a threshold** (F1, accuracy, Dice) require you to choose the operating point, and optimising that threshold on out-of-fold predictions is often worth more than any model change.
- **Ranking and top-*k* metrics** care only about order near the top; effort spent on the tail of the distribution is wasted.
- **Custom or asymmetric metrics** — quantile losses, weighted errors — usually reward training against them directly rather than against a convenient proxy.

Two moves follow from reading the metric carefully, and both are cheap. **Train the loss
that matches the metric** where possible. And **optimise post-processing on out-of-fold
predictions** — thresholds, calibration, clipping to a plausible range, rounding to
observed values. These take minutes and are regularly worth more than a day of
architecture work.

## The playbook by data type

| Data | Start with | Notes |
| --- | --- | --- |
| **Tabular** | Gradient-boosted trees (LightGBM, XGBoost, CatBoost) | Still the strongest baseline on most tabular problems. Handles mixed types, missing values, and irrelevant features with minimal preparation |
| **Images** | Pretrained backbone, fine-tuned | Chapter 17's recipe. Resolution and augmentation usually beat architecture |
| **Text** | Pretrained transformer, fine-tuned | Match the checkpoint to the language and domain |
| **Time series** | GBDT on lag/rolling features, plus a statistical baseline | Classical baselines are strong and frequently beat deep models; the features carry the work |
| **Multi-modal** | Separate encoders, concatenate, or ensemble | Often simpler and stronger than a joint architecture |

The tabular row is the one people find surprising, and it has held up under systematic
study: tree ensembles remain competitive with or better than neural networks on typical
tabular datasets, and they get there with far less tuning. On tabular problems, reach for
a neural network to add *diversity to an ensemble*, not to replace the boosted trees.

## Where the gains are, roughly ordered

**Feature engineering, on tabular problems.** This is where most of the movement is.
Aggregations by group, ratios and differences between related columns, time-since-event,
target encodings computed strictly inside the fold, and count/frequency features. Domain
knowledge about what the columns *mean* converts directly into features, which is why
reading the competition forum and the data source's documentation is genuinely productive
time.

**Error analysis.** Sort the out-of-fold predictions by error and look at the worst ones.
Structure in that list — one category, one time period, one source, one image condition —
suggests a specific fix, which is a much better use of a day than another hyperparameter
sweep. This is the highest-value habit in the chapter and the one most often skipped
because it isn't automatable.

**Data volume and quality.** External data where permitted, pseudo-labelling of test data
where the rules allow it, and cleaning obvious label errors. Pseudo-labelling — train,
predict on unlabelled data, add confident predictions as training targets, retrain — is
powerful and dangerous: it amplifies your model's existing biases, and if the pseudo-labels
leak across folds the CV score becomes meaningless.

**Training recipe.** Longer schedules, better augmentation, mixed precision to afford more
experiments, an appropriate learning-rate schedule.

**Hyperparameter tuning.** Real but sharply diminishing. A rough learning-rate and
regularisation search gets most of the available gain; the exhaustive search after that
typically buys a fraction of what a good feature or a second model family would. Bayesian
optimisation (Optuna and similar) is more sample-efficient than grid search, and random
search beats grid search at equal budget — grid search wastes evaluations on parameters
that don't matter.

## Iteration speed is a strategy

The competitor who can test an idea in ten minutes will test fifty ideas while someone on
a four-hour cycle tests three. Making experiments fast is therefore a first-class
investment, not an optimisation:

- **Work on a subsample** for early exploration, and confirm on the full data only when something looks promising.
- **Cache aggressively** — precomputed features, cached frozen-backbone embeddings, preprocessed shards on fast storage.
- **Train one fold, not five**, while exploring. Run the full CV only for decisions you'll act on.
- **Automate the submission path** so producing one is a single command with no manual steps to get wrong.

The corresponding trap is optimising infrastructure past the point of return. Two days
building a distributed experiment framework for a two-week competition is a loss.

## What to take away

- Get an end-to-end submission working on day one with a trivial model.
- Read the metric and optimise it directly — including thresholds and calibration on out-of-fold predictions.
- Gradient-boosted trees for tabular, pretrained backbones for images and text. Neural networks on tabular data earn their place through ensemble diversity.
- Feature engineering and error analysis move the score more than hyperparameter search does.
- Keep an experiment log against fixed folds; its value is stopping you from repeating disproved ideas.
- Fast iteration compounds. Subsample, cache, single-fold, and only then run the full thing.

## References

- Chen & Guestrin, [*XGBoost: A Scalable Tree Boosting System*](https://arxiv.org/abs/1603.02754) (2016) · Ke et al., [*LightGBM*](https://papers.nips.cc/paper_files/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html) (NeurIPS 2017) · Prokhorenkova et al., [*CatBoost*](https://arxiv.org/abs/1706.09516) (2018)
- Grinsztajn, Oyallon & Varoquaux, [*Why do tree-based models still outperform deep learning on typical tabular data?*](https://arxiv.org/abs/2207.08815) (NeurIPS 2022)
- Bergstra & Bengio, [*Random Search for Hyper-Parameter Optimization*](https://jmlr.org/papers/v13/bergstra12a.html) (JMLR 2012)
- Akiba et al., [*Optuna: A Next-generation Hyperparameter Optimization Framework*](https://arxiv.org/abs/1907.10902) (2019)
- Sohn et al., [*FixMatch: Simplifying Semi-Supervised Learning with Consistency and Confidence*](https://arxiv.org/abs/2001.07685) (2020) — confidence-thresholded pseudo-labelling done carefully
