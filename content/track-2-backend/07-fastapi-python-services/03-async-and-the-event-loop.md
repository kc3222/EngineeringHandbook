---
title: "Async & the Event Loop"
description: "def vs async def, and the one blocking call that stalls every request in the process."
track: 2
chapter: 7
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Pydantic & Typed Models** — the handlers this page is about.
:::

## One thread, one loop

An ASGI application runs handlers on a single **event loop** in a single thread. It
achieves concurrency by switching between tasks at `await` points — not by running
them in parallel.

When request A hits an `await`, the loop is free to serve B and C, resuming A when
its I/O completes. When A instead makes a *blocking* call, the loop is stuck inside
it: B, C and D sit doing nothing until A returns.

Everything about async in FastAPI follows from that. Concurrency comes from
yielding at `await`. Code that doesn't yield doesn't just slow itself down — it stops
*every other request in the process*, including the health check.

## `def` and `async def` do different things

FastAPI accepts both, and the choice changes where the code runs:

| You write | FastAPI runs it | Use for |
| --- | --- | --- |
| `async def` | On the event loop | Handlers whose waiting is all `await`ed |
| `def` | In a thread pool, off the loop | Blocking code — sync DB drivers, `requests`, file I/O, CPU work |

That second row is the important one, and it's the opposite of most people's
instinct. **A plain `def` handler is the safe choice for blocking code**, because
FastAPI moves it off the loop for you. The dangerous combination is `async def`
containing a blocking call — that runs the blocking code *on* the loop, with nothing
to catch it.

```python
# Fine — blocking code, but FastAPI runs it in a threadpool
@app.get("/report")
def report():
    return sync_db.query("select …")        # blocks a worker thread, not the loop

# Fine — async all the way down
@app.get("/orders/{id}")
async def get_order(id: UUID):
    return await async_db.fetch_one(…)

# Broken — blocking call on the event loop
@app.get("/upstream")
async def upstream():
    return requests.get("https://api.example.com/x").json()   # ← stalls everything
```

The third case is the single most common FastAPI performance bug, and its symptom is
misleading: latency goes up for *unrelated* endpoints, so the investigation starts in
the wrong place.

The thread pool is finite (Starlette's default is 40 tokens via AnyIO). Sync handlers
are safe but not unbounded — 100 concurrent slow sync requests will queue.

### Things that block and don't look like it

- `requests`, `urllib`, most non-`async` SDK clients — use `httpx.AsyncClient` instead
- Sync database drivers: `psycopg2`, SQLAlchemy's sync engine, `pymongo`
- `time.sleep` — the async form is `await asyncio.sleep`
- `open()` / `read()` on large files
- **Model inference**: `model.predict(x)`, `pipeline(text)`, a tokenizer pass
- CPU-bound work of any kind — JSON parsing of a huge payload, image resizing, cryptography

## The inference case

This is where Python API services most often fall over, and it deserves its own
treatment because the usual advice doesn't apply.

A forward pass is **CPU/GPU-bound**, so no amount of async helps — there's nothing to
await. Worse, the GIL means a threadpool doesn't give you real parallelism for
Python-level compute, though it does release during many NumPy/PyTorch native
operations.

```python
@app.post("/classify")
def classify(req: ClassifyRequest) -> ClassifyResponse:   # plain def, on purpose
    return ClassifyResponse(label=model.predict(req.text))
```

Using `def` keeps the loop free so other requests still get served. Beyond that, the
options are architectural rather than syntactic:

| Approach | What it buys | Cost |
| --- | --- | --- |
| Plain `def` handler | Loop stays responsive | One request still occupies a thread for its whole duration |
| Multiple worker **processes** | Real parallelism past the GIL | Model loaded once per process — multiply the memory |
| Dedicated inference server (TorchServe, Triton, vLLM) | Batching, GPU scheduling, independent scaling | Another service to operate |
| Queue + worker pool | Absorbs bursts; API stays fast | Now asynchronous from the client's point of view |

The dividing line: if a request takes tens of milliseconds, a `def` handler and more
processes is enough. If it takes seconds, or if it needs a GPU, the model belongs
behind its own service or a queue — not inline in the request path.

## Async correctness, briefly

- **Never fire and forget.** `asyncio.create_task(...)` without keeping a reference lets the garbage collector cancel the task mid-flight. Keep a reference, or use `BackgroundTasks` / a real queue.
- **Set timeouts on every outbound call.** An `await` with no timeout is a request that never completes and a connection never returned.
- **Run independent awaits concurrently.** Three sequential `await`s of 100ms each cost 300ms; `asyncio.gather` makes it 100ms. This is most of the practical win from async.
- **Share one client.** An `httpx.AsyncClient` per request throws away connection pooling and TLS session reuse. Create it once at startup — the next page covers where.

## What to take away

- Concurrency comes from yielding at `await`. Code that never yields blocks every request in the process, not just its own.
- Use `async def` only when everything inside it is awaitable; otherwise plain `def` is the safe default, because FastAPI moves it off the loop.
- Latency appearing on *unrelated* endpoints is the signature of a blocking call on the event loop.
- Inference is CPU/GPU-bound, so async doesn't help. Scale it with processes, a dedicated serving stack, or a queue.

## References

- [FastAPI — Concurrency and async/await](https://fastapi.tiangolo.com/async/)
- [Starlette — Threadpool for sync endpoints](https://www.starlette.io/threadpool/)
- [Python — `asyncio` developer guidance](https://docs.python.org/3/library/asyncio-dev.html) (task references, blocking code)
- [HTTPX — Async support](https://www.python-httpx.org/async/)
