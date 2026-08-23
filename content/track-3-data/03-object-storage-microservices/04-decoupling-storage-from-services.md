---
title: "Decoupling Storage from Services"
description: "Metadata versus bytes, the dual-write problem, event-driven derivatives, and reconciling what drifts apart."
track: 3
chapter: 3
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Upload & Download Pipelines** — the pending/ready split introduced there is what
this page builds on.
:::

## The metadata table is the source of truth

The bucket holds bytes; the database holds everything you can ask a question about.
Nothing should discover a file by listing a prefix — listing is slow, unordered,
and cannot answer "whose is it".

```sql
create table assets (
    id            uuid primary key default uuidv7(),
    owner_id      uuid not null references users (id),
    bucket        text not null,
    object_key    text not null,
    status        text not null default 'pending'
                    check (status in ('pending', 'ready', 'deleted')),
    content_type  text,
    size_bytes    bigint check (size_bytes >= 0),
    checksum      text,
    created_at    timestamptz not null default now(),
    ready_at      timestamptz,

    unique (bucket, object_key),
    constraint ready_has_facts check (
        status <> 'ready' or (size_bytes is not null and ready_at is not null)
    )
);
```

Two details carry weight. `object_key`, not a URL — URLs embed a region and a
domain, both of which will change, and a stored URL is a migration you'll do by
hand. And `status`, with a `CHECK` that a `ready` row actually has the facts that
only post-upload verification can supply, so "ready" cannot be set by a code path
that skipped the check.

## The dual-write problem

An upload writes to two systems that cannot share a transaction. Whichever you
write first, a crash in between leaves them disagreeing — the only choice is which
kind of disagreement you get.

| Order | Failure leaves | Severity |
| --- | --- | --- |
| **Bytes first, row second** | An object nobody references | Wastes storage; invisible to users; sweepable |
| **Row first, bytes second** | A row pointing at nothing | User-visible `404`, broken page, failing job |

So: **write the bytes first, commit the row second.** Orphaned objects are a
janitorial problem, dangling references are an incident. This single ordering rule
resolves most of the design.

The pending/ready flow implements it with one refinement — the row is inserted
*before* the upload so the server can authorize and own the key, but it isn't
`ready` until the bytes are verified. A `pending` row is not a dangling reference,
because nothing reads a pending asset.

That leaves two kinds of debris, both handled by scheduled reconciliation rather
than by trying to be clever in the request path:

- **Pending rows whose upload never happened.** Sweep rows older than the presigned
  URL's expiry, `HEAD` the key, and either promote or delete. A few lines, run
  hourly.
- **Objects with no row.** Upload to a dedicated `staging/` prefix with a lifecycle
  rule that expires it after a day, and copy to the permanent prefix at
  confirmation. The provider does the cleanup and you write nothing.

Run reconciliation as a job that logs its counts. A drift number that's normally
zero and one day isn't is a genuinely useful early warning, and it costs nothing to
have.

## Deletion is the same problem, reversed

Deleting the object first and the row second gives you a dangling reference again —
the worse of the two. So deletion is: mark the row `deleted`, stop serving it, and
reclaim the bytes asynchronously.

The asynchronous step matters beyond ordering. Deletes are the operation people
most often want to undo, and a 30-day grace period before the bytes actually go is
cheap insurance. Bucket versioning gives you a second layer of the same thing.

Watch for shared objects. If keys are **content-addressed** — the key derived from
a hash of the contents — two users uploading the same file get one object, and
deleting one user's asset must not remove the bytes the other still references.
Content addressing is a genuinely good default (it deduplicates, and it makes
retries idempotent, since re-uploading the same bytes to the same key is a no-op)
but it turns deletion into a reference-counting problem. Count references in the
database, or don't hard-delete at all.

## Events, and what to trust them for

Object stores emit notifications — `s3:ObjectCreated:*` and friends — to a queue,
a topic, or a function. That's a message bus you already have, and it's what makes
derivative work (thumbnails, transcodes, text extraction, virus scanning) something
other services do on their own time instead of something your upload endpoint waits
for.

Three properties to design around:

**Delivery is at-least-once.** A consumer will be handed the same event twice.
Making the handler idempotent isn't optional, and the easiest way is a deterministic
output key: a thumbnail written to `thumbs/{asset_id}/256.jpg` is the same object
whether it's generated once or five times.

**Ordering isn't guaranteed.** A create and a subsequent overwrite can arrive out of
order. If ordering matters, carry a version or a sequence number in the row and let
the consumer ignore anything stale.

**The event describes the bucket, not your database.** A bucket event fires when the
bytes land, which may be before the row is committed — so a consumer that
immediately looks the asset up may not find it. Either have the consumer retry, or
publish your own `asset.ready` event *after* the transaction commits, using a
**transactional outbox**: insert the event into an `outbox` table in the same
transaction as the row, and have a relay publish it. That way the event and the
state it describes can't disagree.

Which to use is a real fork: bucket events are free and require no code, and are
right for pure byte-level work like generating a thumbnail. Outbox events cost a
table and a relay, and are right when consumers need the *business* fact ("this
user's avatar changed") rather than the storage fact.

## Service boundaries

Once storage is separate, the ownership question becomes concrete: **one service
owns a bucket or a prefix, and nobody else writes to it.** Multiple writers to one
prefix is the shared-database anti-pattern in a different costume — no schema, no
constraints, and no way to change the key layout without finding every writer.

Readers are a different matter, and it's fine for several services to read from a
prefix, or to be handed presigned URLs by the owning service. The asymmetry is
deliberate: reads can't corrupt the layout.

Where this pays off is that the owning service can be small. A media service that
issues presigned URLs, verifies uploads, maintains the `assets` table and publishes
`asset.ready` is a few hundred lines, and every other service depends on that
contract rather than on the bucket.

## Practical notes

- **Run a real object store locally.** [MinIO](https://min.io/docs/minio/linux/index.html) or [LocalStack](https://docs.localstack.cloud/) are S3-API-compatible, so presigned URLs, multipart and events can be exercised in tests. A filesystem-backed fake behind an interface hides exactly the behaviours that break in production.
- **Never take the bucket name from the client.** It goes in configuration. Storing it per row is for migrating between buckets, not for accepting one as input.
- **Give the service a scoped identity.** The upload service's credentials should permit exactly its bucket and prefix — an IAM role, not a long-lived access key, wherever the platform supports one.
- **Emit metrics for the seam.** Pending rows older than the URL expiry, orphaned objects found per sweep, and derivative-job lag are the three numbers that tell you the two systems are still in agreement.

## What to take away

- The database is the index; the bucket is storage. Nothing finds a file by listing.
- Write bytes first and commit the row second — orphans are cleanable, dangling references are an outage. Reverse it for deletes: mark the row, reclaim the bytes later.
- Reconcile on a schedule instead of trying to make two systems atomic, and let a staging prefix with a lifecycle rule do most of the cleaning.
- Bucket events are at-least-once and unordered; handlers must be idempotent. Use an outbox when the event needs to mean something about your data, not just about the bytes.
- One writer per bucket or prefix. Many readers are fine.

## References

- [Amazon S3 — Event notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html) and [using EventBridge](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html)
- [Google Cloud Storage — Pub/Sub notifications](https://cloud.google.com/storage/docs/pubsub-notifications) · [Azure — Blob Storage events](https://learn.microsoft.com/azure/storage/blobs/storage-blob-event-overview)
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [AWS — IAM roles for service identity](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html)
