---
title: "Composing a Local Stack"
description: "One command that brings up a service and everything it talks to — startup ordering that actually waits, seeding that actually runs, and where dev/prod parity stops being worth it."
track: 6
chapter: 1
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Building Images** — this page composes images into a system rather than building them.
:::

## The unit of development is the stack

A container fixes one process. Almost nothing is one process: a service needs a database,
usually a cache or a queue, sometimes an object store or a model server. If assembling
those is a README section with eleven manual steps, three things follow — onboarding takes
a day, every developer's environment drifts differently, and the test suite quietly grows a
dependency on whatever happens to be installed on the machine that runs it.

The goal is one command that produces a working system from nothing, and a second that
destroys it. **Docker Compose** is the standard way to get there: a declarative file
describing services, the network they share, and the storage they keep.

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set it in .env}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://app:${POSTGRES_PASSWORD}@db:5432/app
    ports:
      - "${API_PORT:-8000}:8000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

Two details in there do quiet work. Services address each other by **service name** — `db`
resolves on the shared network, so no container needs to know an IP or a host port. And the
`:?` on the password means a missing secret fails at `up` with a readable message instead of
producing a database with an unexpected password that fails much later.

## Startup order is the part that bites

`depends_on` in its short form waits for the dependency's container to *start*, which is not
the same as being ready to serve. A Postgres container is "started" within milliseconds and
accepting connections seconds later — and during its first run, later still, because it has
a database to initialise. The result is a stack that comes up fine on a warm machine and
fails on a cold one, which is precisely the environment a new developer has.

The fix is a health check plus a condition:

```yaml
  db:
    healthcheck:
      # Check over TCP: the official image's init phase runs a temporary
      # server with TCP disabled, so a socket check can pass too early.
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U app -d app"]
      interval: 2s
      timeout: 3s
      retries: 30
      start_period: 30s
```

Three conditions are available, and the third is the one people don't know exists:

| Condition | Waits for | Use for |
| --- | --- | --- |
| `service_started` | The container to start | Almost nothing; it's the default and it's rarely what you mean |
| `service_healthy` | Its health check to pass | Databases, brokers, anything with a warm-up |
| `service_completed_successfully` | A one-shot container to exit 0 | Migrations, seeding, model downloads |

That last one is what makes an initialisation job expressible. A fresh deployment has an
empty database and no downloaded artefacts; a `bootstrap` service that does the setup, exits,
and gates the app is the honest way to model it — and it's better than a shell loop in the
app's entrypoint, because a failure stops the stack instead of producing a running service
that doesn't work.

`start_period` deserves its own note: health check failures during that window don't count
toward `retries`, which is what lets you set a tight interval for the steady state without
a slow first start being treated as a failure.

One caveat that matters beyond your laptop: **none of this exists in production.** No
orchestrator guarantees your database is up before your service starts, and any of them can
restart a dependency underneath you at any time. Compose ordering is a convenience for the
local stack; the service still needs to retry its connections and fail its readiness probe
until they succeed. If the app only works because Compose ordered it correctly, it will
fail its first real deploy.

## Seeding, and the volume that remembers

Most database images run initialisation scripts **only against an empty data directory**.
This produces one of the most reliably confusing experiences in local development: you edit
the seed SQL, restart the stack, and nothing changes — because the volume already has a
database in it, so the scripts never ran.

The reset is explicit, and it's worth putting in the README next to the start command:

```bash
docker compose down -v && docker compose up -d
```

For anything that needs to run on *every* start, make it a bootstrap service and make it
**idempotent** — check whether the model is already pulled, whether the migration is already
applied, whether the index already has rows. Idempotence is what lets the same command serve
"set up from scratch" and "start again tomorrow", which is the property that makes people
actually use it.

## Volumes: what to mount and what not to

Bind mounts and named volumes look similar and behave differently, and the choice is usually
about which side's files should win.

- **Bind-mount the source directory** for hot reload. The host's files are the ones you're editing, so the host should win.
- **Use a named volume for installed dependencies** (`node_modules`, a virtualenv, a package cache). A bind mount would otherwise put host-built artefacts — possibly compiled for a different architecture — in front of the ones the image built. Symptoms are exotic: a native module that "isn't a valid ELF binary", or a binary that runs on the host and not in the container.
- **Don't mask build output directories.** Mounting a volume over `build/` or `dist/` makes the directory hard to remove from the host and turns a clean rebuild into a puzzle.
- **Named volumes for state you want to survive restarts** — database files, downloaded model weights — so that a restart is seconds rather than a re-download.

Two behaviours worth knowing because they explain most confusion here. A named volume
mounted over a directory that has content in the image is **populated from the image** the
first time it's created; a bind mount just hides whatever was there. And on macOS and
Windows, filesystem events don't propagate across a bind mount into the Linux VM, so file
watchers see nothing — hence the `--poll` / `usePolling` flags that dev servers carry.
Compose's `watch` mode is the newer alternative: it syncs changed files into the container
directly, and can rebuild when a dependency manifest changes.

## Parity, and where to stop

The value of the local stack is that it runs the **same image** you deploy. That's the
parity that matters, and it's what makes "works on my machine" a meaningful claim rather
than an ironic one. Compose is the *composition*, not the artefact.

What should stay identical: the image, the schema and migration path, the configuration
mechanism (environment variables, read at start), the service topology.

What legitimately differs — and pretending otherwise costs more than it saves:

| | Local | Production |
| --- | --- | --- |
| Secrets | `.env`, uncommitted | A secrets manager |
| TLS | Plain HTTP behind localhost | Terminated at the edge |
| Data | A seeded sample set | Real, with real volume |
| Scale | One replica | Several, behind a load balancer |
| Restarts | Manual | Orchestrated, with health probes |

And Compose is not a production orchestrator. It has no rescheduling, no rolling-update
semantics worth depending on, and no multi-host story. The moment you want zero-downtime
deploys or capacity that survives a host dying, that's **Where Containers Run** and
**Deploying Safely**, not a bigger Compose file.

Two conveniences that keep the file honest as it grows: **profiles**, so optional services
(a production-build container, a load generator, an observability stack) are declared but not
started by default; and **port variables** rather than hardcoded host ports, because
developers run other things — a native Postgres on 5432 is the single most common reason a
new developer's first `up` fails.

## What to take away

- One command up, one command down, from nothing — that's the deliverable, and idempotence is what makes it reusable.
- `depends_on` alone waits for *started*, not *ready*. Use health checks with `service_healthy`, and `service_completed_successfully` for one-shot setup jobs.
- Check database health over TCP; a socket check can pass during the image's initialisation phase.
- The app must still retry its dependencies — nothing orders services for you in production.
- Init scripts run only against an empty volume; document `down -v` as the reset.
- Named volumes for dependencies and state, bind mounts for source, and never mask build output.
- Keep the image identical to production and let secrets, TLS, data, and scale differ openly.
- Compose composes; it does not orchestrate. Zero-downtime and multi-host are a different tool.

## References

- [Compose file reference — services](https://docs.docker.com/reference/compose-file/services/), covering `depends_on` conditions and `healthcheck`
- [Docker — controlling startup order](https://docs.docker.com/compose/how-tos/startup-order/) · [profiles](https://docs.docker.com/compose/how-tos/profiles/)
- [Docker — volumes](https://docs.docker.com/engine/storage/volumes/) and [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) — including how a named volume is pre-populated from the image
- [Dockerfile reference — `HEALTHCHECK`](https://docs.docker.com/reference/dockerfile/)
- [The Twelve-Factor App — dev/prod parity](https://12factor.net/dev-prod-parity)
