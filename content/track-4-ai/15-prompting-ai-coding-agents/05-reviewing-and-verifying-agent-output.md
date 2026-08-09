---
title: "Reviewing & Verifying Agent Output"
description: "Tests as the contract, reading diffs nobody wrote by hand, and the team practices that keep velocity from becoming debt."
track: 4
chapter: 15
page: 5
readMinutes: 5
---

:::info[Prerequisites]
**How Coding Agents Work** — particularly that agents self-correct when a feedback signal
exists.
:::

## Verification is the constraint now

If generating a 400-line change takes ninety seconds and reviewing it properly takes forty
minutes, the bottleneck has moved. Every practice on this page follows from that one
observation: the work is no longer producing code, it's establishing that the code is
right, fast enough for the speed at which it now arrives.

Two responses are available. **Automate what can be checked mechanically**, so review time
goes to what can't. And **structure the work so review is cheap** — small diffs, clear
scope, stated intent.

## Tests are the contract

Automated verification does two jobs in an agent workflow, and the second is the one that
changes outcomes.

The first is obvious: tests catch defects. The second is that **tests give the agent a
feedback signal it can act on without you**. An agent that can run the suite iterates
against ground truth — write, run, read the failure, fix — and arrives at working code on
its own. An agent that cannot is producing code it has no way to check, and the first
verification happens in your review.

That difference is large enough to reorder priorities. The highest-value setup work for
agent-assisted development is making the test suite fast, reliable, and runnable in one
command. A flaky suite is worse than a slow one: the agent reads a spurious failure as
real and "fixes" working code.

Practical patterns:

- **Put the verification command in the task.** "Change is complete when `npm test` and `npm run typecheck` both pass" turns a vague request into a checkable one.
- **Write the test first, then the implementation.** A failing test is the most precise specification available, and reviewing "does this test describe the behaviour I want?" is far cheaper than reviewing an implementation.
- **Be sceptical of tests the agent wrote alongside the code.** They can encode the same misunderstanding as the implementation — passing tautologically, mocking away the thing under test, or asserting the behaviour that exists rather than the behaviour that's wanted. Read the assertions, not the pass count.
- **Type checkers and linters are cheap signals.** They catch a real class of hallucinated API misuse before a human reads anything.

## Reading a diff nobody wrote

Reviewing agent output differs from reviewing a colleague's pull request in one important
way: you can't lean on the author's understanding. A human's code is backed by a mental
model you can interrogate. There's no equivalent here — plausibility is the default output,
and the failure mode is code that looks exactly like correct code.

What to concentrate on:

| Priority | What you're looking for |
| --- | --- |
| Does it do what was asked? | Scope creep, missing requirements, a different problem solved well |
| Boundaries and edge cases | Empty input, nulls, concurrency, error paths — where confident-looking code is thin |
| Invented surface area | APIs, options, and config keys that don't exist. Check unfamiliar calls against docs |
| Security-relevant paths | Auth checks, input validation, injection, secrets. Never skim these |
| Fit with the codebase | Duplicated helpers, a second pattern for something already solved |
| Deletions | Removed tests, removed validation, removed error handling — easily missed in a large diff |

That last row deserves its own emphasis: in a big diff, additions get read and deletions
get skipped. "Made the test pass by weakening the assertion" is a real and recurring
pattern.

**Ask for an explanation when a change is unclear.** Having the agent walk through why a
change works is fast and often surfaces the flaw — either in the code or in your reading of
it. Just don't treat the explanation as evidence: models produce plausible justifications
for incorrect code as readily as for correct code. The explanation is a hypothesis to check
against the diff, not a verification of it.

**If you don't understand it, don't merge it.** The most reliable rule available. Code
nobody understands is unmaintainable regardless of who or what wrote it, and the incident
where it matters will not be a good time to start reading.

## Keeping diffs reviewable

Since review is the constraint, optimise the work for it:

- **Small, scoped tasks.** Three 100-line changes reviewed properly beat one 300-line change skimmed.
- **Separate mechanical from semantic.** A rename touching 40 files and a logic change should not share a commit. Mechanical changes are verified by their nature; semantic ones need reading.
- **Commit before starting.** A clean tree makes `git diff` the exact record of what the agent did.
- **Review incrementally.** Checking after each meaningful step catches a wrong direction while it's cheap to redirect.

## Security specifics

Some risks are particular to generated code rather than general.

- **Package hallucination.** Models suggest plausible package names that don't exist — and attackers register those names, so an install of a hallucinated dependency can fetch real malicious code. Verify that every new dependency exists, is the one intended, and is maintained.
- **Training-data-era patterns.** Models reproduce idioms common in their training data, including deprecated crypto, outdated auth flows, and vulnerable snippets that were widely copied. Recency is not implied by fluency.
- **Secrets in generated code.** Hardcoded keys and example credentials appear in output because they appear in training data. Run secret scanning in CI.
- **Licence provenance.** Generated code can closely resemble training examples. If licence hygiene matters to your organisation, that's a policy question worth settling deliberately rather than discovering later.
- **Untrusted input reaching an agent.** Covered in **Tools, MCP & Extending Agents**, and it belongs on the review checklist too: does this change give an agent a new way to read attacker-controlled text, or a new capability to misuse?

Standard tooling helps more than it might seem — SAST, dependency scanning, and secret
detection are all cheap, mechanical checks that scale with generation speed in a way human
review does not.

## Team practices

The individual habits above don't hold up unless the team agrees on a few things:

- **Disclose it.** Note in the pull request that a change was substantially agent-generated. Reviewers calibrate differently, and they should be able to.
- **Agree where autonomy stops.** Most teams land somewhere like: freely for tests, docs, boilerplate, and refactors; with careful review for business logic; with heightened scrutiny for auth, payments, migrations, and infrastructure.
- **Keep the conventions file current.** It is shared infrastructure — the highest-leverage document in the repository for agent-assisted work, and the one most likely to go stale.
- **Watch for skill atrophy.** Juniors who never debug by hand don't develop the model that makes review possible. Deliberate practice without the agent is a real thing to protect.
- **Review the process, not just the diffs.** If a category of task consistently produces bad output, that's a conventions or tooling gap, not a run of bad luck.

## What to take away

- Verification is the bottleneck. Automate what's mechanical so human review goes to what isn't.
- A fast, reliable, one-command test suite is the highest-leverage investment — it's the agent's feedback signal, not just yours.
- Read agent-written tests for what they assert, not whether they pass.
- Focus review on requirements, edge cases, invented APIs, security paths, and deletions.
- Ask for explanations to find flaws, but never accept one as proof.
- Don't merge what you don't understand — and verify every new dependency actually exists.

## References

- [OWASP — Top 10 for LLM Applications / GenAI](https://genai.owasp.org/llm-top-10/) — insecure output handling and supply-chain risk
- Perry et al., [*Do Users Write More Insecure Code with AI Assistants?*](https://arxiv.org/abs/2211.03622) (2022)
- Spracklen et al., [*We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs*](https://arxiv.org/abs/2406.10279) (2024)
- Jimenez et al., [*SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770) (2023)
- [NIST Secure Software Development Framework (SP 800-218)](https://csrc.nist.gov/pubs/sp/800/218/final) · [SSDF community profile for generative AI (SP 800-218A)](https://csrc.nist.gov/pubs/sp/800/218/a/final)
