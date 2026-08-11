---
title: "Monitoring & Incident Response"
description: "Observability tooling, alerting, and what actually happens during on-call."
track: 6
chapter: 22
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Containers & Deployment** for where the signals come from and what a rollback looks
like, and **Event-Driven Systems** for the asynchronous failure modes — consumer lag
is the running example of a metric that is also a symptom.
:::

## Why this chapter exists

Every previous chapter in this handbook describes building something. This one is about
the part that comes after: the system is live, it will fail, and the question is
whether you find out from a dashboard, from a customer, or from a journalist.

The distinction usually drawn is **monitoring** versus **observability**, and it's more
useful than it sounds. Monitoring answers questions you thought of in advance — is CPU
high, is the error rate above 1%, is the queue backing up. Observability is the
property of a system that lets you answer questions you *didn't* think of in advance:
why are requests from one customer, on one API version, hitting a code path that only
triggers when a cache misses? You can't build a dashboard for that ahead of time,
because nobody knew to ask.

Distributed systems make the second capability necessary rather than luxurious. When a
request touches eight services, "the site is slow" has eight possible answers and the
useful telemetry is whatever lets you eliminate seven of them quickly. The failure mode
of under-instrumented systems isn't that they break more; it's that each break takes
four hours instead of fifteen minutes.

## Two mistakes this chapter is arranged around

**Instrumenting everything.** Telemetry has a cost — storage, ingest bills, cardinality
limits, and the attention of whoever has to look at it. A dashboard with sixty graphs
is not more observable than one with six; it's a place where an anomaly can hide.
Collect what answers a question you would actually ask at 3 a.m.

**Alerting on causes instead of symptoms.** A page for "CPU above 80%" fires when
nothing is wrong and stays silent when everything is. A page for "checkout error rate
exceeds the error budget burn rate" fires exactly when users are being harmed. The
first kind trains people to ignore alerts, which is a slow, quiet, and completely
predictable way of losing the ability to respond to the real one.

## What's in here

| Page | What it covers |
| --- | --- |
| Metrics, Logs & Traces | What each signal is good at, cardinality and cost, structured logging, distributed tracing, and OpenTelemetry as the common layer |
| SLOs & Alerting | Service level indicators and objectives, error budgets, burn-rate alerting, and what belongs on a page versus a dashboard |
| Incident Response | Roles, mitigating before diagnosing, communication, and the postmortem that decides whether it happens again |

## Where this connects

**Deploying Safely** in the previous chapter and this one form a loop: deploys are the
most common cause of incidents, and rollback is the most common mitigation, so the
quality of your release process and the quality of your incident response are the same
question asked twice. **Delivery Guarantees in Practice** supplies the async half —
consumer lag, dead-letter volume and offset staleness are the signals that a queue-shaped
outage is happening without a single HTTP error.

This is the last chapter of the handbook, and it's the one that closes the loop on all
five tracks before it. A React app, a Spring service, a Postgres schema, a RAG pipeline
and a fine-tuned model all end up as processes that run somewhere, emit signals, and
occasionally wake someone up. What separates a system people trust from one they don't
is mostly what happens in the twenty minutes after it breaks.

## References

- [Google — *Site Reliability Engineering*](https://sre.google/sre-book/table-of-contents/), especially [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) and [Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [Google — *The Site Reliability Workbook*](https://sre.google/workbook/table-of-contents/), especially [Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [OpenTelemetry — Documentation](https://opentelemetry.io/docs/)
- [PagerDuty — Incident Response documentation](https://response.pagerduty.com/)
