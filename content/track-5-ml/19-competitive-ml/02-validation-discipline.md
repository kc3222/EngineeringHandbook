---
title: "Validation Discipline"
description: "Building a split that mirrors the test set, the leakage catalogue, and why you trust your CV over the leaderboard."
track: 5
chapter: 19
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Datasets & Input Pipelines** — group splits and the basics of leakage.
:::

## Your validation score is the product

Everything else is downstream of this. Feature engineering, architecture choice,
ensembling — all of them are decisions made by comparing validation scores, so if that
number is biased, every decision built on it is unreliable and the effort spent producing
them is wasted. Competitors who finish consistently high are not doing anything exotic in
their models; they built a trustworthy local score early and then iterated faster and more
honestly than everyone else.

The governing principle is one sentence: **your validation split should differ from your
training data in the same way the test set differs from both.**

Everything below is an application of it.

## Matching the split to the test set

Read the competition's data description before writing any code, and answer: how was the
test set constructed? The answer dictates the split.

| If the test set... | Split by | Otherwise |
| --- | --- | --- |
| Is a random sample of the same pool | Stratified K-fold on the target | — |
| Covers a later time period | Time-based / forward chaining | The model interpolates across time and the score is fantasy |
| Contains entirely unseen subjects, users, or sites | `GroupKFold` on that entity | The model recognises the entity instead of the pattern |
| Has a different class balance | Match the test distribution, or reweight | Your threshold and metric are tuned for the wrong prior |
| Is a different source or device | Leave-one-group-out, grouped by source | You measure in-source accuracy and ship cross-source |

**Stratification** — keeping the class proportions equal across folds — is nearly always
right for classification, and essential when the positive class is rare. For grouped and
stratified requirements together, `StratifiedGroupKFold` exists; hand-rolling that
combination is a common source of subtle error.

Time series deserve their own note because the intuitive split is wrong twice over. Random
K-fold lets the model train on the future and predict the past. Even a single train/test
cut can leak through features computed over the whole series — a rolling mean, a target
encoding, a scaler fitted globally. The correct structure is **forward chaining**: train
on `[0, t)`, validate on `[t, t+k)`, roll forward. And any feature must be computable using
only information available at prediction time — this is where most time-series leakage
actually enters.

## The leakage catalogue

Leakage is any path by which information about the target reaches the model that won't
exist at prediction time. It is the reason for scores that seem too good, and the
diagnostic is exactly that feeling: **a 0.99 AUC on a hard problem is a bug report, not a
result.**

The recurring forms:

- **Preprocessing fitted on all the data.** Scalers, imputers, PCA, vocabularies, target encodings. Fit inside the fold, on training data only. A `Pipeline` object enforces this; doing it by hand does not.
- **Group leakage.** The same patient, user, product, or source image appearing in both sides of the split. The most common leak in real datasets.
- **Duplicate and near-duplicate rows.** Web-scraped and augmented datasets are full of them. Deduplicate before splitting.
- **Temporal leakage.** Any feature using future information, including "days until next purchase" or a rolling statistic centred on the current row.
- **Target-derived features.** Something computed from the label — often indirectly, three joins away. Ask of every feature: *would I have this value at prediction time?*
- **Metadata artefacts.** Row order, ID ranges, file timestamps, image resolution that happens to correlate with the class. These come from how the data was assembled, and they will not generalise.

That last category has its own history in competitions: exploiting a metadata leak can win
an individual contest, and it teaches nothing. When you find one, the useful move is to
understand it and then decide deliberately, rather than to discover on the private
leaderboard that it was an artefact of the public split.

## How many folds, and how much noise

Five folds is the standard default: enough to average out fold-level variance, cheap
enough to run repeatedly. Ten folds gives slightly less biased estimates for more compute,
and is worth it on small datasets where each fold is thin.

The number that actually matters is the **standard deviation across folds**, and you
should report it alongside the mean every time. If fold scores are 0.812, 0.847, 0.798,
0.851, 0.809, then a change moving your mean by 0.003 has measured nothing. Most reported
"improvements" in a modelling session are inside this noise band.

Two ways to see through it. **Repeated CV with different seeds** — several full runs with
different fold assignments — separates a real effect from a lucky partition, at linear
cost. And **fixing the fold assignment across all experiments** means two configurations
are compared on identical splits, which removes partition noise from the comparison even
though it doesn't reduce the absolute uncertainty. Do the second always; do the first
before believing anything close.

When you tune hyperparameters against a CV score, the selected score is itself optimistic —
you picked the maximum of many noisy estimates. **Nested cross-validation** measures the
tuning procedure honestly, with an inner loop for selection and an outer loop for
estimation. It's expensive and frequently skipped, which is precisely why tuned scores
should be assumed inflated.

## CV versus the public leaderboard

The public leaderboard is a validation score computed on a subset of the test data,
usually small, and shared with thousands of competitors who are all fitting to it. It is
seductive, it is noisy, and it is much smaller than your cross-validation set.

**Trust your CV.** The standard practice is to track both, and to watch the *relationship*
rather than either number alone:

- **CV improves, LB improves.** Normal. Continue.
- **CV improves, LB doesn't.** Usually LB noise, particularly if the public split is small. Keep going, don't chase it.
- **CV doesn't improve, LB does.** The dangerous one. You are fitting the public split, and the private leaderboard will punish it.
- **Both flat.** The change did nothing. Believe it.
- **Large constant offset between them.** Your CV doesn't mirror the test distribution. Fix the split before doing anything else — this is information, not a nuisance.

Each submission consumes a little of the leaderboard's remaining value as an unbiased
estimate. This is a formal result, not a heuristic: repeated adaptive querying of a
held-out set overfits it, and the effect grows with the number of queries. It applies with
equal force to a validation set in a long-running internal project, where nobody counts
the queries at all.

## What to take away

- Your validation split should differ from training in the same way the test set differs from both.
- Match the split's structure to how the test set was built: grouped, temporal, stratified, or source-held-out.
- Fit every preprocessing step inside the fold; a `Pipeline` makes that structural.
- Report the standard deviation across folds. Differences smaller than it are not results.
- Fix fold assignments across experiments so comparisons are paired.
- Trust CV over the public leaderboard, and treat "LB up, CV flat" as a warning rather than progress.

## References

- [scikit-learn — cross-validation, `StratifiedGroupKFold`, and `TimeSeriesSplit`](https://scikit-learn.org/stable/modules/cross_validation.html)
- Kaufman, Rosset & Perlich, [*Leakage in Data Mining: Formulation, Detection, and Avoidance*](https://dl.acm.org/doi/10.1145/2020408.2020496) (KDD 2011)
- Cawley & Talbot, [*On Over-fitting in Model Selection and Subsequent Selection Bias in Performance Evaluation*](https://jmlr.org/papers/v11/cawley10a.html) (JMLR 2010) — the case for nested CV
- Dwork et al., [*Preserving Statistical Validity in Adaptive Data Analysis*](https://arxiv.org/abs/1411.2664) (2015) · Blum & Hardt, [*The Ladder*](https://arxiv.org/abs/1502.04585) (2015)
- Kapoor & Narayanan, [*Leakage and the Reproducibility Crisis in ML-based Science*](https://arxiv.org/abs/2207.07048) (2023) — the same errors, published
