---
title: "The Object Storage Model"
description: "Buckets, keys, immutability, consistency and storage classes — and what actually drives the bill."
track: 3
chapter: 3
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Overview** of this chapter. No prior S3 experience assumed.
:::

## It is a key–value store, not a filesystem

An object store maps a **key** — an arbitrary string — to a blob of bytes plus some
metadata. That's the entire data model, and the differences from a filesystem all
follow from it.

The namespace is **flat**. `invoices/2026/03/inv-1041.pdf` is not a file in three
nested directories; it's one key that happens to contain slashes. There is no
directory object, so "create a folder" isn't an operation, "rename a directory"
means copying every object under a prefix, and listing is a **prefix scan** that
gets slower as the prefix widens. The console draws folders because humans like
them, not because they exist.

Objects are **immutable**. You cannot append to an object or rewrite the middle of
one — writing to an existing key replaces the whole object, so an in-place edit
becomes either a new key or a new version of one. That constraint is what makes the
store cheap, durable and enormously parallel, and also why it's a poor fit for
anything with a hot mutable tail: a log being appended to, a counter, a work queue.

Objects carry **metadata** — content type, cache headers, arbitrary user-defined
pairs — but it isn't indexed or queryable. Finding "every invoice over £10,000"
means scanning every object, or asking Postgres. Metadata complements a database
table; it doesn't replace one.

## Consistency and durability

Modern object stores are **strongly consistent**: since December 2020, S3 gives
read-after-write consistency for `PUT`s and `DELETE`s and consistent `LIST`
results, at no extra cost. Google Cloud Storage and Azure Blob Storage make the
same guarantee. Older advice about eventual-consistency workarounds — retry loops,
sentinel files — is obsolete, and worth recognising as obsolete in existing code.

What remains true is that **there are no transactions**. Two `PUT`s are two
independent operations, an operation spanning a bucket and a database cannot be
atomic, and there is no compare-and-swap across objects. Designing around that is
the subject of **Decoupling Storage from Services**.

Durability figures — S3 advertises eleven nines — describe protection against
hardware failure. They say nothing about a bad deploy that deletes the wrong
prefix, which is the failure that actually happens. Two features address it:

- **Versioning** keeps prior versions of a key, so an overwrite or delete is
  recoverable; a delete becomes a *delete marker* rather than a removal. You now
  store every version, so a rule to expire old ones is part of the same decision.
- **Object Lock** enforces write-once-read-many retention for a period — what
  compliance regimes usually mean by "immutable", and protection against a
  credential compromise that tries to delete everything.

## Storage classes and lifecycle

Not all bytes are read equally often, and pricing reflects that. The classes differ
along three axes: price per GB, retrieval latency, and retrieval fee.

| Class (S3 naming) | For | Retrieval |
| --- | --- | --- |
| Standard | Actively read data | Immediate, no fee |
| Intelligent-Tiering | Unknown or changing access patterns | Immediate; a small monitoring fee per object |
| Standard-IA / One Zone-IA | Read a few times a year | Immediate, per-GB fee, 30-day minimum |
| Glacier Instant Retrieval | Archives that must still be fast | Immediate, higher fee |
| Glacier Flexible / Deep Archive | Compliance retention | Minutes to hours |

**Lifecycle rules** automate the transitions declaratively — "move to Standard-IA
after 30 days, Glacier after 180, expire after 7 years" — and are the mechanism, not
a background job you write.

Two lifecycle rules earn their place on essentially every bucket:

- **Abort incomplete multipart uploads** after a few days. A failed multipart upload
  leaves its parts behind, invisible in a normal listing, and billed indefinitely.
  This is the most common source of "why is the bucket bigger than the sum of its
  objects".
- **Expire non-current versions** if versioning is on, unless retention policy says
  otherwise.

Intelligent-Tiering is a reasonable default when access patterns genuinely aren't
known, but it isn't free — the per-object monitoring charge makes it a poor fit for
buckets holding tens of millions of tiny objects.

## What the bill is made of

Storage per GB is the line people plan for and rarely the line that surprises them.
Three others do:

**Egress.** Bytes leaving the provider's network are charged per GB, and at volume
this dominates everything else — it's also what makes providers sticky, since
moving 50 TB out costs real money. A CDN cuts it substantially, because origin
fetches are a fraction of requests. Some providers (Cloudflare R2 notably) price
egress at zero and charge more elsewhere; for a lot of public media, that
difference *is* the architecture decision.

**Requests.** Priced per thousand, with writes an order of magnitude dearer than
reads. Irrelevant for large files, decisive for small ones: ten million 2 KB
objects written per day costs far more in requests than in storage. Where the
pattern is "many tiny objects", batching into fewer larger ones is a real design
change worth making.

**Minimum billable sizes and durations.** Infrequent-access classes bill a minimum
object size (128 KB on S3) and a minimum duration (30 days), so moving a million
10 KB objects to a cheaper class can increase the bill.

There's a throughput ceiling too, and it's per prefix rather than per bucket: on
S3, roughly 3,500 write and 5,500 read requests per second per partitioned prefix.
Key naming therefore has performance consequences — spreading keys across prefixes
lets the store partition them, while funnelling every write through
`uploads/2026-08-09/` concentrates load on one partition.

## Practical notes

- **Store the key, never the URL.** URLs embed a region, a domain and a provider, all of which change. The key plus a bucket identifier is the durable reference; URLs are constructed at read time.
- **Design keys deliberately.** Include a tenant or owner segment so a prefix maps to a permission boundary and a lifecycle rule; avoid user-supplied filenames in the key path, since they carry path traversal, encoding and case-sensitivity problems. Keep the original filename in metadata or the database instead.
- **`ETag` is not a checksum.** For a single-part upload it happens to be the MD5 of the content; for a multipart upload it's a digest of the part digests plus a part count. Code that compares an `ETag` to a locally computed MD5 works in testing and fails on anything large. Use the store's explicit checksum support (CRC32C, SHA-256) if you need verification.
- **Buckets are private by default and should stay that way.** S3 enables Block Public Access and disables ACLs on new buckets; public read is almost never the right way to serve files, because presigned URLs or a CDN with signed URLs give the same result with revocability.
- **Encryption at rest is on by default** on all three major providers. Customer-managed keys (KMS) buy you the ability to revoke access to the data cryptographically, at the cost of a KMS request per operation — which shows up on the bill for high request volumes.

## What to take away

- Flat keyspace, immutable objects, no transactions. Every awkward pattern in this chapter traces back to one of those three.
- Strong consistency is now the norm; eventual-consistency workarounds in existing code are obsolete.
- Versioning and Object Lock protect against your own mistakes, which is a different problem from the durability figure.
- Lifecycle rules are the mechanism for tiering and cleanup — and the abort-incomplete-uploads rule belongs on every bucket.
- Egress and request counts, not storage, are what make object storage bills surprising.

## References

- [Amazon S3 — Consistency model](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel) · [Storage classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html) · [Lifecycle configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Amazon S3 — Best practices design patterns: optimizing performance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html) for the per-prefix request rates
- [Amazon S3 — Checking object integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html) on `ETag` versus real checksums
- [Google Cloud Storage — Consistency](https://cloud.google.com/storage/docs/consistency) · [Azure Blob Storage — Access tiers](https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview)
