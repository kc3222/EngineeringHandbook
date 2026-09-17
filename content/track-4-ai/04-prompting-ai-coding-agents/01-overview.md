---
title: "Prompting & AI Coding Agents"
description: "Working with AI coding agents as engineering tools, not novelties."
track: 4
chapter: 4
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**LLM Fundamentals** — context windows, sampling, and hallucination. **RAG Pipelines** is
useful background: an agent is what happens when retrieval stops being a fixed pipeline
step and becomes a decision the model makes.
:::

## Why this chapter exists

An autocomplete suggestion and an agent that edits twelve files, runs the test suite, and
opens a pull request are the same underlying model doing very different jobs. The
difference is the **harness** around it: tools it can call, an environment it can act in,
and a loop that keeps going until the task is done.

That shift changes what the engineering problem is. With autocomplete, you evaluate a
suggestion and accept or reject it. With an agent, you are specifying work, granting
capabilities, and reviewing output produced without you watching — which is much closer to
delegating than to typing.

Two claims frame everything in this chapter, and they pull in opposite directions:

- **The models are genuinely capable.** On benchmarks built from real GitHub issues, current models resolve a large fraction of tasks end to end. Treating them as toys is a mistake.
- **The bottleneck has moved to verification.** Generating plausible code is cheap; knowing whether it's correct is not. A system that produces changes faster than you can review them has moved your constraint, not removed it.

## What actually changes about the job

| Traditional | With a coding agent |
| --- | --- |
| Writing the code is the slow part | Specifying and verifying are the slow parts |
| You read code you wrote | You read code nobody wrote by hand |
| Tests prove your understanding was right | Tests are the primary evidence anything is right |
| Context lives in your head | Context has to be written down where the agent reads it |

The last row is the one teams underestimate. An agent has no memory of yesterday's
decision, no sense of which module is fragile, and no idea that the "obvious" fix was
tried and reverted. Whatever a new colleague would need to know has to exist as text —
which is why repositories that were already well documented get better results from
agents, and why writing that documentation is one of the higher-leverage things you can
do.

## What's in here

| Page | What it covers |
| --- | --- |
| Prompting for Code | Specification, context selection, constraints, and how to iterate when the first attempt is wrong |
| How Coding Agents Work | The agent loop, context management, permissions, and why agents fail the way they do |
| Tools, MCP & Extending Agents | Designing tools a model can use well, and the protocol for sharing them |
| Reviewing & Verifying Agent Output | Tests as the contract, review at speed, security, and team practices |

## An honest framing

Two failure modes bracket this technology, and both are expensive.

**Dismissal** — "it writes bad code" — was accurate about earlier models and is now
mostly a statement about how the tool is being used. Given a clear task, relevant context,
and a way to check its work, an agent is very effective at exactly the work that consumes
most engineering time: boilerplate, refactors, test coverage, migrations, and finding the
line that broke something.

**Over-delegation** — accepting changes you haven't understood because they pass — is the
one that produces real incidents. Code that works today and that no one on the team
understands is a liability that comes due later, and the agent will not be around to
explain it.

The useful position is the boring one: an agent is a fast, tireless, occasionally
confidently wrong collaborator, and you are accountable for what it produces. Everything
in this chapter follows from taking that seriously.

## Where this connects

Backwards, **LLM Fundamentals** explains why an agent hallucinates a plausible API that
doesn't exist. **RAG Pipelines** is the same retrieval problem this chapter solves
differently — a fixed pipeline versus a model deciding when to search.

Forwards, **Model Context Protocol (MCP)** takes the protocol introduced in *Tools, MCP &
Extending Agents* and covers it in full: architecture, primitives, transports, and
security.

Across the handbook, Track 1's **Frontend Testing** and the testing material throughout
Track 2 matter more here than they look: automated verification is what makes agent output
safe to accept at speed. Track 6's **Containers & Deployment** covers the sandboxing an
agent with shell access should be running inside.

## References

- Jimenez et al., [*SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770) (2023) — the standard benchmark for agentic coding
- Anthropic, [*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents) (2024) — workflows versus agents, and when the extra machinery is warranted
