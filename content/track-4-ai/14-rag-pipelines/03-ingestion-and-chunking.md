---
title: "Ingestion & Chunking"
description: "Parsing without losing structure, splitting text into retrievable units, and keeping an index in step with a corpus that changes."
track: 4
chapter: 14
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**The Shape of a RAG System** — the two paths, and why ingestion errors are permanent.
:::

## Parsing loses more than you think

Before anything can be chunked it has to become text, and that conversion is lossier than
it appears. A naive PDF-to-text extraction typically destroys:

- **Table structure.** Rows and columns flatten into a stream of cell values. `Region Q1 Q2 EMEA 4.2 5.1 APAC 3.8 3.3` is unanswerable — nothing says 5.1 is EMEA's Q2.
- **Heading hierarchy.** A chunk reading "This is not supported in the free tier" is useless without knowing which feature the enclosing section was about.
- **Reading order.** Multi-column layouts interleave; headers and footers land mid-sentence.
- **Anything not text.** Diagrams, charts, and screenshots vanish, along with any fact that only appears in them.

Two responses are worth the effort. First, **parse to structured markup rather than plain
text** — Markdown or HTML preserving headings, lists, and tables. Layout-aware document
parsers and, increasingly, vision-language models that read a page image and emit Markdown
both do far better than text extraction on anything with a layout. Second, **spot-check the
output.** Take twenty representative documents, read the parsed text, and ask whether you
could answer questions from it. This is a boring hour that routinely finds the real
problem.

Whatever the source format, aim for the same intermediate representation. Downstream
stages should not know whether a chunk came from a PDF, a Confluence page, or a Markdown
file.

## Why chunks and not documents

You retrieve chunks because whole documents are wrong at both ends. A 40-page manual is
mostly irrelevant to any given question, so its embedding is an average of forty topics
and matches nothing well; and even if retrieved, it would consume the entire context
window.

Chunking is therefore a compromise between two failure modes, and every parameter choice
is a position between them:

| Too small | Too large |
| --- | --- |
| Answers split across chunks | Embedding is diluted across topics |
| Missing antecedents ("it", "this setting") | Irrelevant text crowds the context window |
| More chunks: bigger index, more retrieval noise | Fewer, coarser retrieval targets |

## Sizing, overlap, and structure

**Size.** Somewhere between 200 and 800 tokens covers most prose corpora, with 300–500 a
reasonable starting point. The right number depends on how information is distributed in
your documents: dense reference material tolerates smaller chunks; narrative or
tutorial text needs larger ones to keep an idea intact. Check the number against your
embedding model's input limit — silently truncated chunks are indistinguishable from bad
retrieval.

**Overlap.** Repeat 10–20% of the previous chunk at the start of the next, so a fact
sitting on a boundary appears whole in at least one chunk. It costs index size and creates
near-duplicate results (deduplicate by source position at assembly time). It is
nonetheless the cheapest available insurance against boundary loss.

**Structure beats arithmetic.** Splitting every 500 tokens regardless of content is the
weakest strategy that works. Better, in rough order:

1. **Split on document structure** — headings, sections, list items — then merge small pieces up to the target size and split oversized ones down. A chunk that is exactly one subsection is a much better retrieval target than one that starts mid-paragraph.
2. **Never split a table from its header.** Serialise small tables whole; for large ones, repeat the header row in each piece.
3. **Keep code blocks intact.** A function split in half retrieves badly and reads worse.
4. **Recursive character splitting** — try paragraph breaks, then sentence breaks, then whitespace — as the fallback when a document has no usable structure.

## Enrichment: give the chunk its context back

A chunk torn out of its document loses the context that made it interpretable. Two cheap
techniques restore most of it.

**Prepend the heading path.** Embed and store the chunk with its location:

```text
Billing > Subscriptions > Cancellation

You can cancel at any time from the account settings page. Access
continues until the end of the current billing period.
```

The heading path is a handful of tokens and dramatically improves both retrieval (the
words "cancellation" and "billing" are now in the chunk) and generation (the model knows
what it's reading).

**Attach metadata as fields, not prose.** Source URL, document ID, section, created and
updated timestamps, document type, language, and — critically — whatever the access
control system needs. Metadata is what makes filtering possible, and filtering is what
makes a retrieval system usable by more than one tenant.

Two heavier options, worth knowing but not worth doing by default:

- **Contextual chunk headers** — use a language model to write a sentence situating each chunk in its document, and prepend it. This measurably improves retrieval, and it costs a model call per chunk at ingestion time, which is significant on a large corpus.
- **Small-to-big retrieval** — embed small, precise chunks for matching, but return the larger parent section for generation. You get precise retrieval and complete context; the cost is a second store keyed by parent ID.

## Keeping the index current

The part that gets skipped, and then becomes an incident. An ingestion pipeline is not
"run the script once"; it's a system that has to converge on the state of the sources.

- **Deletes must propagate.** A document removed from the source but still in the index is worse than a missing one: the model will confidently answer from content that no longer exists. Every chunk needs a stable link to its source document so deletion can cascade.
- **Updates are delete-then-insert.** Re-chunking a changed document produces different boundaries, so you cannot match old chunks to new ones. Delete every chunk for that document ID, then insert the new set. Chunk IDs derived from content hashes make this idempotent and let you skip unchanged documents cheaply.
- **Version the pipeline, not just the model.** Store the parser version, chunking strategy, and embedding model alongside each chunk. When a change improves results you need to know which chunks predate it.
- **Reprocessing must be safe to run twice.** Ingestion jobs fail halfway. Make them idempotent and resumable, and always write into a new index version rather than mutating the live one during a full rebuild.
- **Watch the counts.** A sudden drop in chunks per document usually means a parser broke on a format change, and it is otherwise invisible until users notice missing answers.

## What to take away

- Parse to structured markup, and read twenty parsed documents by hand before trusting the pipeline.
- Chunk on structure first and size second; 300–500 tokens with 10–20% overlap is a defensible starting point, not a law.
- Prepend the heading path — a few tokens that improve both retrieval and generation.
- Attach metadata, including permissions, at ingestion time. You cannot filter on what you didn't store.
- Deletes and updates are the part that breaks in month three. Give every chunk a stable document ID and make ingestion idempotent.

## References

- Barnett et al., [*Seven Failure Points When Engineering a Retrieval Augmented Generation System*](https://arxiv.org/abs/2401.05856) (2024)
- [Unstructured — document partitioning and chunking strategies](https://docs.unstructured.io/open-source/core-functionality/chunking) · [LlamaIndex — node parsers](https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/) · [LangChain — text splitters](https://python.langchain.com/docs/concepts/text_splitters/)
- [Anthropic — Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) — measured results for contextual chunk headers combined with hybrid search
