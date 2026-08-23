---
title: "Debugging a Training Run"
description: "A diagnostic order that beats changing hyperparameters at random, and what each shape of loss curve is telling you."
track: 5
chapter: 1
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**The Training Loop** — you need something to debug.
:::

## Start by making the problem small

The defining feature of a broken training run is that it doesn't raise. The loss goes
down a bit and stops, or the validation number is worse than a constant predictor, and
nothing anywhere says why. The temptation is to start turning knobs. Resist it: a
hyperparameter search over a codebase with a bug is an expensive way to find nothing.

Work in this order. It's roughly ordered by how much time each step costs against how
often it finds the problem.

**1 · Look at the data your model actually receives.** Not the files on disk — the
tensors at the point they enter the model. Take one batch, undo the normalisation,
render or print it, and check its label. This single step catches shuffled labels,
off-by-one class indices, channels in the wrong order, images already normalised twice,
and empty text fields. It is the highest-yield ten minutes available.

**2 · Check the shapes and the loss at initialisation.** A randomly initialised
*C*-class classifier should start near `ln(C)` — about 2.30 for 10 classes, 6.91 for
1,000. A starting loss far from that means the outputs are already skewed: a bad
initialisation, a bias set wrong, or targets that aren't what you think.

**3 · Overfit a single batch.** The best test in the field.

```python
x, y = next(iter(train_loader))
for _ in range(300):
    optimizer.zero_grad(set_to_none=True)
    loss = criterion(model(x), y)
    loss.backward()
    optimizer.step()
```

With regularisation off, this should drive the loss to nearly zero. A model that cannot
memorise eight examples has a bug — not a capacity problem, not a data problem, a bug —
and the usual culprits are a missing `optimizer.step()`, a detached graph, a frozen
parameter group, or targets that don't correspond to the inputs. If it *does* fit, your
mechanism is sound and the problem is in generalisation, data volume, or the schedule.

**4 · Only now, tune.** Learning rate first.

## Reading the loss curve

| Shape | Most likely cause |
| --- | --- |
| Flat from step 0 | LR far too low, gradients not flowing (`requires_grad`, frozen layers), or `optimizer.step()` never called |
| Drops then plateaus high | LR too high for the current phase, model too small, or the task needs features the input lacks |
| Diverges or NaN early | LR too high, no warmup, exploding gradients, or a numerically unstable loss |
| Erratic, no trend | Missing `zero_grad`, batch size too small, or duplicated/conflicting labels |
| Train falls, validation rises | Overfitting — the normal, expected pattern; add regularisation or data |
| Validation *better* than train | Usually not a miracle: dropout inflates the training loss, or the validation split is easier or leaking |
| Sudden spike, then recovery | One pathological batch. Log the gradient norm and go find it |
| Sawtooth aligned with epochs | The data isn't being reshuffled, or the schedule is stepping at the wrong frequency |

That last "validation better than train" row is worth internalising, because it's read as
good news. Training loss is averaged *during* the epoch with dropout active while
validation is measured after it with dropout off, so a small gap is an artefact. A large
one means the split leaks.

## NaNs

A loss that becomes NaN stays NaN — the parameters are poisoned within a step. The
sources are a short list:

- **Learning rate too high**, by a wide margin the most common.
- **`log(0)` or division by zero** in a hand-written loss. Add an epsilon, or use the framework's stable version.
- **`float16` overflow** in mixed precision. `bfloat16` or a working `GradScaler` fixes it.
- **Bad input data** — a NaN in the features, an unnormalised outlier, an infinity from a corrupt row.
- **Exploding gradients** in deep recurrent or unnormalised networks. Clip.

`torch.autograd.set_detect_anomaly(True)` reports the forward operation responsible for a
NaN in the backward pass. It's slow enough that you only want it while hunting, but it
turns "somewhere in the model" into a line number.

## Bugs that don't raise

Ranked by how much time they cost before being found:

- **Forgetting `model.eval()`** — validation numbers are noisy and wrong; inference results depend on the batch.
- **Forgetting `optimizer.zero_grad()`** — gradients accumulate across steps.
- **Applying softmax before `CrossEntropyLoss`** — the model still trains, just worse.
- **Different preprocessing at train and inference time** — the most common *production* failure of an otherwise correct model.
- **A trailing dimension broadcasting in the loss** — `(N, 1)` against `(N,)` silently becomes `(N, N)`.
- **Data leakage** — the validation score is excellent and means nothing.
- **Augmentation left on at evaluation time** — the metric is pessimistic and noisy.
- **Normalisation statistics that don't match pretrained weights** — a few points of accuracy, invisible.

Two of these are worth automating away. A shape assertion at the loss is one line. A
single shared preprocessing function used by training, evaluation, and serving eliminates
the train/serve skew class entirely — the bug exists because those three paths are
usually written in three different files.

## Reproducibility, honestly

```python
torch.manual_seed(seed); np.random.seed(seed); random.seed(seed)
torch.use_deterministic_algorithms(True)   # raises on nondeterministic kernels
```

Seeding gets you most of the way. Full bitwise determinism additionally requires
deterministic kernel selection, a fixed `cuBLAS` workspace configuration, and seeded
DataLoader workers — and it costs speed, because the fast implementation of several
operations is nondeterministic by design (atomic accumulation in a nondeterministic
order). Results are not guaranteed to be reproducible across PyTorch versions, CUDA
versions, or hardware, and no flag changes that.

The practical stance for most work is: seed everything, don't chase bitwise identity, and
**treat run-to-run variance as a measurement to make rather than a nuisance to
suppress**. If two configurations differ by less than the spread across three seeds of
the same configuration, you have not measured a difference. This is the most common way
that reported improvements turn out not to exist.

## What to log

Loss alone is not enough to diagnose anything. From the start, log: learning rate (it's
scheduled — confirm it's doing what you think), gradient norm, the validation metric you
actually care about rather than only the loss, throughput in examples/second, and a
handful of predictions on fixed examples so you can see qualitative change. Record the
config, the git commit, and the data version alongside the metrics — an experiment you
can't attribute to a code state is an experiment you'll be repeating.

## What to take away

- Inspect the tensors entering the model before touching a hyperparameter.
- Check the initial loss against `ln(C)`, then overfit a single batch. If that fails, it's a bug, not a tuning problem.
- Learn the loss-curve shapes; each points at a small set of causes.
- NaN is nearly always the learning rate, a `log(0)`, or fp16 overflow. `detect_anomaly` finds the operation.
- The expensive bugs are silent: `eval()`, `zero_grad()`, broadcasting in the loss, train/serve preprocessing skew, leakage.
- Seed everything, accept that bitwise determinism is expensive, and measure seed variance before believing an improvement.

## References

- [PyTorch — reproducibility and nondeterministic operations](https://pytorch.org/docs/stable/notes/randomness.html)
- [PyTorch — `torch.autograd.set_detect_anomaly`](https://pytorch.org/docs/stable/autograd.html#anomaly-detection)
- Karpathy, [*A Recipe for Training Neural Networks*](https://karpathy.github.io/2019/04/25/recipe/) (2019) — the source of the overfit-one-batch discipline
- Picard, [*Torch.manual_seed(3407) is all you need*](https://arxiv.org/abs/2109.08203) (2021) — how large seed variance actually is on standard benchmarks
- Sculley et al., [*Hidden Technical Debt in Machine Learning Systems*](https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html) (NeurIPS 2015) — why train/serve skew is structural rather than careless
