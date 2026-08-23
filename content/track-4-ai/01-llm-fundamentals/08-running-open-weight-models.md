---
title: "Running Open-Weight Models"
description: "Self-hosted inference — the VRAM arithmetic, what quantization costs, which serving runtime, and when renting a GPU beats paying per token."
track: 4
chapter: 1
page: 8
readMinutes: 5
---

:::info[Prerequisites]
**LLM APIs** — the request shape and the failure modes, which mostly carry over. **Tokens
& Context Windows** supplies the arithmetic this page extends to memory.
:::

## Two ways to get a model

A hosted API sells you tokens. An open-weight model sells you nothing — the weights are
a file you download, and everything else is your problem: a GPU, a serving process, a
version to pin, capacity for the peak. The interface ends up looking nearly identical
(most runtimes expose an OpenAI-compatible endpoint), which hides how different the
engineering underneath is.

| | Hosted API | Self-hosted weights |
| --- | --- | --- |
| Bills by | Token | Hour of GPU, used or not |
| Scales to zero | Yes | Only if you stop the machine |
| Data leaves your boundary | Yes, under a vendor agreement | No |
| Model version | Vendor's lifecycle; deprecations happen | Frozen until you change the file |
| Capability ceiling | Frontier | Roughly a generation behind, and narrowing |
| Failure mode you own | Rate limits | Capacity, OOM, cold start |

The two are not exclusive and shouldn't be treated that way. Route the cheap, high-volume,
schema-shaped work — classification, extraction, embedding, reranking — to a model you
host, and the hard synthesis to a frontier API. Keep both behind one internal interface
and the routing stays a config decision instead of a rewrite.

## The arithmetic that decides whether it fits

Everything about self-hosting starts with a single number: does the model plus its working
memory fit in the GPU's VRAM. Three things occupy it.

**Weights.** Parameter count × bytes per parameter.

| Precision | Bytes/param | 8B model | 14B | 70B |
| --- | --- | --- | --- | --- |
| BF16/FP16 | 2 | ~16 GB | ~28 GB | ~140 GB |
| FP8 / INT8 | 1 | ~8 GB | ~14 GB | ~70 GB |
| 4-bit | ~0.55 | ~4.5 GB | ~9 GB | ~40 GB |

**KV cache.** Every token in the context stores a key and a value at each layer, and this
grows linearly with sequence length *and* with concurrent requests:

```text
bytes = 2 × layers × kv_heads × head_dim × dtype_bytes × tokens × concurrency
```

For an 8B model with 32 layers and grouped-query attention (8 KV heads, head dim 128) at
FP16, that's ~128 KB per token — around **1 GB at 8k tokens**, per concurrent request. On
a 20 GB card holding a 9 GB quantized 14B, long contexts at any real concurrency are what
runs you out of memory, not the weights.

**Overhead.** A gigabyte or two for the CUDA context, activations, and the runtime itself.

The practical consequence: size the card for weights + peak KV + overhead, with headroom.
A configuration that loads fine and serves single requests can OOM the first time two long
conversations overlap — a failure that only appears under load, which is the worst kind to
discover in production.

## What quantization actually costs

Quantization stores weights at lower precision. Two families matter:

- **GGUF** — the llama.cpp format, and what Ollama ships. `Q4_K_M` and friends are k-quants: mixed precision, more bits for the layers that are sensitive to losing them. Runs on CPU, GPU, or split across both, which is what makes it the laptop-friendly option.
- **GPU weight-only quantization** — GPTQ and AWQ compress to 4 bits with a calibration pass; AWQ's premise is that a small fraction of weights are salient and protecting those preserves most of the quality. FP8 is increasingly the default on hardware that supports it natively, being close to lossless and fast.

Two rules that hold up in practice. First, **for a fixed VRAM budget, a bigger model at
4-bit generally beats a smaller model at 16-bit** — 14B at Q4 in 9 GB is usually a better
tool than 8B at FP16 in 16 GB. Second, **quantization damage is not uniform across tasks.**
Open-ended chat degrades gracefully; the things that need exactness degrade first —
producing valid JSON, emitting a well-formed tool call, long-chain arithmetic, code. If
your pipeline depends on a structured output, benchmark the quantized model on *that*
output rather than on a general leaderboard, because the leaderboard measures the part
that survived.

## Choosing a serving runtime

| Runtime | Shape | Use when |
| --- | --- | --- |
| llama.cpp / Ollama | Single process, GGUF, CPU or GPU | Local development, one user at a time, CPU-only machines |
| vLLM | Throughput-oriented GPU server | Real concurrency; the default production answer |
| TGI | Hugging Face's server | Same territory as vLLM, tight HF ecosystem fit |
| SGLang | Throughput plus structured/multi-turn workloads | Heavy constrained decoding or shared-prefix traffic |

The reason a production runtime exists at all is a hardware fact: single-stream decoding is
**memory-bandwidth-bound**, not compute-bound. Generating one token reads the entire weight
file from VRAM regardless of how many requests you're serving, so serving eight requests
concurrently costs barely more than serving one. That's what **continuous batching** exploits
— new requests join the running batch at the next step instead of waiting for it to drain —
and it's why a naive one-request-at-a-time server can leave an order of magnitude of
throughput on the table. **PagedAttention** is the companion trick: allocate KV cache in
fixed-size blocks like virtual-memory pages, so memory isn't reserved for a maximum-length
generation that never happens.

Ollama is genuinely the right choice for development — one command, model management
included — and genuinely the wrong choice for a service with concurrent users. Moving
between them costs little if you kept the endpoint behind a base-URL environment variable
from the start.

## Cost, honestly

A hosted API bills per token, so an idle system bills nothing. A GPU bills by the hour
whether it's serving or not, which inverts the entire economic model: **your cost per token
is set by utilisation, not by the model.**

The break-even is a straightforward comparison — hourly GPU rate ÷ tokens you'll actually
generate in that hour, against the API's per-token price — and it usually lands somewhere
uncomfortable for hobby-scale traffic. Steady, high-volume, predictable load favours
self-hosting. Spiky or low-volume load does not; a GPU idling at 5% utilisation is the most
expensive way to run a small model.

Three operational details worth deciding up front, because they're painful to retrofit:

- **Keep the weights on persistent storage**, mounted at a stable path, not on the container's ephemeral disk. Otherwise every restart re-downloads several gigabytes, and "start the machine" becomes a ten-minute operation instead of a one-minute one.
- **Cold start is a real latency tier.** Loading weights into VRAM takes tens of seconds even from local disk. Scale-to-zero and interactive latency are in direct tension; on-demand start is fine for a demo or a batch job and not fine for a user-facing request path.
- **Stop machines you aren't using.** The single most common self-hosting cost surprise is a GPU left running over a weekend.

## When self-hosting is the right call

It's a strong answer when the driver is one of these:

- **Data boundary.** Regulatory, contractual, or air-gapped constraints where sending text to a third party is the blocker — this is the reason that isn't really about cost, and the one that most often decides it.
- **Custom weights.** You fine-tuned a model, and there's nothing to call.
- **Predictable high volume** on a task a mid-size open model handles well.
- **Version stability.** Nobody deprecates a file on your disk.

It's usually the wrong call when the task needs frontier reasoning, when traffic is spiky
or small, or when the team doesn't want to own GPU capacity as an operational concern. The
honest framing is that self-hosting trades a variable bill and a vendor dependency for a
fixed bill and an infrastructure dependency. That's a good trade at scale and under
constraint, and a bad one before either.

## What to take away

- Weights + KV cache + overhead must fit in VRAM. KV cache scales with context *and* concurrency, and it's what usually causes the OOM.
- For a fixed VRAM budget, prefer a larger model at 4-bit over a smaller one at 16-bit.
- Quantization hits structured output — tool calls, JSON, code — harder than open-ended chat. Benchmark the task you actually run.
- Ollama for development, vLLM-class runtimes for concurrency; continuous batching is the difference, because decoding is bandwidth-bound.
- Keep the endpoint behind a base-URL variable so hosted and self-hosted stay one code path.
- GPUs bill by the hour, so utilisation sets your cost per token. Persist the weights, expect a cold-start tier, and stop idle machines.

## References

- Kwon et al., [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180) (2023) — vLLM's continuous batching and paged KV cache
- Lin et al., [*AWQ: Activation-aware Weight Quantization*](https://arxiv.org/abs/2306.00978) (2023) · Frantar et al., [*GPTQ*](https://arxiv.org/abs/2210.17323) (2022)
- [vLLM documentation](https://docs.vllm.ai/en/latest/) · [Hugging Face — Text Generation Inference](https://huggingface.co/docs/text-generation-inference/index) · [SGLang documentation](https://docs.sglang.ai/)
- [llama.cpp](https://github.com/ggml-org/llama.cpp) and the [GGUF format specification](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md) · [Hugging Face — GGUF on the Hub](https://huggingface.co/docs/hub/gguf)
- [Ollama — API reference](https://github.com/ollama/ollama/blob/main/docs/api.md) · [FAQ, including memory and context settings](https://ollama.readthedocs.io/en/faq/)
