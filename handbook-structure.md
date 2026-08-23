# Engineering Handbook — Structure Reference

**Status:** Written out — 160 pages across 29 chapters and seven tracks
**Format:** TBD — will eventually back a website via a database of content files
**Depth:** Each page = 1–5 min read; diagrams and code snippets encouraged
**Audience:** General public / general reference (no personal case studies)
**Exercises/quizzes:** Not included yet — planned for a later phase

---

## Track I — Frontend Engineering

**01 · React Fundamentals**
Components, state, and the render cycle — the mental model everything else in the frontend chapters assumes you already have.
*6 pages*

**02 · Next.js & Rendering Strategies**
SSR, SSG, ISR, and the App Router — same framework, four very different tradeoffs.
*6 pages*

**03 · TailwindCSS & Component Design**
Utility-first styling and building interfaces from design specs without fighting the framework.
*4 pages*

**04 · Frontend Testing (Jest)**
Unit and integration tests for UI — what's actually worth testing versus what's theater.
*4 pages*

---

## Track II — Backend Engineering

**01 · REST API Design**
Resources, versioning, error contracts — the decisions that outlive the framework you build them in.
*5 pages*

**02 · Spring Boot & Kotlin**
JVM backend patterns — dependency injection, layered architecture, and where Spring's magic helps or hurts.
*6 pages*

**03 · FastAPI & Python Services**
Fast, typed, async — building inference and CRUD endpoints in Python without the ceremony.
*5 pages*

**04 · Authentication & Authorization**
OAuth 2.0 flows and role-based access — who's allowed to do what, and how you prove it.
*5 pages*

---

## Track III — Data & Storage

**01 · Relational Schema Design**
PostgreSQL modeling, normalization, and the migrations that come back to bite you later.
*5 pages*

**02 · Row-Level Security & Access Control**
Enforcing "who sees what" at the database layer instead of hoping the app layer remembers to.
*3 pages*

**03 · Object Storage & Microservices**
Cloud storage integration patterns — object storage, upload pipelines, and decoupling storage from your core service.
*4 pages*

---

## Track IV — AI Engineering

**01 · LLM Fundamentals**
What the model actually is, what it costs, and what it can't do.
*8 pages*

**02 · Embeddings & Vector Search**
Turning meaning into geometry, then searching that geometry fast enough to matter.
*6 pages*

**03 · RAG Pipelines**
Retrieval-augmented generation end to end — the system most people build and most people undersell.
*9 pages*

**04 · Prompting & AI Coding Agents**
Working with AI coding agents as engineering tools, not novelties.
*5 pages*

---

## Track V — ML / DL & Applied Research

**01 · PyTorch & Model Training Basics**
Tensors, autograd, training loops — the fundamentals under every deep learning project.
*6 pages*

**02 · Computer Vision Fundamentals**
Classification and detection basics — architectures, transfer learning, and where CV models tend to fail.
*6 pages*

**03 · Self-Supervised Learning**
Pretraining without labels — foundation model concepts and why they matter.
*5 pages*

**04 · Competitive ML (Kaggle Playbook)**
What actually moves you into the top ranks: validation discipline, ensembling, and avoiding leaderboard traps.
*4 pages*

---

## Track VI — Cloud, DevOps & Observability

**01 · Containers & Deployment**
Docker, cloud compute, and getting from "works on my machine" to a repeatable environment.
*5 pages*

**02 · Event-Driven Systems (Kafka)**
Producers, consumers, and triggering async workflows like notifications and background jobs.
*4 pages*

**03 · Monitoring & Incident Response**
Observability tooling, alerting, and what actually happens during on-call.
*4 pages*

---

## Track VII — Data Structures & Algorithms

**01 · Complexity & Performance Analysis**
Big-O as a decision tool rather than a grading rubric — how to read a constraint and know what will fit.
*5 pages*

**02 · Core Data Structures**
Arrays, hash maps, stacks, queues, heaps and union-find — what each one is actually good at and what it quietly costs you.
*8 pages*

**03 · Bit Manipulation**
What an integer actually is in memory, the handful of operators that act on it directly, and the cases where that view is the simplest one available.
*7 pages*

**04 · Trees & Graph Traversal**
BFS, DFS, and the recursive shapes that show up once you stop seeing trees and graphs as different things.
*7 pages*

**05 · Algorithmic Patterns**
Two pointers, sliding windows, binary search on the answer, monotonic stacks and prefix sums — the handful of moves that cover most problems.
*7 pages*

**06 · Dynamic Programming**
Recognizing overlapping subproblems, and the mechanical path from a recursive definition to a tabulated solution.
*6 pages*

**07 · Interview Patterns: Amazon**
Reported interview problems reframed as instances of patterns taught earlier in the track — the mapping, not the list.
*5 pages*

Every Track VII chapter except 07 closes with a **worked-examples page**: two to four problems in
original prose, each with a collapsible `<details>` solution (approach → code → complexity →
one follow-up). Chapter-level failure modes live at the end of that page where the chapter
has them.

---

## Open Items

- [ ] Decide on content file format/schema for the future database (markdown? structured JSON? MDX?)
- [ ] Decide whether a synthesis/system-design track gets added back later with generic (non-personal) examples
- [ ] Design exercise/quiz format once ready to add
- [ ] Confirm final page counts once drafting begins (the outline's original ~99-page estimate; drafting landed at 160 across seven tracks)
- [ ] Track VII decisions still open: whether sorting algorithms get a page (leaning no), whether concurrency-adjacent structures belong here or in Track VI, and whether other companies get chapters parallel to VII·07 (which would argue for making it its own track)
- [ ] Track VII chapter 07 (Interview Patterns: Amazon) is company-specific and dated "reported as of August 2026" on its intro page. Set a review cadence, or fold it into a generic pattern-recognition chapter once the reports go stale
