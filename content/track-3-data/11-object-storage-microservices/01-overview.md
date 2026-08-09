---
title: "Object Storage & Microservices"
description: "Cloud storage integration patterns — object storage, upload pipelines, and decoupling storage from your core service."
track: 3
chapter: 11
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**Relational Schema Design** — object storage and a database are used together,
and most of the design work is in deciding which fact lives where.
:::

## Why this chapter exists

Sooner or later an application has to hold something that isn't a row: an uploaded
PDF, a profile photo, a model checkpoint, a nightly export. The database will
technically accept it — PostgreSQL has `bytea` and large objects — and doing so is
almost always the wrong call.

Bytes in a relational database inflate every backup, every replica, and every
restore. A 40 GB database of rows recovers in minutes; the same database with 400 GB
of PDFs in it does not, and you pay that cost on the worst possible day. Meanwhile
none of what a database is good at — joins, constraints, transactions, indexes —
applies to a blob it can't look inside.

So the standard split is:

| Object storage | Database |
| --- | --- |
| The bytes | The facts about the bytes |
| Immutable, addressed by key | Mutable, queryable, constrained |
| Cheap per GB, priced per request and per byte out | Expensive per GB, priced per instance |
| No transactions | Transactions |

The interesting engineering is in the seam between those two columns, because it
spans two systems that cannot participate in one transaction. That's what most of
this chapter is about.

## The other half of the title

Object storage is also where a service boundary naturally falls. A file that's
uploaded once and read by four services doesn't belong to any of them; a thumbnail
pipeline triggered by an upload event doesn't need to be inside the request path at
all. Bucket events are a message bus that already exists, and treating them as one
lets the core service stop caring about image resizing, virus scanning, or
transcoding.

Done carelessly, the same seam produces the two failure modes that show up in every
system that stores files: rows pointing at objects that were never written, and
objects nobody references and nobody will ever delete.

## What's in here

| Page | What it covers |
| --- | --- |
| The Object Storage Model | Buckets, keys, immutability, consistency, storage classes, and what actually drives the bill |
| Upload & Download Pipelines | Presigned URLs, multipart, validation, and serving reads without proxying bytes |
| Decoupling Storage from Services | Metadata versus bytes, the dual-write problem, event-driven derivatives, and reconciliation |

## Where this connects

**Relational Schema Design** covers the metadata table this chapter keeps
referring to, and **Row-Level Security** covers a guarantee that stops at the
bucket's edge — a policy protects rows, not objects, and access control for the
bytes is a separate mechanism.

Forward, Track 6's **Containers & Deployment** and **Event-Driven Systems** pick up
the operational side: where these services run, and what to do when the queue
consuming bucket events falls behind.

## References

- [Amazon S3 — User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [Google Cloud Storage — Documentation](https://cloud.google.com/storage/docs) · [Azure Blob Storage](https://learn.microsoft.com/azure/storage/blobs/)
