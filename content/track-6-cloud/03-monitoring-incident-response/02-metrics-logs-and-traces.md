---
title: "Metrics, Logs & Traces"
description: "What each signal answers, why cardinality drives the bill, structured logging, distributed tracing, and OpenTelemetry as the common instrumentation layer."
track: 6
chapter: 3
page: 2
readMinutes: 5
---

## Three signals, three different questions

| | Metrics | Logs | Traces |
| --- | --- | --- | --- |
| Shape | Numbers aggregated over time | Discrete timestamped records | A causally linked tree of spans across services |
| Answers | *Is something wrong, and since when?* | *What exactly happened to this request?* | *Where did the time go, and which service failed?* |
| Cost driver | Number of distinct label combinations | Volume of text | Volume, mitigated by sampling |
| Bad at | Explaining a single request | Aggregation and trend-spotting | Being cheap at 100% sampling |

The workflow they're designed for runs left to right. A metric alert tells you
something is wrong. A trace tells you which of your eight services is responsible and
which span consumed the latency. A log line in that span tells you what the code
actually did. Systems that only have one of the three force you to do the other two
jobs badly with it — which is what "grep the logs and hope" is.

## Metrics: the cardinality trap

A metric is a time series identified by a name plus a set of labels, and **every
distinct combination of label values is a separate stored series**. That multiplication
is where monitoring bills and outages both come from:

```text
http_requests_total{method, status, endpoint}
  5 methods x 8 statuses x 40 endpoints  =  1,600 series     fine
  ...plus user_id (200,000 users)        =  320,000,000      not fine
```

The rule is blunt: **never put an unbounded value in a label.** User ids, request ids,
email addresses, session tokens, full URLs with query strings, error messages. Those
belong in logs and traces, which are built for high-cardinality data. Labels are for
values from a small, closed set that you would want to *group by*.

The metric types are worth using correctly, because the query semantics depend on it:

- **Counter** — monotonically increasing. Query the rate, not the value.
- **Gauge** — goes up and down. Queue depth, memory in use, active connections.
- **Histogram** — bucketed observations, from which percentiles are computed server-side. This is what latency should be.

Latency deserves a specific warning: **you cannot average percentiles.** The mean of
each instance's p99 is not the fleet's p99 and can be off by a lot. Histograms are
mergeable — the buckets add — which is exactly why they exist. And a p50 is a comfort
metric; the interesting question is almost always p99 or p99.9, because that's the
tail your heaviest users live in.

For choosing *what* to measure, two mnemonics cover most of it: **RED** for
request-driven services (Rate, Errors, Duration) and **USE** for resources
(Utilization, Saturation, Errors). Together they answer "are we serving users" and "is
anything running out."

## Logs: structure them or don't bother

An unstructured log line is a string that a human can read and a machine can only
regex. A structured one is an object:

```json
{"ts":"2026-03-04T10:12:04Z","level":"warn","msg":"payment retry",
 "service":"checkout","trace_id":"4bf92f...","order_id":"a91f","attempt":2,
 "provider":"stripe","latency_ms":2140}
```

Now "show me every retry for orders over $500 in the last hour, grouped by provider" is
a query rather than an afternoon. The specific fields that pay for themselves:

- **`trace_id` and `span_id`** on every line — the join key between logs and traces, and the single highest-value field in the record.
- **Stable identifiers** — service, version, environment, region — added once by the logging setup, not by each call site.
- **Errors with type and stack**, as fields rather than a formatted blob.

What not to log: credentials, tokens, full request bodies, and personal data. Logs are
replicated, retained, and readable by more people than the database is; the audit and
retention obligations that attach to personal data attach to log storage too, which is
easy to forget when the field arrived as a debugging convenience.

Cost control is mostly sampling and levels. Log every error and warning; sample
successful-request logs at 1–10%; make debug level runtime-togglable per service so
turning it on during an incident doesn't require a deploy. Ingest-based pricing means an
over-chatty service can outspend the infrastructure it runs on.

## Traces: what metrics structurally cannot tell you

A **span** is one unit of work with a start, an end, attributes and a parent. A
**trace** is the tree of spans belonging to one request. The tree is assembled because
each service passes the trace context to the next in the
[W3C `traceparent` header](https://www.w3.org/TR/trace-context/), a standard that
matters precisely because it lets services instrumented with different tools stay in
one trace.

Tracing answers the questions that aggregate metrics erase. Not "is p99 latency 2
seconds" but "in *this* slow request, the auth service took 1.8 of those seconds, and
it was the third of five sequential calls that could have been parallel." It is also
how you find the N+1 query pattern that no dashboard shows: 340 identical child spans
under one parent is instantly visible in a trace view and invisible in a latency
histogram.

**Sampling** is the practical constraint. Head-based sampling decides at the start of
the request (cheap, simple, and it discards the rare slow request you most wanted).
Tail-based sampling buffers the trace and decides after seeing the outcome, keeping
everything that errored or exceeded a latency threshold (far more useful, and needs a
collector holding spans in memory). If you can run tail sampling, do; if not, sample
heads at a low rate and always keep errors.

**Exemplars** close the loop between signals: a histogram bucket carries a sample
trace id, so clicking a latency spike on a dashboard opens a trace that actually
produced it. This is the feature that turns three separate tools into one workflow.

## OpenTelemetry

[OpenTelemetry](https://opentelemetry.io/docs/) is the vendor-neutral standard for
producing all three signals — an API, SDKs per language, a wire protocol (OTLP), and a
**collector** that receives, processes and exports telemetry to whatever backend you
use. It is a CNCF project and the de facto default for new instrumentation.

The argument for it is not technical elegance, it's leverage. Instrumentation lives in
your application code and is expensive to redo; a backend is a vendor contract you may
want to renegotiate. Instrumenting once against OTel and pointing the collector
somewhere else is a config change. Instrumenting against a vendor SDK is a migration
project.

Two practical notes. **Auto-instrumentation** gets you HTTP servers, clients, database
drivers and messaging libraries for free — start there, and add manual spans only for
business operations worth naming. And **semantic conventions** (`http.request.method`,
`db.system`, `service.name`) are what let dashboards and queries work across services
without per-service special-casing; inventing your own attribute names throws that away.

## What to take away

- Metrics detect, traces localise, logs explain. A system missing one makes the other two do that job badly.
- Cardinality is the cost model for metrics — no user ids, request ids or URLs in labels.
- Use histograms for latency, and never average percentiles across instances.
- Structured logs with `trace_id` on every line are what make logs joinable to everything else.
- Tail-based sampling keeps the traces you actually want; head-based sampling discards them by definition.
- Instrument with OpenTelemetry and its semantic conventions so the backend stays a replaceable decision.

## References

- [OpenTelemetry — Documentation](https://opentelemetry.io/docs/) and [Semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C — Trace Context](https://www.w3.org/TR/trace-context/)
- [Prometheus — Metric types](https://prometheus.io/docs/concepts/metric_types/) and [Naming and labels best practices](https://prometheus.io/docs/practices/naming/)
- [Google SRE — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- Brendan Gregg, [*The USE Method*](https://www.brendangregg.com/usemethod.html) · [Grafana — The RED method](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/)
- Sigelman et al., [*Dapper, a Large-Scale Distributed Systems Tracing Infrastructure*](https://research.google/pubs/pub36356/) (2010) — the paper distributed tracing descends from
