---
title: "The Training Loop"
description: "Six lines of mechanism, plus the optimizer, schedule, precision and checkpoint decisions wrapped around them."
track: 5
chapter: 1
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**Autograd & the Backward Pass** — gradient accumulation and `zero_grad`.
:::

## The whole thing

```python
for epoch in range(epochs):
    model.train()
    for x, y in train_loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)
        loss = criterion(model(x), y)
        loss.backward()
        optimizer.step()
        scheduler.step()

    model.eval()
    with torch.inference_mode():
        for x, y in val_loader:
            ...
```

Every trainer library — Lightning, Hugging Face `Trainer`, Fabric, your team's internal
one — is this loop plus logging, distribution, and checkpointing. Frameworks are worth
using; they are not worth using before you can write these lines from memory, because
what they abstract away is exactly what you'll need to reason about when a run goes
wrong.

The one structural detail that isn't obvious: `model.train()` and `model.eval()` are not
decoration. They switch dropout on and off, and they switch batch normalisation between
using the current batch's statistics and its accumulated running statistics. A validation
pass in `train()` mode reports a number that is wrong in a direction that depends on
batch size, and an inference server left in `train()` mode gives different answers
depending on what else is in the batch.

## Loss functions and the shapes they want

| Task | Loss | Model output | Target |
| --- | --- | --- | --- |
| Multi-class classification | `CrossEntropyLoss` | Raw logits `(N, C)` | `int64` indices `(N,)` |
| Binary / multi-label | `BCEWithLogitsLoss` | Raw logits `(N,)` or `(N, C)` | Float 0/1, same shape |
| Regression | `MSELoss`, `L1Loss`, `HuberLoss` | `(N, *)` | Same shape exactly |

The recurring error is applying a softmax or sigmoid before a loss that expects logits.
`CrossEntropyLoss` *is* log-softmax plus negative log-likelihood; feeding it probabilities
trains a model that still learns, badly, with no error raised. The `WithLogits` variants
exist because doing the combination in one step is numerically stable, and the separate
version isn't.

## Optimizers

Two are worth knowing properly.

**SGD with momentum** is still the strongest baseline for convolutional vision models
trained from scratch, and it generalises slightly better than adaptive methods on those
workloads. It needs a well-tuned learning rate and schedule to do so.

**AdamW** is the default everywhere else, and effectively mandatory for transformers. It
adapts a per-parameter step size from gradient statistics, which makes it far less
sensitive to learning-rate choice.

Prefer `AdamW` to `Adam`. Adam's `weight_decay` is folded into the gradient, where the
adaptive scaling distorts it; AdamW applies decay directly to the weights, which is what
"weight decay" is supposed to mean and measurably improves generalisation. This is a
one-word change with a real effect.

Two details that matter and are usually skipped:

- **Don't decay biases and normalisation parameters.** Standard practice is two parameter
  groups — decay on weights, none on biases, `LayerNorm`/`BatchNorm` scales and shifts.
- **Adam's optimizer state is two extra copies of every parameter.** Memory planning for
  a large model has to include it.

## The learning rate is the hyperparameter

If you can tune one thing, tune this. Everything else is a smaller effect.

Rough signatures: a loss that diverges or goes to NaN in the first hundred steps is
almost always the LR being too high; a loss that decreases steadily but glacially is it
being too low. A short **LR range test** — ramp the rate up over a few hundred steps and
plot loss against it — locates the usable band in minutes.

**Schedules** matter nearly as much as the initial value.

| Schedule | Where it fits |
| --- | --- |
| Cosine decay to ~0 | The reliable default for a fixed budget |
| Linear warmup then decay | Required for transformers; large-batch training generally |
| Step decay | Classic vision recipes, reproducing older papers |
| One-cycle | Fast convergence on small budgets |
| Reduce-on-plateau | When the run length isn't known ahead of time |

**Warmup** deserves a note. Starting at the full rate with a randomly initialised model
produces enormous early gradients, and adaptive optimizers additionally have unreliable
variance estimates in the first steps. A few hundred steps of ramp costs nothing and
prevents a class of divergence that looks mysterious.

Batch size and learning rate are coupled: raising the batch size reduces gradient noise,
so the rate usually needs to rise with it — linearly is a workable heuristic in the
regimes where it's been studied, with warmup, up to a limit past which it stops holding.

Call `scheduler.step()` in the right place: per-batch for warmup and cosine schedules
defined in steps, per-epoch for epoch-based ones. Mixing the two silently compresses the
entire schedule into the first epoch.

## Mixed precision

Modern accelerators compute in 16-bit far faster than in 32-bit. Automatic mixed
precision runs the forward and backward passes in `bfloat16` or `float16` while keeping
master weights in `float32`:

```python
scaler = torch.amp.GradScaler()
with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
    loss = criterion(model(x), y)
scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()
```

Typically a 1.5–3× speedup and roughly half the activation memory, for a few lines. Use
`bfloat16` where the hardware supports it — its exponent range matches `float32`, so the
gradient scaler becomes unnecessary. `float16` has a narrow range, which is exactly what
`GradScaler` compensates for by multiplying the loss before backward and unscaling before
the step. If you clip gradients, call `scaler.unscale_(optimizer)` first, or you'll clip
the scaled values and the threshold means nothing.

`torch.compile(model)` is the other cheap win on recent versions: a graph capture and
kernel fusion pass that often gives a further speedup for one line, at the cost of a
compilation pause on the first batch and recompilation whenever input shapes change.

## Checkpointing, and what "the model" means

Save enough to *resume*, not just to *load*:

```python
torch.save({
    "model": model.state_dict(),
    "optimizer": optimizer.state_dict(),
    "scheduler": scheduler.state_dict(),
    "scaler": scaler.state_dict(),
    "epoch": epoch,
    "best_metric": best,
}, path)
```

Optimizer state is the part people omit, and resuming without it restarts momentum and
Adam's moment estimates from zero, producing a visible dent in the loss curve. Save
`state_dict`s rather than pickled model objects — a pickled model binds to your class
definitions and import paths, and breaks on the next refactor. It's also a code-execution
vector when loading files you didn't produce; prefer `safetensors` for anything shared,
and use `weights_only=True` with `torch.load` otherwise.

Keep two checkpoints: the **latest** (for resuming after a crash) and the **best by
validation metric** (for using). Early stopping — halt when validation hasn't improved
for *n* evaluations — is really just "keep the best checkpoint" with the training budget
saved as well.

## What to take away

- `model.train()` / `model.eval()` change what dropout and batch norm do. Every evaluation needs `eval()` plus `inference_mode()`.
- Losses take raw logits. Don't apply softmax or sigmoid first.
- AdamW for transformers and most fine-tuning; SGD with momentum still competitive for vision from scratch. Exclude biases and norm parameters from weight decay.
- Tune the learning rate before anything else, use warmup plus cosine decay, and step the scheduler at the frequency it was defined in.
- Mixed precision is a large speedup for a few lines; prefer `bfloat16` and skip the scaler.
- Checkpoint optimizer and scheduler state too, and keep both the latest and the best.

## References

- Loshchilov & Hutter, [*Decoupled Weight Decay Regularization*](https://arxiv.org/abs/1711.05101) (2019) — AdamW
- Kingma & Ba, [*Adam: A Method for Stochastic Optimization*](https://arxiv.org/abs/1412.6980) (2015) · Loshchilov & Hutter, [*SGDR: Warm Restarts*](https://arxiv.org/abs/1608.03983) (2017) — cosine schedules
- Goyal et al., [*Accurate, Large Minibatch SGD*](https://arxiv.org/abs/1706.02677) (2017) — warmup and the linear scaling rule
- Micikevicius et al., [*Mixed Precision Training*](https://arxiv.org/abs/1710.03740) (2018) · [PyTorch — automatic mixed precision](https://pytorch.org/docs/stable/notes/amp_examples.html)
- Smith, [*Cyclical Learning Rates for Training Neural Networks*](https://arxiv.org/abs/1506.01186) (2017) — the LR range test
- [PyTorch — saving and loading models](https://pytorch.org/tutorials/beginner/saving_loading_models.html) · [`torch.compile`](https://pytorch.org/docs/stable/torch.compiler.html)
