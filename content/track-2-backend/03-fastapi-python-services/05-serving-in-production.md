---
title: "Serving in Production"
description: "ASGI servers, worker counts, timeouts, and putting a model behind an endpoint that stays up."
track: 2
chapter: 3
page: 5
readMinutes: 4
---

:::info[Prerequisites]
**Dependencies & Structure** — worker processes are what turn `lifespan` into a memory calculation.
:::

## What actually serves the requests

FastAPI is a framework, not a server. Three pieces, and confusing them makes the
performance conversation impossible:

- **FastAPI/Starlette** — your app, speaking [ASGI](https://asgi.readthedocs.io/en/latest/specs/main.html).
- **Uvicorn** — the ASGI server: sockets, HTTP parsing, the event loop.
- **A process manager** — Gunicorn with `UvicornWorker`, or `uvicorn --workers`, or your platform's scheduler if it runs one container per process.

`uvicorn main:app --reload` is a development command. `--reload` watches the
filesystem and restarts, which is wasteful and unsafe in production.

## Worker count and the memory it costs

Each worker is a separate process with its own interpreter, its own event loop, and
its own copy of everything `lifespan` created. Processes are how a Python service
uses more than one core, because the GIL prevents threads from doing it.

The common starting point is `2 × cores + 1`, inherited from Gunicorn's docs for
sync workers. **For a service holding a model, ignore it and compute from memory
instead:**

```text
workers ≈ min(cores, (available_memory - headroom) / memory_per_worker)
```

A 2 GB model with four workers is 8 GB before a single request arrives. Getting this
wrong produces an OOM kill under load, which reads as a mysterious restart rather
than a capacity mistake.

Two ways out when the model is large: put it behind a **dedicated inference service**
shared by all API workers, or run **one worker per container** and scale containers —
which also makes the memory ceiling explicit to the orchestrator rather than hidden
inside one host.

## Timeouts, at every hop

An unbounded wait is a leaked worker. Every layer needs a limit, and they must be
ordered so the inner one fires first:

```text
client timeout  >  proxy/LB timeout  >  server timeout  >  outbound call timeout
```

If an outbound HTTP call can take longer than your own server timeout, the request is
killed while holding a connection, and the upstream keeps working on an answer
nobody will read.

```python
app.state.http = httpx.AsyncClient(
    timeout=httpx.Timeout(connect=2.0, read=5.0, write=5.0, pool=1.0),
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
)
```

Set the connection-pool limit too. Without one, a slow upstream turns into unbounded
concurrent connections and the failure spreads outward.

## Health checks that mean something

```python
@app.get("/healthz")           # liveness — is the process alive?
def healthz(): return {"status": "ok"}

@app.get("/readyz")            # readiness — can it serve traffic?
async def readyz(db: DbSession):
    await db.execute(text("select 1"))
    return {"status": "ready"}
```

The distinction matters operationally. **Liveness** failing means restart me;
**readiness** failing means stop sending traffic, but don't restart — the process may
just be waiting on a dependency, and restarting it makes recovery slower.

For a service that loads a model at startup, readiness must not pass until the model
is loaded. Otherwise the orchestrator routes traffic to a process that will `500`
every request for the next ninety seconds.

Keep liveness free of dependency checks. A liveness probe that queries the database
turns a database blip into a rolling restart of every instance you have.

## Observability worth having on day one

- **Structured JSON logs** with a request id, propagated from an incoming `X-Request-Id` header or generated. Correlate it with `instance` in your problem details (Chapter 1) and a support ticket becomes one query.
- **Never log request bodies at info level.** That's how tokens, PII and prompts end up in a log aggregator with a broader access list than the database.
- **Metrics**: request count, latency histogram, and error rate by route and status. For inference, add queue wait and inference duration separately — they scale differently and averaging them hides which one is failing.
- **`/metrics`** via [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator) or OpenTelemetry's ASGI instrumentation if you already have a collector.

## Deployment shape

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Points that matter more than the file: pin dependencies with a lockfile (`uv.lock`,
`poetry.lock`, or `pip-compile` output) so a rebuild produces the same image; run as a
non-root user; and if the image bakes in model weights, expect a large image and a
slow cold start — mounting weights or fetching them at startup trades image size for
startup time, and which you want depends on how often you scale out.

## What to take away

- The framework, the ASGI server and the process manager are three different things; performance questions are almost always about the last two.
- Worker count is a memory decision when a model is loaded, not a CPU formula.
- Timeouts must exist at every hop and get shorter as you go inward; the pool limit matters as much as the timeout.
- Separate liveness from readiness, and don't let readiness pass before the model is loaded.

## References

- [FastAPI — Deployment](https://fastapi.tiangolo.com/deployment/concepts/) and [Server workers](https://fastapi.tiangolo.com/deployment/server-workers/)
- [Uvicorn — Deployment](https://www.uvicorn.org/deployment/)
- [Gunicorn — Design: how many workers?](https://docs.gunicorn.org/en/stable/design.html#how-many-workers)
- [HTTPX — Timeouts](https://www.python-httpx.org/advanced/timeouts/) and [connection pooling](https://www.python-httpx.org/advanced/resource-limits/)
- [Kubernetes — Liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
