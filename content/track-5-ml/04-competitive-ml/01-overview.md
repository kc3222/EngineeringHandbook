---
title: "Competitive ML (Kaggle Playbook)"
description: "What actually moves you into the top ranks: validation discipline, ensembling, and avoiding leaderboard traps."
track: 5
chapter: 4
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**PyTorch & Model Training Basics**. The vision and self-supervised chapters are useful
context but not required — much of this applies to tabular problems with no deep learning
in them at all.
:::

## Why this chapter exists

Machine learning competitions strip a modelling problem down to a fixed dataset, a fixed
metric, and a ranked scoreboard. That's artificial in ways worth naming — the problem is
already framed, the data is already collected, and the metric was chosen by someone else.
Those three steps are most of the work in real projects and none of the work here.

What survives the artificiality is worth learning anyway, because the skills that separate
the top of a leaderboard from the middle are the same ones that separate a model that
holds up in production from one that doesn't:

- **Building a validation scheme you can trust**, which is the single highest-leverage skill in applied ML and almost the only thing that matters here.
- **Knowing what moves a score** and what merely feels productive.
- **Combining models** so their errors cancel.
- **Not fooling yourself** with a number computed on data you've already used a hundred times.

Competitions make the feedback loop fast and the failure public, which is an unusually
efficient way to learn all four. The specific hazard they teach best — that a score you
optimised against stops being an unbiased estimate of anything — is a general result that
applies to any held-out set you evaluate against repeatedly.

## What's in here

| Page | What it covers |
| --- | --- |
| Validation Discipline | Building a split that mirrors the test set, leakage, and trusting your CV over the leaderboard |
| What Actually Moves the Score | Baselines, the metric, model choice by data type, and where tuning stops paying |
| Ensembling & the Endgame | Blending, stacking on out-of-fold predictions, shakeup, and submission selection |

## Where this connects

The validation material extends **Datasets & Input Pipelines** from Chapter 1 and pairs
directly with **Evaluation & Where CV Models Fail** in Chapter 2 — same discipline, seen
from the competitive side. The modelling recipes assume the training loop from Chapter 1
and the transfer-learning approach from Chapter 2.

The largest caveat, stated once here and revisited at the end: **a competition solution is
not a production system.** Leaderboard-optimal solutions routinely ensemble dozens of
models for a fraction of a percent, exploit quirks of a specific dataset, and ignore
latency, cost, maintainability, and drift. The validation discipline transfers completely.
The final model usually shouldn't.

## References

- [Kaggle — competition documentation](https://www.kaggle.com/docs/competitions) — how public and private leaderboards, submission limits, and final selection work
- Blum & Hardt, [*The Ladder: A Reliable Leaderboard for Machine Learning Competitions*](https://arxiv.org/abs/1502.04585) (2015) — why repeated leaderboard feedback degrades a held-out set
- Sculley et al., [*Hidden Technical Debt in Machine Learning Systems*](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html) (NeurIPS 2015) — the gap between a good model and a maintainable system
