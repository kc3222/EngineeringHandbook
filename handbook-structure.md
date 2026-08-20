# Engineering Handbook — Structure Reference

**Status:** Draft outline (not yet written)
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

**05 · REST API Design**
Resources, versioning, error contracts — the decisions that outlive the framework you build them in.
*5 pages*

**06 · Spring Boot & Kotlin**
JVM backend patterns — dependency injection, layered architecture, and where Spring's magic helps or hurts.
*6 pages*

**07 · FastAPI & Python Services**
Fast, typed, async — building inference and CRUD endpoints in Python without the ceremony.
*5 pages*

**08 · Authentication & Authorization**
OAuth 2.0 flows and role-based access — who's allowed to do what, and how you prove it.
*5 pages*

---

## Track III — Data & Storage

**09 · Relational Schema Design**
PostgreSQL modeling, normalization, and the migrations that come back to bite you later.
*5 pages*

**10 · Row-Level Security & Access Control**
Enforcing "who sees what" at the database layer instead of hoping the app layer remembers to.
*3 pages*

**11 · Object Storage & Microservices**
Cloud storage integration patterns — object storage, upload pipelines, and decoupling storage from your core service.
*4 pages*

---

## Track IV — AI Engineering

**12 · LLM Fundamentals**
What the model actually is, what it costs, and what it can't do.
*8 pages*

**13 · Embeddings & Vector Search**
Turning meaning into geometry, then searching that geometry fast enough to matter.
*6 pages*

**14 · RAG Pipelines**
Retrieval-augmented generation end to end — the system most people build and most people undersell.
*9 pages*

**15 · Prompting & AI Coding Agents**
Working with AI coding agents as engineering tools, not novelties.
*5 pages*

---

## Track V — ML / DL & Applied Research

**16 · PyTorch & Model Training Basics**
Tensors, autograd, training loops — the fundamentals under every deep learning project.
*6 pages*

**17 · Computer Vision Fundamentals**
Classification and detection basics — architectures, transfer learning, and where CV models tend to fail.
*6 pages*

**18 · Self-Supervised Learning**
Pretraining without labels — foundation model concepts and why they matter.
*5 pages*

**19 · Competitive ML (Kaggle Playbook)**
What actually moves you into the top ranks: validation discipline, ensembling, and avoiding leaderboard traps.
*4 pages*

---

## Track VI — Cloud, DevOps & Observability

**20 · Containers & Deployment**
Docker, cloud compute, and getting from "works on my machine" to a repeatable environment.
*5 pages*

**21 · Event-Driven Systems (Kafka)**
Producers, consumers, and triggering async workflows like notifications and background jobs.
*4 pages*

**22 · Monitoring & Incident Response**
Observability tooling, alerting, and what actually happens during on-call.
*4 pages*

---

## Open Items

- [ ] Decide on content file format/schema for the future database (markdown? structured JSON? MDX?)
- [ ] Decide whether a synthesis/system-design track gets added back later with generic (non-personal) examples
- [ ] Design exercise/quiz format once ready to add
- [ ] Confirm final page counts once drafting begins (the outline's original ~99-page estimate; drafting landed at 115)
