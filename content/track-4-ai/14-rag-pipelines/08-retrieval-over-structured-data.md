---
title: "Retrieval over Structured Data"
description: "When the corpus is a database — retrieving schema instead of documents, generating SQL through a tool call, and the failure modes that produce a confident wrong number."
track: 4
chapter: 14
page: 8
readMinutes: 5
---

:::info[Prerequisites]
**The Shape of a RAG System** — the two paths, which survive intact here. **LLM APIs**
supplies the tool-calling mechanism this page depends on, and Track 3's **Relational Schema
Design** is useful background on the schemas being queried.
:::

## The same pipeline, a different corpus

The chapter overview makes a claim it's worth cashing in: when the data has a schema,
retrieving rows as prose is a lossy detour, and *"how many contracts expire this quarter"*
is a database query rather than a search. This page is what that alternative actually looks
like, because it is still a retrieval system — the thing being retrieved is just the
**schema** rather than the content.

The query path:

1. **Retrieve** the table and column descriptions relevant to the question.
2. **Generate** one read-only query against them, via a tool call.
3. **Validate** it, then execute it under a constrained database identity.
4. **Narrate** the returned rows back into a sentence with a second model call.

Steps 3 and 4 are where most of the engineering lives. Step 3 is significant enough that it
gets its own page — **Executing Generated Queries Safely** — and nothing here should be
deployed without it.

## The schema is what you retrieve

The instinct is to paste the whole schema into the prompt. That works until it doesn't:
a few hundred tables blow the context budget, and long before that they blow the *precision*
budget. Extra tables are not neutral — a model shown `orders`, `orders_archive` and
`orders_v2` will pick one, and it has no way to know which is live.

So build a real corpus: **one plain-English document per table**, written by someone who
knows the data. The useful content is the part the DDL cannot express.

```markdown
# invoice

One row per invoice issued to a customer. The grain is the invoice, not the line
item — join `invoice_line` for per-track detail, and expect fan-out if you do.

Columns worth knowing:
- `total` — the invoice total in the billing currency. Denormalised; it is the
  sum of the line items, and is the column to use for revenue questions.
- `invoice_date` — timestamp, UTC. "Last month" means calendar month here.
- `billing_country` — free text, not an ISO code. "USA" and "United States"
  both occur.

Relationships: `customer_id` → customer.id. `invoice_line.invoice_id` → this table.
```

Embed those documents, retrieve the top *k* for the question, and put the full text of the
matches in the prompt. One asymmetry against ordinary document RAG governs how you tune it:
in document RAG a missed chunk degrades an answer, but here **a missed table makes a correct
query impossible.** The model cannot join to a table it wasn't told exists — it will instead
invent a plausible one, or answer the question from the tables it did get. So tune for
recall, accept the precision cost, and measure table recall directly: for a set of real
questions, did the retrieved set contain every table the correct query needs?

Two implementation details that repay attention:

- **Embed a short "retrieval card" — the summary and the relationships — while returning the full document.** What matches a question well is rarely the same text that answers it well, and separating the two lets each be optimised.
- **Check the context window is actually large enough.** Several full table docs plus the question can exceed a runtime's default context length, and the common failure is a *silent* truncation: the schema is cut off, the model writes SQL against what survived, and nothing in the response says so.

## Getting a query out of the model

Ask for SQL as text and you get SQL in a markdown fence, sometimes with a preamble,
occasionally with two queries and a note about which is better. Every one of those is a
parsing problem you don't need.

Use a tool call instead. Define one tool — `run_sql(query: string)` — and the model returns
a structured argument with exactly one field. The interface enforces the shape.

```python
tools = [{
    "name": "run_sql",
    "description": (
        "Run one read-only SELECT against the database and return the rows. "
        "PostgreSQL dialect. Use only the tables described in the context."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "A single SELECT statement"}
        },
        "required": ["query"],
    },
}]
```

Name the dialect explicitly — SQL is not one language, and a model that defaults to MySQL
syntax against Postgres fails on date functions first. Note also that emitting a valid tool
call is one of the capabilities that degrades earliest in heavily quantized models; if
you're self-hosting, that's the behaviour to check before anything else.

## Two calls, not one

Generating the query and explaining the results are separate model calls, and collapsing
them is a mistake worth naming. Kept separate, each is independently testable, the
explanation call sees the *real* rows instead of predicting what they might be, and the
generation call carries no pressure to also be readable.

The second call is deliberately small: the question, the returned rows rendered as plain
text, and an instruction to answer from them only. It has no tools and no database access.
Its failure mode is ordinary intrinsic hallucination — restating a number wrongly — so the
guidance from **Hallucination** applies unchanged, and showing the rows next to the answer
is what makes the failure catchable.

That's the second reason for the split: **surface the query.** A wrong answer from a
text-to-SQL system is only diagnosable if the user can see the SQL, the rows, and which
tables were retrieved. Putting them one click behind every answer costs nothing and turns
"it's wrong sometimes" into a bug report that names a stage.

## Where it goes wrong

The dangerous property of this pattern is that the failures are *plausible numbers*. There
is no equivalent of a garbled sentence to tip anyone off.

| Failure | What it looks like | Where the fix goes |
| --- | --- | --- |
| Missing table | Query answers a narrower question than asked | Retrieval — raise `k`, fix the table doc |
| Fan-out on a join | Revenue inflated by the number of line items | Table docs: state the grain explicitly |
| Wrong column for the concept | `total` vs `unit_price × quantity` | Table docs: say which column is canonical |
| Filter on a display value | `WHERE country = 'US'` against free text | Table docs: give the actual value domain |
| Ambiguous name across tables | Joins to the wrong `id` | Table docs: name the foreign keys |
| Silent empty result | "There were no invoices" when the filter was wrong | Treat zero rows as a branch, not an answer |
| Dialect mismatch | Date arithmetic errors | Name the dialect in the tool description |

Nearly all of these are fixed in the **table documentation**, not in the prompt. That's the
central lesson of the pattern: schema docs are the artefact that determines quality, they
are written once by a human who understands the data, and they are the thing to improve
when accuracy stalls.

Zero rows deserves the extra emphasis. An empty result is ambiguous between "the answer is
none" and "the query was wrong", and a narration call handed no rows will confidently report
the former. Branch on it before generating anything.

## The safer variant: don't generate SQL at all

Arbitrary SQL is the maximally expressive option and the maximally risky one. The
alternative is to expose a **semantic layer** — a fixed set of parameterised views, metrics,
or narrow tools (`revenue_by_period(start, end, group_by)`) — and let the model choose among
them and fill in arguments.

| | Generated SQL | Semantic layer |
| --- | --- | --- |
| Question coverage | Anything expressible | Only what you modelled |
| Correctness of definitions | Model re-derives each time | Defined once, centrally |
| Surface to secure | The whole query language | A handful of typed arguments |
| Cost to extend | Zero | An engineering task per metric |

Pick by how contested the definitions are. Where "active user" or "net revenue" has one
agreed definition that must not drift, a semantic layer is straightforwardly better —
the number matches the dashboard because it comes from the same place. Where the value is
open-ended exploration over a well-understood schema, generated SQL earns its risk. The
narrow tools also line up with the granularity guidance in **Tools, MCP & Extending
Agents**: anything you need to gate, audit or display belongs in a dedicated tool.

## Evaluating it

Do not score generated SQL by string comparison against a reference query — there are many
correct spellings of the same query. **Execution accuracy** is the metric that means
something: run the generated query and the reference query, and compare the result sets.

Build the test set from real questions, in tiers — a lookup, a filter, an aggregate, a
two-table join, a multi-hop join, something requiring a date window — because the accuracy
curve falls off a cliff at join depth and an average over easy questions hides it. Track
retrieval separately from generation, exactly as in **Evaluating a RAG System**: table
recall answers "did it have what it needed", execution accuracy answers "did it use it".
The public benchmarks (Spider, and BIRD for messier realistic schemas) are useful for
calibrating expectations, but your schema and your questions are the evaluation that
decides whether to ship.

## What to take away

- Structured data is retrieved too — the corpus is schema documentation, not content.
- A missed table guarantees a wrong query, so tune retrieval for recall and measure table recall directly.
- Get the query through a tool call, not free text, and name the SQL dialect.
- Keep generation and narration as two calls, and show the SQL, rows, and retrieved tables behind every answer.
- Most quality problems are fixed in the table docs — grain, canonical columns, real value domains, foreign keys.
- Treat zero rows as a distinct branch; it is not the same as an answer of "none".
- Where metric definitions matter more than coverage, a semantic layer of parameterised tools beats arbitrary SQL.
- Evaluate by execution accuracy on a tiered set of real questions, never by string match.

## References

- Yu et al., [*Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL*](https://arxiv.org/abs/1809.08887) (2018) — and the [benchmark site](https://yale-lily.github.io/spider)
- Li et al., [*Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs*](https://arxiv.org/abs/2305.03111) (BIRD, 2023) — [benchmark site](https://bird-bench.github.io/), and the source of the "dirty schemas are the hard part" result
- Rajkumar et al., [*Evaluating the Text-to-SQL Capabilities of Large Language Models*](https://arxiv.org/abs/2204.00498) (2022) — prompt and schema-representation effects
- [PostgreSQL — `EXPLAIN`](https://www.postgresql.org/docs/current/sql-explain.html), for checking what a generated query will actually do before it runs
- [dbt — semantic models](https://docs.getdbt.com/docs/build/semantic-models) — one concrete implementation of the semantic-layer alternative
