---
title: "Containers & Deployment"
description: "Docker, cloud compute, and getting from \"works on my machine\" to a repeatable environment."
track: 6
chapter: 20
page: 1
readMinutes: 3
---

:::info[Prerequisites]
None strictly. The services being packaged here are the ones built in Track 2, and
the storage they talk to comes from Track 3 — but this chapter is about the envelope
around an application, not the application.
:::

## Why this chapter exists

"Works on my machine" is not a joke about carelessness. It's an accurate description
of what happens when the thing you tested and the thing you shipped are assembled by
two different processes from two different sets of inputs. Your laptop has a Python
3.12 that came from Homebrew, an OpenSSL that came with it, a `LANG` set to UTF-8, and
a `~/.aws/credentials` file. The server has none of those, and nobody wrote down that
it needed them.

A container image closes that gap by making the environment an artifact: a file
system, a set of dependencies, and a command to run, all built once, stored under a
content hash, and executed unchanged everywhere afterwards. That's the whole idea, and
it's worth being precise about what it does and doesn't buy you.

**What it fixes:** the dependency graph inside the box. Same libc, same interpreter,
same shared libraries, same file layout, in dev and in production.

**What it doesn't fix:** everything outside the box. A container gets its
configuration, its credentials, its network neighbours, its CPU allowance and its disk
from the environment it lands in, and those differ between your laptop and production
by design. Most deployment bugs that survive containerisation live in exactly that
layer — a missing environment variable, a timeout that only fires under real latency, a
memory limit that only exists in the cluster.

## What a container actually is

Not a virtual machine. There is no guest kernel and no hardware emulation. A container
is an ordinary Linux process that the kernel has been asked to lie to: namespaces give
it a private view of the process tree, mounts, network interfaces and hostname; cgroups
cap what it can consume. The isolation is real but it is *kernel-level*, which is why
container escape is a meaningfully different security story from VM escape, and why
containers start in milliseconds while VMs start in tens of seconds.

The consequence that matters day to day: a container shares the host kernel, so
"Linux" is not optional. Docker Desktop on macOS or Windows runs a Linux VM
underneath — which is also why file I/O across a bind mount is slow there, and why an
image built on an Apple Silicon laptop is `arm64` unless you asked otherwise.

## What's in here

| Page | What it covers |
| --- | --- |
| Building Images | Layers, digests, the build cache, multi-stage builds, base image choice, and what not to bake in |
| Composing a Local Stack | Multi-service development environments, startup ordering that waits for readiness, seeding, and volumes |
| Where Containers Run | The runtime contract, health probes, graceful shutdown, resource limits, and the compute spectrum from VM to serverless |
| Deploying Safely | Build-once-promote-everywhere, infrastructure as code, release strategies, schema migrations, and rollback |

## Where this connects

Backwards: **FastAPI & Python Services** and **Spring Boot & Kotlin** in Track 2 end
where this chapter begins — the process exists, and now it has to run somewhere
repeatably. **Object Storage & Microservices** in Track 3 assumes the service boundary
this chapter operationalises.

Forwards: **Event-Driven Systems** is the other half of the deployment picture for
anything asynchronous, and **Monitoring & Incident Response** covers what you need in
place before the first deploy that goes wrong — which is the one after the deploy that
went fine.

## References

- [OCI Image Format Specification](https://github.com/opencontainers/image-spec) and [Runtime Specification](https://github.com/opencontainers/runtime-spec) — the vendor-neutral standards behind "container image" and "container runtime"
- [Docker — Documentation](https://docs.docker.com/) · [Kubernetes — Concepts](https://kubernetes.io/docs/concepts/)
- [The Twelve-Factor App](https://12factor.net/) — dated in places, still the clearest statement of the contract a deployable process should honour
- [Linux manual — `namespaces(7)`](https://man7.org/linux/man-pages/man7/namespaces.7.html) and [`cgroups(7)`](https://man7.org/linux/man-pages/man7/cgroups.7.html)
