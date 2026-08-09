---
title: "Prompting for Code"
description: "Specification over instruction, choosing what context to supply, stating constraints, and what to do when the first attempt is wrong."
track: 4
chapter: 15
page: 2
readMinutes: 5
---

:::info[Prerequisites]
**Prompt Engineering** in LLM Fundamentals covers the general techniques. This page is
about the parts specific to code.
:::

## Specify the outcome, not the keystrokes

The difference between a prompt that works and one that doesn't is almost never phrasing.
It's whether the request contains enough information for the task to have a right answer.

```text
❌  "add caching to the user service"

✅  "Add an in-memory cache to UserService.getById in
    src/services/user.ts. Cache for 60 seconds, keyed by user id.
    Invalidate the entry in update() and delete(). Don't add a
    dependency — a Map plus timestamps is fine. Update the existing
    tests in user.test.ts to cover a hit, a miss, and invalidation
    after update."
```

The second version isn't longer for its own sake. Every added clause removes a decision
the model would otherwise have made by guessing: which cache, what TTL, keyed how,
invalidated where, and whether pulling in Redis was acceptable. Underspecified prompts
don't produce refusals — they produce confident choices you didn't want, and you find out
in review.

A useful test: **could a competent engineer who has never seen this codebase implement
this from your description alone?** If not, the missing information is what to add. What
tends to be missing, in order of frequency:

1. **The file.** "The user service" is ambiguous in most repositories; a path is not.
2. **The boundary.** What may change, and explicitly what may not.
3. **The definition of done.** Which tests pass, what the output looks like.
4. **The constraints.** Dependencies, patterns to follow, performance requirements.

## Context selection is the actual skill

A model's answer is a function of what's in its context. When it invents a helper that
doesn't exist or ignores a convention used everywhere else in the repo, the usual cause is
that the relevant code was never in front of it.

Modern agents read files themselves, which changes the job from *pasting context* to
*pointing at it*:

- **Name the files.** "Follow the pattern in `src/services/order.ts`" is worth more than three paragraphs describing the pattern.
- **Supply the contract, not the implementation.** Type definitions, interfaces, and schemas are dense in exactly the information the model needs.
- **Paste real errors verbatim** — full stack trace, not a paraphrase. Line numbers and frame names are the most useful tokens in the whole prompt.
- **Point at the test.** A failing test defines correct behaviour more precisely than prose can.
- **Say what you already ruled out.** Without it, you'll be offered it.

There is a ceiling on this. Filling the context window with the whole repository makes
results *worse*, not better — the "lost in the middle" effect from **Context Assembly &
Generation** applies identically here. Curated, relevant context beats exhaustive context
every time.

## Constraints and conventions

Models default to the most common pattern in their training data, which is frequently not
the pattern in your codebase. Stating conventions explicitly is cheaper than correcting
them afterwards:

```text
- TypeScript strict mode; no `any`.
- Result types for expected failures; exceptions only for bugs.
- Tests with Vitest, colocated as *.test.ts.
- No new dependencies without asking.
```

The scalable version of this is a **repository conventions file** — `CONTRIBUTING.md`, or
one of the agent-specific files various tools read automatically. Written once, it applies
to every session, and it's the single highest-leverage artefact for getting consistent
results from an agent. Keep it short and specific: build and test commands, architectural
constraints, conventions that differ from the language default, and directories that are
generated or off-limits. A conventions file that reads like a style guide gets skimmed; one
that reads like a runbook gets followed.

Two more constraints worth stating almost every time:

- **Scope.** "Change only `src/auth/`" prevents the helpful refactor of four unrelated modules that makes the diff unreviewable.
- **Minimalism.** Models tend to add defensive error handling, abstraction layers, and configuration for cases that can't occur. "Make the smallest change that satisfies the requirement" is a genuinely effective instruction.

## Iterating when it's wrong

The first attempt being wrong is normal and not informative on its own. What matters is
how you respond.

**Say what's wrong, not that it's wrong.** "That's not right, try again" gives the model
nothing; it will produce a different wrong answer. "The cache isn't invalidated on
`delete()` — the entry survives and the next read returns stale data" identifies the
defect, and the fix usually lands immediately.

**Feed back real output.** The error message, the failing assertion, the actual versus
expected values. This is the highest-signal correction available and it costs nothing.

**Restart rather than patch, past two or three failed attempts.** A conversation that has
accumulated wrong turns keeps that wrongness in context and tends to keep circling it.
Beginning again with everything you've learned — including "the obvious approach doesn't
work because X" — usually resolves in one step what three more corrections wouldn't.

**Split the task.** Repeated failure is often a signal that the request bundles several
decisions. Ask for the design first, agree on it, then ask for the implementation.

## Asking for a plan first

For anything non-trivial, the highest-value habit is separating design from implementation:

```text
Before writing code: describe how you'd add optimistic locking to
the orders table. Which files change, what the migration looks like,
how conflicts surface to the API. Don't write the implementation yet.
```

Reviewing a plan is fast and catches misunderstandings while they cost nothing.
Reviewing a 600-line diff built on a misunderstanding is slow and catches them after
you've read all of it. The ratio strongly favours the plan.

This is also the cheapest way to discover that *you* hadn't decided something — which
happens more often than the alternative.

## Things worth not doing

- **Don't ask for code you can't evaluate.** If you couldn't tell a correct implementation from a subtly broken one, generating it faster doesn't help. Ask for an explanation first.
- **Don't accept an unfamiliar API on faith.** Method names, parameters, and library versions are exactly what models fabricate most fluently. Check the documentation.
- **Don't paste secrets.** API keys, credentials, and customer data in a prompt are data you've handed to a third party and, potentially, to a log.
- **Don't trust confidence.** Fluency correlates with training-data frequency, not correctness. An obscure library gets the same self-assured tone as a ubiquitous one.

## What to take away

- Specify until a competent stranger could implement it: file, boundary, definition of done, constraints.
- Point at context rather than pasting everything — curated beats exhaustive, and exhaustive actively hurts.
- Put conventions in a repository file so they apply to every session instead of every prompt.
- Correct with specifics and real output; after two or three failures, restart with what you learned rather than patching the conversation.
- Ask for a plan before an implementation on anything non-trivial. It's the cheapest review you'll ever do.

## References

- [Anthropic — prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) · [OpenAI — prompt engineering guide](https://platform.openai.com/docs/guides/prompt-engineering)
- Liu et al., [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172) (2023)
- Anthropic, [*Claude Code best practices*](https://www.anthropic.com/engineering/claude-code-best-practices) (2025) — conventions files, planning, and iteration patterns
