---
title: "Tensors, Shapes & Devices"
description: "The three attributes that decide whether your code runs, plus the broadcasting rules that let it run and be wrong."
track: 5
chapter: 16
page: 2
readMinutes: 5
---

:::info[Prerequisites]
None beyond Python and NumPy-style array indexing.
:::

## A tensor is an array with three attributes

A tensor is a multidimensional array. Almost everything you need to know about one is in
three attributes, and almost every error you'll hit is a mismatch in one of them.

```python
x = torch.randn(32, 3, 224, 224)
x.shape    # torch.Size([32, 3, 224, 224])
x.dtype    # torch.float32
x.device   # device(type='cpu')
```

**Shape** is the layout — here, 32 images, 3 channels, 224×224 pixels. **dtype** is the
numeric type. **device** is where the memory lives. Two tensors must agree on dtype and
device to be combined at all, and must be *compatible* in shape, which is a weaker and
more dangerous condition than "equal".

## Shape is where the time goes

Batch dimension first is the convention throughout PyTorch: `(N, ...)` where `N` is the
batch. Beyond that, layouts are conventions per domain, and the conventions disagree.

| Data | Conventional shape | Note |
| --- | --- | --- |
| Images | `(N, C, H, W)` | Channels-first. Most other ecosystems, including TensorFlow and PIL, are channels-last |
| Token sequences | `(N, L)` for ids, `(N, L, D)` after embedding | Some older RNN APIs default to `(L, N, D)` — check `batch_first` |
| Tabular | `(N, F)` | Features flat |
| Classification targets | `(N,)` of `int64` | Class *indices*, not one-hot, for `CrossEntropyLoss` |

The single most common beginner error is passing one-hot targets to a loss that wants
indices, or the reverse. The second is a spurious trailing dimension: a model emitting
`(N, 1)` against a target of `(N,)`.

That second one deserves emphasis because **it does not raise**. Under broadcasting,
`(N, 1)` against `(N,)` produces an `(N, N)` matrix, and `MSELoss` will happily average
it into a scalar. The run trains, the loss decreases, and the model is optimising
something you didn't ask for. `nn.MSELoss` emits a warning here; plenty of hand-written
losses don't.

## Broadcasting: the rule and the trap

When shapes differ, PyTorch aligns them from the **trailing** dimension and expands any
dimension that is 1 or missing:

```python
a = torch.randn(4, 3)     # (4, 3)
b = torch.randn(3)        # (3,)     → treated as (1, 3) → expands to (4, 3)
a + b                     # (4, 3)   ✓ what you wanted

c = torch.randn(4, 1)
a + c                     # (4, 3)   ✓ also fine

d = torch.randn(4)        # (4,)     → treated as (1, 4)
a + d                     # RuntimeError — 3 and 4 don't align
```

Broadcasting is what makes vectorised code readable. It is also what turns a shape bug
into a silent wrong answer instead of a crash. Two habits are worth building:

- **Assert shapes at boundaries.** A one-line `assert logits.shape == targets.shape` at
  the top of a loss function costs nothing and catches the whole class.
- **Be explicit about reductions.** `x.sum(dim=1)` collapses a dimension; `keepdim=True`
  preserves it as 1. Guessing which one a downstream op wants is how the trailing-1 bug
  gets in.

For anything more involved than an add, `einops`-style named rearrangement or
`torch.einsum` makes the intent legible in a way that a chain of `permute`/`reshape` does
not.

## Views, copies, and contiguity

Many operations return a **view** — a new tensor sharing the same storage. `transpose`,
`permute`, slicing, and `view` are all views. `clone`, and most arithmetic, allocate.

This matters twice. First, an in-place write through a view mutates the original:

```python
y = x[0]        # view
y += 1          # x[0] has also changed
```

Second, a view can be non-contiguous in memory, and `view()` requires contiguity, so a
transpose followed by a reshape raises. `reshape()` handles it by copying when it must,
which is why it's the safer default; call `.contiguous()` explicitly when you want the
copy to be visible in the code.

In-place operations (the trailing-underscore family, `add_`, `relu_`) save memory and
are a common source of autograd errors — see the next page.

## dtype: precision is a tradeoff, not a detail

| dtype | Where it's used | Tradeoff |
| --- | --- | --- |
| `float32` | Default; master weights | Safe baseline, 4 bytes/value |
| `bfloat16` | Modern mixed-precision training | Same exponent range as fp32, fewer mantissa bits — rarely overflows |
| `float16` | Older GPUs, inference | Half the range; needs loss scaling to avoid underflow in gradients |
| `int64` | Class labels, indices | What `CrossEntropyLoss` and embedding lookups require |
| `bool` | Masks | Prefer over `uint8`, which is deprecated for masking |

Integer division and dtype promotion follow rules worth knowing rather than assuming:
dividing two integer tensors gives a float, and mixing dtypes promotes to the wider one.
A `float64` array arriving from NumPy will silently promote your whole computation to
double precision and halve throughput — `torch.from_numpy` preserves dtype, so cast at
the boundary.

## Devices, and the transfer you didn't notice

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device)
x = x.to(device, non_blocking=True)
```

Two things about `.to()` are easy to miss. It is **in-place for modules** (`model.to()`
mutates and returns the module) but **not for tensors** (`x.to()` returns a new tensor;
`x` is unchanged if you don't assign). And host↔device transfers are slow relative to
compute, so the goal is to move data once, in large batches, asynchronously.

The performance mistake that follows is **accidental synchronisation**. GPU work is
queued asynchronously; anything that needs a value back on the host has to wait for the
queue to drain. `.item()`, `.cpu()`, `.numpy()`, `print(tensor)`, and a Python `if`
branching on a tensor value are all synchronisation points. One `loss.item()` per step is
fine. One per batch element inside an inner loop turns an asynchronous pipeline into a
synchronous one.

The corollary for timing: measuring GPU code with `time.time()` without a
`torch.cuda.synchronize()` first measures how fast you queued the work, not how long it
took. Use the [PyTorch profiler](https://pytorch.org/docs/stable/profiler.html) rather
than hand-rolled timers.

Apple Silicon (`mps`) and other backends follow the same model with different coverage —
an unimplemented op falls back to CPU, silently, with a transfer at each boundary.

## What to take away

- Shape, dtype, and device are the three things to check first when anything fails.
- Broadcasting turns shape bugs into silently wrong maths. Assert shapes where tensors meet, especially at the loss.
- `reshape` copies when it must, `view` refuses; transposed tensors are non-contiguous.
- Views share storage — in-place writes propagate to the original.
- Labels for `CrossEntropyLoss` are `int64` class indices, not one-hot floats.
- Move data to the device once, in batches; `.item()` inside a hot loop serialises the GPU.

## References

- [PyTorch — Tensors](https://pytorch.org/docs/stable/tensors.html) · [broadcasting semantics](https://pytorch.org/docs/stable/notes/broadcasting.html) · [type promotion](https://pytorch.org/docs/stable/generated/torch.result_type.html)
- [PyTorch — CUDA semantics](https://pytorch.org/docs/stable/notes/cuda.html), including asynchronous execution and pinned memory
- [PyTorch — `torch.profiler`](https://pytorch.org/docs/stable/profiler.html) — the correct way to time device code
- [`einops`](https://einops.rocks/) — named tensor rearrangement, if `permute` chains have become unreadable
