---
title: "Spring Boot & Kotlin"
description: "JVM backend patterns — dependency injection, layered architecture, and where Spring's magic helps or hurts."
track: 2
chapter: 6
page: 1
readMinutes: 3
---

:::info[Prerequisites]
**REST API Design** — this chapter implements the contracts designed there.
:::

## Why this chapter exists

Spring Boot is the JVM's default answer to "build a backend service", and it is
unusually opinionated: it wires your objects together, configures your database
pool, starts your web server, and serialises your JSON — all without you writing
the code that does any of it.

That's the appeal and the difficulty in one sentence. The framework does an enormous
amount for you, and when it does something you didn't expect, the stack trace is 80
frames of Spring internals. The engineers who are productive in Spring aren't the
ones who memorised more annotations; they're the ones who know **what mechanism each
annotation triggers**.

`@SpringBootApplication` sets three things in motion: a **component scan** that finds
your beans, **auto-configuration** that configures whatever it finds on the classpath,
and the **application context** those two populate — the object graph the running
server dispatches requests into.

Nearly every hour lost to Spring is a question about one of those three: *why does it
think this is a bean*, *why did it configure that*, *why is this instance not the one
I expected*.

## Why Kotlin

Kotlin is a first-class Spring language — Spring Framework has shipped Kotlin
extensions and documentation
[since 5.0](https://spring.io/blog/2017/01/04/introducing-kotlin-support-in-spring-framework-5-0),
and Spring Initializr offers it alongside Java. What it buys you on a backend:

- **Null safety in the type system**, which matters most exactly where JVM backends hurt — deserialised JSON and database rows.
- **Data classes** for DTOs, so a request model is one line instead of thirty.
- **Extension functions and sealed classes**, which make domain modelling and error handling considerably less ceremonial.

The catch is that Kotlin's defaults (final classes, non-null types, no no-arg
constructors) collide with Spring's assumptions, which were built for Java. Compiler
plugins resolve this, and one page of this chapter is about exactly that friction.

## What's in here

| Page | What it covers |
| --- | --- |
| Dependency Injection & the Container | What the application context is, and constructor injection as the default |
| Layered Architecture | Controller / service / repository, and where DTOs stop and entities start |
| Kotlin on Spring | Null safety, data classes, and the compiler plugins that make it work |
| Persistence & Transactions | Spring Data JPA, `@Transactional` semantics, and the N+1 problem |
| Configuration, Profiles & Testing | Typed config, environment layering, and test slices that stay fast |

## Where this connects

**FastAPI & Python Services** is the next chapter and the natural contrast: the same
problems — DI, validation, layering — solved by a framework with the opposite
philosophy about how much to do for you. **Relational Schema Design** in Track 3 is
the layer underneath the persistence page here.

## References

- [Spring Boot reference documentation](https://docs.spring.io/spring-boot/index.html)
- [Spring Framework — Kotlin support](https://docs.spring.io/spring-framework/reference/languages/kotlin.html)
