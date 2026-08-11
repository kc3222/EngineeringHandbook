---
title: "Topics, Partitions & the Log"
description: "The log abstraction, partitions as the unit of both ordering and parallelism, replication, retention versus compaction, and consumer groups."
track: 6
chapter: 21
page: 2
readMinutes: 5
---

## The log

A Kafka topic is an append-only sequence of records. Each record gets a monotonically
increasing **offset** — its position in the log — and stays there until retention
expires. Consumers read forward from a position they control.

Three things follow, and they are the whole model:

- **Reads don't consume.** Ten consumers can read the same record. None of them affect the others, and none of them affect the producer.
- **Position is the consumer's state**, not the broker's. "Where am I?" is a number the consumer commits, which is why rewinding is a matter of setting it backwards.
- **Retention is time- or size-based**, not consumption-based. Records expire on a schedule whether or not anyone read them — the flip side being that a consumer down for longer than the retention window loses data permanently.

## Partitions: ordering and parallelism are the same knob

A topic is split into **partitions**, each an independent log on some broker. This is
the single most important design decision in Kafka, because one choice governs two
things people usually want to tune separately.

**Ordering.** Records are strictly ordered *within* a partition and have no defined
order *across* partitions. A record's partition is chosen by hashing its key, so all
records with the same key land in the same partition and are read in the order they
were written. Key by `order_id` and every event for that order arrives in sequence.
Send with a null key and records are distributed for balance, with no ordering
guarantee at all.

**Parallelism.** One partition is consumed by at most one member of a consumer group.
So the partition count is the hard ceiling on how many consumers can work in parallel:
six partitions means at most six active consumers, and a seventh sits idle.

The tension is immediate. Ordering per entity pushes toward fewer, well-chosen keys;
throughput pushes toward more partitions. In practice:

- **Choose the key first** — it's the semantic decision. What must be ordered relative to what?
- **Over-provision partitions modestly.** Increasing partition count later is possible but rehashes keys, so records for an existing key start landing in a different partition and ordering across the change is broken.
- **Don't over-provision wildly.** Each partition costs file handles, memory, and replication traffic, and end-to-end latency rises with very high counts.
- **Watch for hot keys.** Partitioning by `tenant_id` is natural until one tenant is forty times larger than the rest, at which point one consumer is saturated and five are idle.

## Replication and durability

Each partition has a leader and a configured number of replicas. Writes go to the
leader; followers fetch. Replicas that are caught up form the **in-sync replica set
(ISR)**, and a record is *committed* — visible to consumers — once it's replicated to
the ISR.

Two settings decide what "durable" actually means, and they only work together:

- `acks=all` on the producer — wait for the ISR, not just the leader.
- `min.insync.replicas=2` on the topic — refuse writes if fewer than two replicas are in sync.

With `acks=all` but `min.insync.replicas=1`, the ISR can shrink to just the leader and
"all" means "one"; lose that broker and you lose acknowledged records. With
replication factor 3 and `min.insync.replicas=2`, you tolerate one broker failure
without data loss and reject writes when a second fails — which is a deliberate choice
of consistency over availability, and usually the right one for data you cared enough
to put in Kafka.

The cluster's own metadata — which broker leads which partition — is managed by
**KRaft**, Kafka's built-in Raft consensus. The ZooKeeper dependency that older
material assumes was removed entirely in Kafka 4.0.

## Retention versus compaction

Two policies, for two different kinds of topic.

| | Retention (delete) | Compaction |
| --- | --- | --- |
| Keeps | Everything within a time or size window | The latest record per key, forever |
| Models | A stream of events | A changelog of current state |
| Deletion | By age | By being superseded, or by a null-valued *tombstone* |
| Typical use | `order.placed`, click streams, metrics | `user.profile.changed`, config topics, stream-processing state stores |

Compaction is what makes a topic usable as a materialisable table: read it from the
beginning and you reconstruct the current value of every key without replaying every
historical change. It does not guarantee that duplicates are gone immediately —
compaction runs in the background, so a consumer may still see superseded records —
and the two policies can be combined (`compact,delete`) when old keys should eventually
age out.

## Consumer groups and rebalancing

Consumers with the same `group.id` share a topic's partitions between them: each
partition goes to exactly one member, and each member may hold several. Add a
consumer, remove one, or have one stop responding, and the group **rebalances** —
partition assignments are recomputed and redistributed.

Rebalancing is where most consumer-side operational pain originates.

- The classic **eager** protocol is stop-the-world: every consumer revokes every partition, then reassignments are handed out. A rolling deploy of ten consumers can trigger ten rebalances, each pausing the whole group.
- **Cooperative (incremental) rebalancing** only moves the partitions that actually need to change, which makes deploys and scaling far less disruptive. It is the default in current clients, and the newer consumer group protocol introduced by [KIP-848](https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol) moves assignment to the broker side and removes the global synchronisation barrier entirely.
- **`max.poll.interval.ms` causes rebalances that look like crashes.** If processing a batch takes longer than this interval, the broker assumes the consumer is dead and reassigns its partitions — while the consumer is still working. It then fails to commit, the batch is reprocessed elsewhere, and the pattern repeats. The fix is to reduce `max.poll.records`, raise the interval, or move slow work off the poll thread — but first, recognise the symptom.
- **`session.timeout.ms` and heartbeats** cover the genuinely-dead case; they're independent of poll interval and shouldn't be conflated with it.

Rebalances also mean **partition assignment is not stable**, so any state a consumer
keeps in memory keyed by partition must be rebuildable, and offsets should be committed
before losing a partition.

## What to take away

- The log is durable, ordered and replayable; reads don't consume, and position is the consumer's own state.
- Partitions are simultaneously the unit of ordering and the unit of parallelism — one knob, two consequences.
- The key determines the partition, which determines what is ordered relative to what. Choose it first.
- `acks=all` is only as strong as `min.insync.replicas`; set both.
- Retention expires by age; compaction keeps the latest value per key and turns a topic into a changelog.
- A consumer group can't have more active members than partitions, and rebalances are the main source of consumer instability — `max.poll.interval.ms` most of all.

## References

- [Apache Kafka — Design](https://kafka.apache.org/documentation/#design) and [Replication](https://kafka.apache.org/documentation/#replication)
- [Apache Kafka — Log compaction](https://kafka.apache.org/documentation/#compaction) · [Consumer configuration](https://kafka.apache.org/documentation/#consumerconfigs)
- [KIP-848 — The next generation of the consumer rebalance protocol](https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol)
- [KRaft — Kafka without ZooKeeper](https://kafka.apache.org/documentation/#kraft)
- [Confluent — How to choose the number of topics and partitions](https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/)
