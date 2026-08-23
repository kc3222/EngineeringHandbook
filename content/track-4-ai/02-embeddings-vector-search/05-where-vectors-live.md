---
title: "Where Vectors Live"
description: "pgvector, dedicated vector databases, search engines, and raw libraries — four storage answers and when each stops being the right one."
track: 4
chapter: 2
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**Approximate Nearest Neighbour Search** — HNSW and IVF, and why filtering is the hard
part. Track 3's **Relational Schema Design** is useful background but not required.
:::

## Four shapes of answer

| Option | What it is | Best when |
| --- | --- | --- |
| A library | Faiss, hnswlib, Annoy — an index in your process | The index is small, static, and rebuilt as a batch artefact |
| A relational extension | pgvector in the Postgres you already run | Vectors are one column next to the data they describe |
| A dedicated vector database | Qdrant, Milvus, Weaviate, Pinecone, … | Vector search is a primary workload with real scale |
| A search engine | Elasticsearch, OpenSearch, Vespa | You need lexical and vector search in one query |

The genuine differences between the middle two are smaller than the marketing suggests
and larger than "it's just an index". What follows is what actually separates them.

## Start with the database you already have

If your application already runs Postgres, `pgvector` deserves the first look — not
because it wins every benchmark, but because of what it removes.

Vectors become a column. That single fact eliminates a category of work: no second
system to provision, monitor, back up, and secure; no dual-write consistency problem
between "the row" and "the embedding of the row"; no reconciliation job for vectors whose
source row was deleted. A vector and its metadata update in **one transaction**, and joins
against the rest of your schema are ordinary SQL.

```sql
CREATE EXTENSION vector;

CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,
  content     text NOT NULL,
  embedding   vector(1024) NOT NULL          -- dimensions are part of the type
);

-- Cosine distance, matching normalised embeddings
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

SET hnsw.ef_search = 100;                    -- per-session recall dial

SELECT id, content, embedding <=> :query AS distance
FROM chunks
WHERE tenant_id = :tenant
ORDER BY embedding <=> :query
LIMIT 10;
```

Details worth knowing before committing:

- **Operators must match the index's operator class.** `<->` is L2, `<=>` is cosine, `<#>` is negative inner product, `<+>` is L1. An index built with `vector_cosine_ops` will not be used by a query ordering on `<->` — Postgres simply plans a sequential scan, the query still returns correct results, and it gets slow. Check with `EXPLAIN`.
- **Dimension limits.** The `vector` type holds up to 16,000 dimensions but is only *indexable* to 2,000. `halfvec` (16-bit floats) indexes to 4,000 and halves storage, which is the standard answer for 3072-dimension models.
- **Filtering.** A `WHERE` clause alongside an ANN scan is exactly the selectivity problem from the previous page. pgvector's **iterative index scans** address it by continuing to scan the index until enough rows survive the filter, rather than filtering a fixed candidate set down to nothing. Enable it (`hnsw.iterative_scan`) when queries carry selective predicates.
- **Partial indexes are a real tool here.** For a handful of large tenants, `CREATE INDEX … WHERE tenant_id = …` gives each its own graph and sidesteps filtered search altogether.
- **Index builds are memory-hungry.** Build with `maintenance_work_mem` raised enough to hold the graph, and use parallel workers — an HNSW build that spills to disk is dramatically slower.

Where pgvector runs out is roughly where a general-purpose transactional database runs
out for any specialised workload: hundreds of millions of vectors, sustained high-QPS
vector traffic competing with OLTP for the same buffer pool, or a need for
vector-specific features (multi-vector documents, native sparse-dense fusion, tiered
storage). That's a real ceiling — it just sits much higher than teams assume.

## When a dedicated vector database earns its keep

The case is genuine at scale and rests on things purpose-built engines do that a
general-purpose database does not:

- **Memory and storage tiering** designed for vectors — quantised vectors in RAM, full-precision on disk, rescoring built in rather than hand-rolled.
- **Filtered search implemented inside the traversal**, tested against selective predicates.
- **Native hybrid retrieval** — sparse and dense in one query with fusion applied server-side.
- **Horizontal sharding and replication of the index itself**, not of the whole database.
- **Operational ergonomics for high churn** — real compaction of deleted nodes, background rebuilds, snapshotting.

The cost is the one you'd expect: a second stateful system in your architecture. It has
its own backup story, its own access-control model, its own upgrade path, and — most
importantly — **no shared transaction with your primary database**. The write path becomes
a dual write, which means the failure modes from Track 3's **Decoupling Storage from
Services** apply directly: rows whose vectors were never written, and vectors pointing at
rows that no longer exist. Plan the reconciliation job at the same time as the integration,
not after the first incident.

## Search engines, when lexical matters equally

If you already run Elasticsearch, OpenSearch, or Vespa for keyword search, adding vector
search there is often better than adding a third system. These engines index dense vectors
natively alongside their inverted index, which means BM25 and vector retrieval can be
combined **in a single query with server-side fusion** rather than by issuing two searches
and merging in application code. Given how much of practical retrieval quality comes from
hybrid search — the next page — that's a meaningful architectural advantage, not a
convenience.

The trade is that vector search is one feature among hundreds rather than the engine's
reason to exist, so the newest ANN techniques land later than they do in dedicated stores.

## Libraries, and the shape they fit

Faiss and hnswlib are indexes, not databases: no persistence guarantees, no queries, no
concurrency model, no access control. Everything around the index is yours.

That's the right trade in exactly one common situation — the index is a **build artefact**.
A nightly job embeds the corpus, builds the index, writes it to object storage, and
serving instances load it into memory at startup. Immutable, versioned, trivially
rollback-able, and about as fast as vector search gets. If your corpus changes hourly
rather than continuously, this is a much simpler system than any database.

## Choosing, and the non-obvious constraints

Beyond scale, three things decide more of these than benchmarks do:

**Access control.** A vector index is a second copy of your content. If your primary
database enforces row-level security, an external vector store that doesn't know about
those policies is a bypass. Either every query must carry the tenant/permission filter and
be reviewed as security-critical code, or the vectors stay inside the database that
already enforces the rule.

**Freshness.** How long after a document changes must search reflect it? Seconds implies
transactional or streaming updates. Hours means a batch rebuild is fine — and batch
rebuilds make almost every other problem here easier.

**Operational appetite.** A dedicated vector database is a database. Someone will be
paged for it.

The default worth starting from: **vectors in Postgres, with the source text beside them,
until measurements say otherwise.** Migrating later is a backfill, and you were going to
build backfill tooling for the embedding-model upgrade anyway.

## What to take away

- Vectors in your existing database remove the dual-write problem, the second backup story, and the access-control gap — start there unless scale rules it out.
- With pgvector, match the operator to the index's operator class, use `halfvec` past 2,000 dimensions, and turn on iterative scans when queries filter.
- Dedicated vector databases earn their place on scale, tiering, filtered search, and churn — and cost you a dual write plus a reconciliation job.
- If you already run a search engine, adding vectors there buys single-query hybrid retrieval, which is worth a lot.
- A rebuilt-nightly index file in object storage is a legitimate and very simple architecture for slow-moving corpora.

## References

- [pgvector](https://github.com/pgvector/pgvector) — types, operator classes, index parameters, and iterative index scans
- [Faiss wiki — guidelines to choose an index](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)
- [Elasticsearch — kNN search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html) · [OpenSearch — k-NN](https://docs.opensearch.org/latest/vector-search/) · [Vespa — approximate nearest neighbour with HNSW](https://docs.vespa.ai/en/approximate-nn-hnsw.html)
- [Qdrant — filtering and quantisation](https://qdrant.tech/documentation/concepts/filtering/) · [Milvus documentation](https://milvus.io/docs) · [Weaviate — vector indexing](https://docs.weaviate.io/weaviate/concepts/indexing)
