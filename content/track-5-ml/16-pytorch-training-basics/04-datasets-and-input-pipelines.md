---
title: "Datasets & Input Pipelines"
description: "Feeding the accelerator, why the bottleneck is usually here, and the split you have to build before you look at the data."
track: 5
chapter: 16
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Tensors, Shapes & Devices** — batching, dtypes, and host-to-device transfer.
:::

## Two objects, one contract

PyTorch splits data handling in two. A **`Dataset`** answers "give me example *i*". A
**`DataLoader`** turns that into batches, in some order, using some number of worker
processes.

```python
class ReviewDataset(Dataset):
    def __init__(self, rows, transform=None):
        self.rows, self.transform = rows, transform

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        x, y = self.rows[i]
        if self.transform:
            x = self.transform(x)
        return x, torch.tensor(y, dtype=torch.long)

loader = DataLoader(ds, batch_size=32, shuffle=True, num_workers=8,
                    pin_memory=True, drop_last=True)
```

That's the **map-style** dataset: random access by index, which is what shuffling and
distributed sampling need. The alternative, `IterableDataset`, yields examples in
sequence and is the right choice when the data is a stream or a set of shards too large
to index — at the cost that you now own sharding across workers yourself, and getting it
wrong means every worker replays the same examples.

Keep `__getitem__` cheap and free of global state. It runs in a worker process, so a
database handle or an open file created in `__init__` gets forked into every worker with
results ranging from slow to corrupt. Open per-worker resources lazily, on first access.

## Collation, and variable-length data

The default `collate_fn` stacks the *i*-th element of each sample into a batch tensor. It
works when every sample has identical shape and fails loudly when they don't — which is
every sequence task and every detection task.

Two ways out. **Pad to the longest item in the batch** with a custom `collate_fn`, which
wastes less than padding to a global maximum and pairs with an attention mask or
`pack_padded_sequence`. Or **bucket by length** so batches contain similar-length items,
which cuts padding waste substantially on skewed length distributions at the cost of a
little randomness in batch composition.

Variable-size outputs — a list of boxes per image — usually can't be a single tensor at
all. Returning a list from `collate_fn` is legitimate; the model deals with it.

## The pipeline is usually the bottleneck

An underfed accelerator idles between batches, and the symptom is unhelpfully generic:
low GPU utilisation and an epoch time that doesn't improve when you make the model
smaller. Diagnose it directly — if a run with synthetic tensors held in memory is much
faster than the real one, the model is not your problem.

| Lever | What it does | Watch out for |
| --- | --- | --- |
| `num_workers` | Parallel loading processes | Too many causes memory pressure and CPU contention; tune it, don't max it |
| `pin_memory=True` | Page-locked host buffers | Only helps with `non_blocking=True` on the transfer |
| `persistent_workers=True` | Keeps workers alive across epochs | Worth it when startup cost is a visible fraction of a short epoch |
| `prefetch_factor` | Batches queued per worker | Trades host RAM for smoothness |
| Decode format | JPEG decode is often the real cost | Pre-resizing to training resolution, or packing into shards, often beats any flag |

The ordering matters: flags are worth minutes, and the storage format is worth hours.
Thousands of small files on network storage is the classic pathology — the fix is
packing them into sequential shards (WebDataset-style tar files, Arrow, or similar), not
adding workers.

On the GPU side, moving augmentation onto the device (NVIDIA DALI, `torchvision.transforms.v2`
operating on batched tensors) helps when the CPU is genuinely saturated and hurts when
it isn't, since it competes with the model for the same silicon.

## Augmentation is part of the dataset, not the model

Transforms belong in `__getitem__` so they run in parallel across workers and produce a
different sample each epoch. Two rules:

**Training and evaluation transforms differ.** Random crops and flips belong to training;
evaluation gets a deterministic resize and centre crop. A single shared transform is a
common and quietly damaging bug — random augmentation at evaluation time makes your
metric noisy and pessimistic.

**Normalisation must match whatever produced the weights.** If you're fine-tuning a
model pretrained on ImageNet, the mean and standard deviation it expects are part of its
interface. Applying your own dataset's statistics instead is a silent accuracy loss.

Worker processes need their random seeds handled too: without care, forked workers can
inherit the same NumPy seed and generate *identical* "random" augmentations across
workers. PyTorch's own RNG is seeded per worker correctly; libraries you call inside
`__getitem__` may not be. `worker_init_fn` is where you fix that.

## Splits: build them before you look

The split is a modelling decision, not a preprocessing detail, and it's the one that
decides whether your validation number means anything. Get it wrong and every downstream
measurement is optimistic.

- **Split before augmenting, before oversampling, and before fitting any preprocessing.** A scaler or vocabulary fitted on all the data has seen the validation set.
- **Group leakage is the common one.** Multiple photos of the same patient, several rows per user, augmented copies of one source image — all must land in the same fold. `GroupKFold` and its relatives exist for this.
- **Time-ordered data splits by time.** Random splits let the model interpolate between past and future, which is not the task and not the deployment condition.
- **Near-duplicates leak.** Web-scraped datasets contain the same image or paragraph many times; deduplicate before splitting.

Chapter 19 treats this at length — it's the single skill that separates reliable results
from irreproducible ones. The rule of thumb: **your validation split should mimic the way
production data will differ from training data.**

## Class imbalance and sampling

Two levers, and they're not equivalent. `WeightedRandomSampler` changes which examples
appear; a class-weighted loss changes how much each contributes. Weighted sampling gives
the rare class more gradient signal but repeats the same few examples, which invites
overfitting; loss weighting sees each example once but leaves the rare-class gradient
sparse. Neither fixes a genuinely under-sampled class — a class with 12 examples is a
data collection problem, not a sampler configuration.

Whichever you pick, **do not resample the validation set**. Its job is to reflect the
real distribution.

## What to take away

- `Dataset` returns one example; `DataLoader` handles batching, ordering, and parallelism. Keep `__getitem__` cheap and worker-safe.
- Variable-length data needs a custom `collate_fn` — pad per batch, or bucket by length.
- Suspect the input pipeline first when the GPU is idle. Storage layout beats tuning `num_workers`.
- Training and evaluation transforms must differ; normalisation must match the pretrained weights.
- Build the split before doing anything else, group by whatever unit leaks, and split by time when time matters.
- Rebalance the training set if you like; never the validation set.

## References

- [PyTorch — `torch.utils.data`](https://pytorch.org/docs/stable/data.html) — dataset styles, samplers, worker semantics, and the `worker_init_fn` seeding note
- [torchvision — transforms v2](https://pytorch.org/vision/stable/transforms.html), including batched and GPU-side transforms
- [scikit-learn — cross-validation and group-aware splitters](https://scikit-learn.org/stable/modules/cross_validation.html)
- Kaufman et al., [*Leakage in Data Mining: Formulation, Detection, and Avoidance*](https://dl.acm.org/doi/10.1145/2020408.2020496) (KDD 2011) — the canonical taxonomy of leakage
