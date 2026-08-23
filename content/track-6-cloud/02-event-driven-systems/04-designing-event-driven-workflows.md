---
title: "Designing Event-Driven Workflows"
description: "Events versus commands, the three event styles, the dual-write problem and the outbox, schema evolution, sagas, and when a queue is the better answer."
track: 6
chapter: 2
page: 4
readMinutes: 5
---

## Events are facts; commands are requests

The distinction is not pedantry — it decides who owns the logic.

A **command** says *do this*: `SendConfirmationEmail`. It names a recipient, expects it
to happen, and fails if nobody handles it. The sender knows what should occur, which
means the sender has to be changed when the answer changes.

An **event** says *this happened*: `OrderPlaced`. It's a statement of past fact,
addressed to nobody in particular, and true whether or not anyone listens. Consumers
decide what it means for them.

Events are what make the coupling reduction real. If the order service publishes
`SendConfirmationEmail`, it still knows an email should be sent, and adding an SMS
means editing the order service. If it publishes `OrderPlaced`, adding SMS means
deploying a new consumer and touching nothing upstream. Name events in the past tense
and resist the temptation to sneak an instruction into the payload.

Commands aren't wrong — they're the right model for work distribution — but they belong
in queues more often than logs, which is where this page ends up.

## Three styles of event, and how much to put in one

| Style | Payload | Consumer then | Tradeoff |
| --- | --- | --- | --- |
| **Notification** | Just an id and a type | Calls back to the producer for details | Tiny events, but reintroduces synchronous coupling and load on the producer |
| **Event-carrying state transfer** | The relevant state at the time of the event | Works entirely from the payload | Truly decoupled; larger events, duplicated data, and consumers holding stale copies |
| **Event sourcing** | Every state change, and the log *is* the record of truth | Rebuilds state by replaying | Complete audit history and time travel; a substantially harder system to build and evolve |

Most systems should default to **event-carrying state transfer**: put enough in the
event that a consumer can act without calling back. A notification-only event that
triggers ten consumers to immediately fetch the same record has moved the coupling
rather than removed it, and produces a load spike on the producer at exactly the moment
it published.

Event sourcing is a much bigger commitment than the other two and is often adopted by
accident, one replayable topic at a time. It's excellent where the history is itself
the product — ledgers, audit trails, regulatory records — and expensive where it isn't,
because every historical event schema must be readable forever.

## The dual-write problem

A service handling `POST /orders` must do two things: write a row and publish an event.
There is no transaction spanning both systems, so one of them can succeed alone:

- **Commit, then publish, and crash between** — the order exists, no email is sent, nothing downstream ever knows. Silent data divergence.
- **Publish, then commit, and the commit fails** — consumers process an order that doesn't exist.

Retries don't fix this; they narrow the window. The standard solution is the
**transactional outbox**: in the same database transaction that writes the order,
insert a row into an `outbox` table. A separate process reads that table and publishes
to Kafka, marking rows as sent. Now there's exactly one atomic write, and publishing is
a retriable at-least-once operation whose duplicates the previous page already taught
you to tolerate.

The relay can poll the outbox table on a short interval, or — better at scale — read
the database's replication log directly via **change data capture** (Debezium is the
common implementation). CDC avoids the polling load and picks up writes made by
anything, including migrations and manual fixes.

The mirror-image problem exists on the consumer side: process an event, write to the
database, and the offset commit fails. That's the duplicate case, and idempotent
consumers already handle it. The two patterns together — outbox on the way out,
idempotence on the way in — are what make an at-least-once system correct end to end.

## Schema evolution

An event schema is a public API with an unusual property: the consumers are unknown,
and with a replayable log, so are the *readers of old data*. A schema change that
breaks a five-month-old record breaks a replay you'll need during an incident.

A **schema registry** enforces this at the serialisation boundary. Producers register
schemas, consumers fetch them by id, and the registry rejects incompatible changes
before they reach the log. The compatibility modes are worth knowing by name:

| Mode | Guarantees | Allows |
| --- | --- | --- |
| **Backward** | New consumers read old data | Deleting fields, adding optional fields |
| **Forward** | Old consumers read new data | Adding fields, deleting optional fields |
| **Full** | Both | Only adding or removing optional fields |

**Backward** is the usual default, because it lets you upgrade consumers first. If you
can't control deployment order — and with independent teams you can't — **full** is the
honest setting.

The rules that follow, whatever your serialisation format:

- **Add fields as optional, with defaults.** Always safe.
- **Never repurpose a field.** Changing what `status` means, or reusing a Protobuf field number, corrupts every consumer silently. Add a new field and deprecate the old.
- **Never remove a required field**, and treat removing any field as a multi-release change.
- **Version the event type, not just the schema**, when the meaning genuinely changes — a new topic or a `v2` type is cheaper than a schema contortion.

Avro, Protobuf and JSON Schema all work; Avro and Protobuf are compact and strongly
typed, JSON Schema is readable and forgiving. [CloudEvents](https://cloudevents.io/) is
worth knowing as a standard envelope — id, source, type, time — that gives you
correlation and routing metadata without inventing your own conventions.

## Choreography, orchestration, and sagas

With several services reacting to each other's events, a multi-step business process
emerges from the interactions. Two ways to structure it:

**Choreography** — each service listens and reacts. No central coordinator, maximum
decoupling, and no single place where the process is written down. Debugging "why
didn't this order ship?" means reconstructing a distributed sequence from logs, and
the difficulty grows faster than the number of steps.

**Orchestration** — a coordinator service (or a workflow engine such as Temporal,
Step Functions or Camunda) drives the process, calling each step and handling failures.
The process is explicit, inspectable and testable; you've reintroduced a central
component that knows about everyone.

Rule of thumb: choreography for two or three reactive steps, orchestration once the
process has branches, timeouts and compensations that someone has to reason about as a
whole. Long-running business processes are usually clearer orchestrated, and the
"you've added coupling" objection matters less than the ability to answer where an
order is stuck.

Either way, a multi-service process has no distributed transaction, so failure recovery
is a **saga**: each step has a compensating action that semantically undoes it. Not a
rollback — a refund is not the erasure of a charge, it's a second fact. Compensations
must be designed as real business operations, and some steps (an email sent, a package
dispatched) genuinely cannot be compensated, which is an argument for ordering the
irreversible steps last.

## When not to use Kafka

Kafka is a distributed system with real operational weight, and a lot of what people
build with it would be better served by something smaller.

| Use | Reach for |
| --- | --- |
| Distributing jobs to a worker pool, unordered, with per-message ack and retry | A queue — SQS, RabbitMQ, or a database-backed job table |
| Request/response where the caller needs the answer | An HTTP call. Async is not automatically better |
| A few thousand events a day, one consumer | Postgres `LISTEN/NOTIFY`, a jobs table, or a managed queue |
| Ordered, replayable stream with many independent consumers and high throughput | Kafka |

The honest test: are you using replay, per-key ordering, or multiple independent
consumer groups? If none of the three, you are paying for a log and using a queue. A
database-backed job table with `SELECT … FOR UPDATE SKIP LOCKED` handles a surprising
amount of async work with a fraction of the moving parts, and it participates in the
transaction you already have — which removes the dual-write problem entirely rather
than solving it.

## What to take away

- Publish facts, not instructions; past-tense events are what actually decouple producer from consumer.
- Default to event-carrying state transfer — a notification that triggers ten callbacks has moved the coupling, not removed it.
- The dual-write problem has one general solution: the transactional outbox, polled or read via CDC.
- Treat event schemas as permanent public APIs; add optional fields, never repurpose one, and let a registry enforce it.
- Choreography for small reactive chains, orchestration once the process needs to be reasoned about as a whole.
- Multi-service processes need compensating actions, and irreversible steps should go last.
- If you don't need replay, per-key ordering, or many consumer groups, use a queue.

## References

- Martin Fowler, [*What do you mean by "Event-Driven"?*](https://martinfowler.com/articles/201701-event-driven.html) — the source of the notification / state-transfer / event-sourcing distinction
- [microservices.io — Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html) · [Saga](https://microservices.io/patterns/data/saga.html)
- [Debezium — Documentation](https://debezium.io/documentation/reference/stable/index.html) — change data capture in practice
- [Confluent — Schema Registry and compatibility types](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [CloudEvents — Specification v1.0.2](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [PostgreSQL — `SELECT … FOR UPDATE SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
