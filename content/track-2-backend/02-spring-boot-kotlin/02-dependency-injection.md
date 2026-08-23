---
title: "Dependency Injection & the Container"
description: "What the application context actually is, and why constructor injection is the only default worth having."
track: 2
chapter: 2
page: 2
readMinutes: 4
---

:::info[Prerequisites]
**Spring Boot & Kotlin** — what `@SpringBootApplication` sets in motion.
:::

## The problem DI solves

Without a container, an object constructs its own collaborators:

```kotlin
class OrderService {
    private val repo = PostgresOrderRepository(DriverManager.getConnection(URL))
}
```

`OrderService` now *is* its dependencies. You can't test it without a database, you
can't swap the repository, and the connection URL has to be reachable from wherever
the class is constructed. Dependency injection inverts that: the object declares what
it needs, and something else supplies it.

```kotlin
@Service
class OrderService(private val repo: OrderRepository)
```

The class is now testable with a fake, and the decision about *which* repository
moved to one place. That's the whole idea — the framework is an implementation
detail of it.

## The application context

Spring's container is the **application context**: a registry of objects (*beans*)
and the graph of who needs whom. At startup it scans for bean definitions, resolves
the graph, and instantiates in dependency order.

At startup Spring scans for bean definitions, resolves the graph, and instantiates in
dependency order — so `OrderController` gets an `OrderService`, which gets an
`OrderRepository` and a `PaymentClient`, which in turn get an auto-configured
`DataSource` and HTTP client. By the time the first request arrives, the graph is
fully built or the application failed to start.

Beans arrive in the context three ways, and knowing which is which is most of
debugging a wiring problem:

| Source | How it's declared | Typical use |
| --- | --- | --- |
| Stereotype scan | `@Component`, `@Service`, `@Repository`, `@RestController` on your classes | Your own code |
| `@Bean` factory method | A method inside an `@Configuration` class | Third-party types you don't own |
| Auto-configuration | Spring Boot, conditionally on what's on the classpath | `DataSource`, `ObjectMapper`, the web server |

Component scanning starts at the package of your `@SpringBootApplication` class and
walks **downward**. A class in a sibling package is silently invisible — a very
common "why is my bean null" cause.

## Constructor injection, and nothing else

Spring supports field, setter and constructor injection. Use constructors.

```kotlin
// Do this
@Service
class OrderService(
    private val repo: OrderRepository,
    private val payments: PaymentClient,
)

// Not this
@Service
class OrderService {
    @Autowired private lateinit var repo: OrderRepository
}
```

Three concrete reasons, not style preference:

- **The object is valid once constructed.** Field injection leaves a window where the object exists but isn't wired, which is where circular-dependency and `null` surprises live.
- **`val` and non-null work.** Field injection in Kotlin forces `lateinit var`, which throws away both immutability and the null safety that was the reason to use Kotlin.
- **The constructor is honest about complexity.** A seven-argument constructor is uncomfortable to look at, and it should be — that class does too much. Field injection hides the same coupling behind seven tidy annotations.

Since Spring 4.3, a class with a single constructor needs no `@Autowired` at all,
which is why the Kotlin version above is just a primary constructor.

## When resolution gets ambiguous

Two beans satisfy one type, and startup fails with `NoUniqueBeanDefinitionException`.
Options, roughly in order of preference:

```kotlin
@Bean fun stripe(): PaymentClient = StripeClient()
@Bean @Primary fun mock(): PaymentClient = MockClient()   // default winner

@Service
class Refunds(@Qualifier("stripe") private val payments: PaymentClient)
```

Better than either: if two implementations mean genuinely different things, they
should usually be two types, not one type with a label.

## Scopes and the trap inside them

Beans are **singletons** by default — one instance for the whole application.
Request- and prototype-scoped beans exist, but the default is what you should design
for, and it carries one hard rule:

> A singleton bean must be stateless, or it must be thread-safe.

A mutable field on an `@Service` is shared by every concurrent request. It will
work perfectly in development, where there is one user, and corrupt data under load.
Per-request state belongs in method parameters and local variables.

## Where the magic hurts

- **Auto-configuration is conditional**, so adding a dependency can change behaviour without you writing a line. `--debug` prints the auto-configuration report showing exactly what matched and why — the first thing to reach for when Spring did something unasked.
- **`@Transactional` and `@Async` work by proxy**, so calling an annotated method from *within the same class* bypasses the proxy and the annotation does nothing. This is the single most-reported Spring "bug" and it isn't one; the next pages return to it.
- **Circular dependencies** are refused at startup by default since Boot 2.6. The setting to allow them exists; the design that needs it is the thing to fix.

## What to take away

- The container is a graph of objects, resolved at startup. Wiring errors are graph errors — read them as "who could not be supplied to whom".
- Constructor injection only. It gives you valid objects, `val` fields, and honest signatures.
- Singleton means shared. Mutable state on a bean is a concurrency bug that hides until traffic arrives.
- Self-invocation skips Spring's proxies, so proxy-based annotations silently do nothing on internal calls.

## References

- [Spring Framework — The IoC container](https://docs.spring.io/spring-framework/reference/core/beans.html)
- [Spring Framework — Constructor-based DI](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html)
- [Spring Blog — "Why field injection is evil"](https://spring.io/blog/2016/03/04/core-container-refinements-in-spring-framework-4-3) (context on the single-constructor rule)
- [Spring Boot — Auto-configuration](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html)
