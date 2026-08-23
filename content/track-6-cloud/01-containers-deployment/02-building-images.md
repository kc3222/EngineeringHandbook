---
title: "Building Images"
description: "Layers, digests, the build cache, multi-stage builds, and the difference between an image that builds and one you'd want to ship."
track: 6
chapter: 1
page: 2
readMinutes: 5
---

## An image is a stack of tarballs plus a JSON file

Stripped of tooling, an [OCI image](https://github.com/opencontainers/image-spec) is:

- an ordered list of **layers**, each a compressed archive of filesystem changes,
- a **config** object holding the default command, environment, user, working directory and exposed ports,
- a **manifest** listing the above, referenced by the SHA-256 digest of its contents.

Two properties follow from that, and both matter more than they first appear.

**Layers are additive only.** A later layer can mark a file as deleted, but it cannot
remove the bytes from the earlier layer. `RUN curl ... && rm secret.key` leaves the key
in the image, retrievable by anyone who pulls it. Deleting something in a subsequent
instruction hides it from the running filesystem and from nothing else.

**Digests are the real identity.** `myapp:latest` is a mutable pointer; the digest
`sha256:9c1f…` is not. Anything that has to be reproducible — a deployment manifest, a
base image reference in a Dockerfile, a rollback target — should name the digest. Tags
are for humans, digests are for machines.

## The build cache, and writing a Dockerfile around it

Each instruction produces a layer, and the builder reuses a cached layer only if that
instruction *and every instruction before it* are unchanged. Change one line near the
top and everything below it rebuilds. So the ordering rule is: **least-frequently-changed
first, most-frequently-changed last** — and your source code changes on every commit.

The specific move is to copy the dependency manifest, install, and only then copy the
source:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
```

`COPY . .` before the install would invalidate the install on every code change and
turn a two-second rebuild into a two-minute one. The `--mount=type=cache` flag keeps
the package manager's download cache across builds without putting it in a layer — a
[BuildKit](https://docs.docker.com/build/cache/optimize/) feature worth knowing for
any ecosystem with a slow cold fetch (npm, pip, Maven, Go modules, cargo).

A `.dockerignore` is not optional. Without one, `COPY . .` sends `node_modules`,
`.git`, `.env` and every local build artifact into the build context — slow, and a
common way secrets end up in images by accident.

## Multi-stage builds

A build toolchain is large, and almost none of it is needed at runtime. Multi-stage
builds let you compile in one image and copy only the output into another:

```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

The final image contains one binary and a CA certificate bundle. No compiler, no shell,
no package manager — so no `apt` CVEs to patch and nothing for an attacker to pivot
with if they get code execution. The same pattern applies to a JVM service (build with
the JDK, run on a JRE or a `jlink`-trimmed runtime) and to a frontend bundle (build with
Node, serve the static output from a web server image).

Secrets during the build get the same treatment as caches — `RUN --mount=type=secret`
exposes a file for the duration of one instruction without persisting it into a layer.
Passing a token as `ARG` does not: build args are recorded in the image config.

## Choosing a base image

| Base | Size | When it fits | Cost |
| --- | --- | --- | --- |
| `debian` / `ubuntu` | ~80–120 MB | You need a real userland, or native deps with awkward build requirements | Largest attack surface, most CVEs to triage |
| `-slim` variants | ~30–80 MB | Default for interpreted languages | Occasionally missing a library you then have to install |
| `alpine` | ~5–15 MB | Static binaries, simple services | musl, not glibc — subtle breakage in Python wheels, DNS resolution, and anything assuming glibc |
| [Distroless](https://github.com/GoogleContainerTools/distroless) | ~2–20 MB | Compiled languages and self-contained runtimes | No shell, so `docker exec` debugging needs a `:debug` variant |
| `scratch` | 0 | Fully static Go/Rust binaries | You supply CA certs, timezone data and `/etc/passwd` yourself |

Alpine deserves the specific warning because the failure is confusing rather than
loud: musl's allocator and DNS resolver behave differently under load, and Python
packages that ship manylinux wheels have to be compiled from source instead, which
turns a fast build into a slow one. Smaller is not automatically better.

Image size matters less than people assume for steady-state performance — layers are
cached on the node — and more than people assume for cold starts, autoscaling and CI
throughput, where the pull is on the critical path.

## Things that make an image production-grade

- **Run as a non-root user.** Add `USER` and mean it. Root in a container is root on the host if anything else goes wrong.
- **Pin the base by digest**, not just tag, when reproducibility matters: `FROM node:22-slim@sha256:…`.
- **Use the exec form** of `ENTRYPOINT`/`CMD` (`["/server"]`, not `/server`). The shell form wraps your process in `/bin/sh -c`, which becomes PID 1 and does not forward `SIGTERM` — the single most common cause of containers that ignore graceful shutdown.
- **One concern per image.** Not dogma about "one process" — a supervisor for a worker pool is fine — but an image bundling an app and its database is a development convenience, not a deployable unit.
- **Build for the right architecture.** `docker buildx build --platform linux/amd64,linux/arm64` produces a multi-arch manifest; an Apple Silicon laptop otherwise builds arm64 images that fail to start on x86 nodes.
- **Generate an SBOM and provenance.** BuildKit can attach both as attestations, and [SLSA](https://slsa.dev/) defines the levels of build integrity they support. This is how you answer "are we affected?" during a dependency CVE without guessing.

## What to take away

- Layers are additive: a deleted file is still in the image, so never write a secret into one.
- Digests identify images; tags are mutable labels. Deploy and roll back by digest.
- Order Dockerfile instructions from least to most frequently changed, and copy the dependency manifest before the source.
- Multi-stage builds keep the build toolchain out of the runtime image, which is a security win before it's a size win.
- Base image choice is a tradeoff, not a race to the smallest — Alpine's musl breaks things quietly.
- Use the exec form of `ENTRYPOINT`, or your process never receives `SIGTERM`.

## References

- [OCI Image Format Specification](https://github.com/opencontainers/image-spec)
- [Docker — Dockerfile reference](https://docs.docker.com/reference/dockerfile/) · [Build cache](https://docs.docker.com/build/cache/) · [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) · [Build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker — Building best practices](https://docs.docker.com/build/building/best-practices/)
- [SLSA — Supply-chain Levels for Software Artifacts](https://slsa.dev/spec/v1.0/levels) · [Sigstore documentation](https://docs.sigstore.dev/)
- [NIST SP 800-190 — Application Container Security Guide](https://csrc.nist.gov/pubs/sp/800/190/final)
