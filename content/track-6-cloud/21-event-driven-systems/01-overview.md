---
title: "Event-Driven Systems (Kafka)"
description: "Producers, consumers, and triggering async workflows like notifications and background jobs."
track: 6
chapter: 21
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**REST API Design** for the synchronous baseline this chapter is contrasted against,
and **Relational Schema Design** for the transaction boundary the outbox pattern
works around. **Containers & Deployment** covers where consumers actually run.
:::

## Why this chapter exists

A user places an order. The order has to be persisted, a payment captured, a
confirmation email sent, inventory decremented, a receipt generated, a recommendation
model updated, and an analytics event recorded. Written synchronously, the HTTP handler
calls seven services in sequence, takes as long as the slowest one, fails if any one of
them is down, and grows a new call every time the business adds a step.

The event-driven alternative inverts the dependency. The order service records the fact
that an order was placed and returns. Everything else reacts to that fact
independently. The handler is fast because it does one thing; the email service can be
down for ten minutes without anyone losing an order; and adding the eighth consumer
requires no change to the order service at all.

That inversion is genuinely valuable and genuinely expensive, and it's worth naming the
price up front. You trade a stack trace for a distributed trace. You trade "the
request failed" for "the request succeeded and something downstream will fail in four
seconds, elsewhere, silently." You trade transactional consistency for eventual
consistency, which means somebody will read the order page before the confirmation
email exists and file a bug about it. Async systems are harder to reason about, harder
to debug, and harder to test. They are worth it when the coupling they remove costs
more than the complexity they add — and not otherwise.

## Why a log, and not just a queue

Traditional message queues (RabbitMQ, SQS) deliver a message to a consumer and then
delete it. That's the right model for distributing work: each job goes to exactly one
worker, acknowledgement removes it, failures redeliver.

Kafka is a different primitive: a **durable, ordered, replayable log**. Records are
appended, retained for a configured period regardless of who has read them, and each
consumer tracks its own position. That difference produces the properties the rest of
this chapter is built on:

- **Many independent consumers** read the same records at their own pace, without the producer knowing they exist.
- **Replay** is normal, not exceptional. A new service can read three months of history to build its state; a consumer with a bug can be fixed and rewound.
- **Ordering is guaranteed per key**, which is what makes a stream of changes to one entity meaningful rather than a bag of updates.
- **Reading is not destructive**, so a consumer's failure never loses data for anyone else.

The cost is that Kafka does not do the thing queues are best at — per-message
acknowledgement, easy dead-lettering, and unordered work distribution across a
fluctuating worker pool. Neither model is the upgrade of the other.

## What's in here

| Page | What it covers |
| --- | --- |
| Topics, Partitions & the Log | The log abstraction, partitions as the unit of ordering and parallelism, replication, retention and compaction, consumer groups |
| Delivery Guarantees in Practice | At-most/at-least/exactly-once, producer and consumer settings that decide which you get, idempotent consumers, lag, and dead letters |
| Designing Event-Driven Workflows | Events versus commands, the three event styles, the dual-write problem and the outbox, schema evolution, sagas, and when not to use Kafka |

## Where this connects

**Object Storage & Microservices** in Track 3 raised the dual-write problem — a row
and an object that must both exist — and this chapter gives it its general solution.
**Authentication & Authorization** in Track 2 is worth rereading in this context: an
event carries no user session, so authorization has to be decided by the producer and
encoded in the event or re-derived by the consumer.

**Monitoring & Incident Response**, next, is where consumer lag stops being a metric
and starts being a page.

## References

- [Apache Kafka — Documentation](https://kafka.apache.org/documentation/) and [Design](https://kafka.apache.org/documentation/#design)
- Jay Kreps, [*The Log: What every software engineer should know about real-time data's unifying abstraction*](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) (2013)
- Martin Fowler, [*What do you mean by "Event-Driven"?*](https://martinfowler.com/articles/201701-event-driven.html) (2017)
- Kleppmann, *Designing Data-Intensive Applications*, ch. 11 — [publisher page](https://dataintensive.net/)
- [Amazon SQS — Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) · [RabbitMQ — Documentation](https://www.rabbitmq.com/docs) — the queue side of the comparison
