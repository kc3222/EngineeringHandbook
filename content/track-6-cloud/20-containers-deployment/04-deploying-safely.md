---
title: "Deploying Safely"
description: "Build once and promote by digest, infrastructure as code, release strategies, schema migrations, and why rollback is the first move."
track: 6
chapter: 20
page: 4
readMinutes: 5
---

## Build once, promote everywhere

The rule underneath every good pipeline: **the artifact that reaches production is
bit-for-bit the artifact that passed the tests.** One build, promoted through
environments by digest, with configuration supplied at each stage.

The anti-pattern is rebuilding per environment — a `staging` build and a `prod`
build from the same commit. They are not the same image. Base image tags move,
transitive dependencies resolve differently, and the thing you tested is not the thing
you shipped. If that sounds unlikely, it is exactly how a passing staging suite ships a
broken production release, and the failure is unreproducible by construction.

So a pipeline looks like: build and tag by commit SHA → run tests against that image →
push to a registry → deploy `myapp@sha256:9c1f…` to staging → deploy *the same digest*
to production. Environments differ by injected config and nothing else.

## Infrastructure as code

The same argument applies one level down. A load balancer configured by clicking
through a console is a system whose current state exists only in the console, whose
history exists nowhere, and whose recreation after an incident is an archaeology
exercise.

Declarative tooling — Terraform, OpenTofu, Pulumi, CloudFormation, or Kubernetes
manifests for the workload layer — makes infrastructure reviewable, diffable and
recreatable. Points that turn out to matter in practice:

- **State is the hard part.** Terraform's state file is the mapping from your code to real resources; it belongs in remote storage with locking, and it frequently contains secrets in plaintext.
- **Plan output is the review artifact.** "This changes a security group rule" is a code review; "this will destroy and recreate the database" is a different conversation, and the plan is where you find out which one you're having.
- **Drift is inevitable** — someone will fix something by hand at 3 a.m. Detect it deliberately rather than discovering it when the next apply reverts an emergency fix.
- **Don't split the workload across paradigms.** Managing pods with Terraform and infrastructure with `kubectl` produces two half-truths; keep the boundary clean.

## Credentials in a pipeline

Long-lived cloud access keys stored as CI secrets are the most common way a pipeline
becomes the weakest link — they don't expire, they're readable by every job, and they
grant standing access from anywhere. The current answer is **OIDC federation**: the CI
provider issues a short-lived signed token describing the repository, branch and
workflow, and the cloud provider exchanges it for temporary credentials scoped by a
trust policy. No secret is stored, and access can be conditioned on the branch.

Whatever the mechanism, deployment credentials should be scoped to the environment
they deploy, and production should require something a pull request cannot grant
itself.

## Release strategies

Deployment is not release. Getting new code onto servers and exposing new behaviour to
users are separable decisions, and separating them is most of what makes releases
boring.

| Strategy | Mechanism | Cost | Suits |
| --- | --- | --- | --- |
| **Recreate** | Stop all old, start all new | Downtime | Batch jobs, single-instance internal tools |
| **Rolling** | Replace instances in batches | Both versions live simultaneously | The sane default for stateless services |
| **Blue/green** | Full parallel environment, switch traffic, keep old warm | Double infrastructure during the window | Fast, complete rollback; risky releases |
| **Canary** | Route 1% → 10% → 100%, watching metrics | Needs traffic splitting and good telemetry | High-traffic services where a bad release is expensive |

Rolling is the default because it needs no extra infrastructure, but note what it
implies: **two versions of your code run at the same time**, against the same database,
for the duration. Every deploy is a compatibility test between adjacent versions
whether you designed for it or not.

**Feature flags** are the sharpest tool here, because they move the release decision out
of the deployment entirely. New code ships dark, gets enabled for internal users, then
a percentage, then everyone — and disabling it is a config change taking seconds
rather than a redeploy taking minutes. The tax is real: every flag is a branch in
production, combinations multiply, and flags that are never removed become permanent
untested code paths. Delete them on a schedule.

## Schema migrations, where rollback stops being easy

Rolling back code is cheap: redeploy the previous digest. Rolling back a migration
that dropped a column is not, because the data is gone. Which means **the migration
strategy determines whether you can roll back at all.**

The pattern is expand/contract, spread across releases:

1. **Expand.** Add the new column, nullable, with a default. Deploy. Old code ignores it; new code can use it.
2. **Migrate and dual-write.** Deploy code that writes both old and new; backfill existing rows in batches.
3. **Switch reads.** Deploy code that reads the new column. This is the release you can still roll back, because the old column is intact.
4. **Contract.** Once nothing reads the old column and you're confident, drop it — in a separate release, days later.

Every step is individually reversible, which is the entire point. The single-release
version of the same change — rename a column, deploy — breaks the moment a rolling
deploy has old and new code live at once, and breaks worse if you try to undo it.

Two operational notes. Long-running migrations should not block a deploy: run them as a
separate step, and batch anything that locks a large table (Track 3's **Migrations
Without Downtime** covers the locking specifics). And backfills belong in chunks with
progress you can observe, not one transaction that holds locks for forty minutes.

## When it goes wrong, roll back first

The instinct to diagnose before acting is the wrong order during an incident. If a
deploy correlates with the problem, revert it, restore service, then investigate from
the logs and traces at leisure. Rollback should be one command or one button, tested
often enough that nobody hesitates to use it — a rollback path that is only exercised
during emergencies is not a rollback path.

This is also the argument for small, frequent deploys. A release containing one change
has an obvious suspect; a release containing three weeks of work has forty. The
[DORA](https://dora.dev/) research is consistent on this point across a decade of data:
deployment frequency and change failure rate move together in the *helpful* direction —
teams that deploy more often break things less often, because each change is smaller
and the mechanism is well-rehearsed.

## What to take away

- One build, promoted by digest. Rebuilding per environment means testing something you didn't ship.
- Infrastructure belongs in version control; the plan diff is where dangerous changes become visible.
- Prefer OIDC-federated short-lived credentials over long-lived keys in CI secrets.
- Rolling deploys mean two code versions run concurrently — design changes to be compatible with their predecessor.
- Feature flags separate deploy from release, and need a deletion discipline to stay worth it.
- Expand/contract migrations keep every step reversible; a rename-and-deploy does not.
- Rollback is the first response to a bad release, not the last.

## References

- [DORA — Capabilities and the State of DevOps research](https://dora.dev/capabilities/) · [Four keys metrics](https://dora.dev/guides/dora-metrics-four-keys/)
- [Terraform — Documentation](https://developer.hashicorp.com/terraform/docs) · [OpenTofu](https://opentofu.org/docs/)
- [GitHub Actions — Security hardening with OpenID Connect](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers)
- [Kubernetes — Deployments and rolling updates](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- [Martin Fowler — Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) · [Blue/green deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [NIST SP 800-218 — Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
