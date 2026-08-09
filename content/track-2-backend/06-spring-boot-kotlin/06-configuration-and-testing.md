---
title: "Configuration, Profiles & Testing"
description: "Typed configuration, environment layering, and test slices that stay fast enough to run."
track: 2
chapter: 6
page: 6
readMinutes: 4
---

:::info[Prerequisites]
**Persistence & Transactions** — the database is what most of the configuration and the slowest tests are about.
:::

## Typed configuration over scattered `@Value`

`@Value("\${payments.timeout}")` sprinkled across classes gives you no type checking,
no validation, no discoverability, and a failure at *first use* rather than at
startup. `@ConfigurationProperties` on a Kotlin data class gives you all four:

```kotlin
@ConfigurationProperties(prefix = "payments")
data class PaymentProperties(
    val baseUrl: URI,
    val timeout: Duration = Duration.ofSeconds(5),
    @field:Positive val maxRetries: Int = 3,
)
```

```yaml
payments:
  base-url: https://api.example.com
  timeout: 5s          # relaxed binding: base-url → baseUrl; "5s" → Duration
  max-retries: 3
```

Add `@Validated` and a misconfigured environment fails at **startup**, not at 3am
when the first payment goes through. That's the real argument: configuration errors
should be deploy-time failures, and typed binding is what converts them.

## Where values come from

Spring Boot layers property sources, later ones overriding earlier:

```text
application.yml  →  application-{profile}.yml  →  env vars  →  command-line args
   defaults              per-environment           secrets       last word
```

The layering is what lets you commit sensible defaults and override the few things
that differ per environment. Two rules that follow:

- **Secrets enter through the environment**, never through a committed YAML file. `PAYMENTS_API_KEY` binds to `payments.api-key` by relaxed binding, so no code changes to switch a value from file to environment.
- **Profiles are for wiring, not for logic.** `@Profile("dev")` on a bean that swaps a fake payment client is fine. `if (profile == "prod")` inside business logic means production runs a code path nothing else ever exercised.

## The testing pyramid, in Spring's terms

Spring gives you three tiers, and the cost difference between them is roughly an
order of magnitude each. Most slow test suites are one tier too high, everywhere.

| Tier | What starts | Cost each |
| --- | --- | --- |
| Plain unit test | No Spring at all | Milliseconds |
| Slice — `@WebMvcTest`, `@DataJpaTest` | A fragment of the context | Hundreds of ms |
| `@SpringBootTest` | Full context + real dependencies | Seconds |

**Unit.** A service with constructor injection needs no framework — that was the
point of constructor injection. `OrderService(FakeRepo(), FakePayments())` and call
the method. Most business logic belongs here.

**Slice.** `@WebMvcTest(OrderController::class)` starts the web layer only, with
services mocked via `@MockitoBean`. It tests what the controller is actually
responsible for: routing, binding, validation, status codes.

```kotlin
@WebMvcTest(OrderController::class)
class OrderControllerTest(@Autowired val mvc: MockMvc) {

    @MockitoBean lateinit var orders: OrderService

    @Test
    fun `rejects an order with no lines`() {
        mvc.post("/orders") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"customerId":"…","lines":[]}"""
        }.andExpect { status { isBadRequest() } }
    }
}
```

`@DataJpaTest` is the equivalent for the persistence layer: repositories, an
`EntityManager`, and a transaction rolled back after each test.

**Full context.** `@SpringBootTest` for the handful of paths where the integration
*is* the thing under test. Keep the number small and the configuration identical
across them — every distinct context configuration is a separate context Spring has
to build, though it caches each one across tests within a run.

## Test against the real database

`@DataJpaTest` defaults to an embedded in-memory database, which is fast and lies:
different SQL dialect, no `jsonb`, no partial indexes, different constraint and
locking behaviour. A migration that passes against H2 and fails against PostgreSQL is
a discovery you make during deployment.

[Testcontainers](https://java.testcontainers.org/) runs the real thing in Docker, and
Spring Boot 3.1+ integrates it directly with `@ServiceConnection`, which wires the
container's connection details into the context with no property plumbing:

```kotlin
@SpringBootTest
@Testcontainers
class OrderRepositoryTest {
    companion object {
        @Container @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:17")
    }
}
```

Reuse one container across the whole suite rather than per class — starting Postgres
per test class is where the minutes go.

## What to take away

- Bind configuration to validated types so a bad environment fails at startup, not at first use.
- Layer properties; put secrets in the environment; use profiles to swap wiring, never to branch business logic.
- Choose the cheapest tier that tests the thing: plain unit tests for logic, slices for the web and persistence layers, full context sparingly.
- Test persistence against the real database engine. In-memory substitutes agree with production right up until they don't.

## References

- [Spring Boot — Externalized configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html) and [type-safe configuration properties](https://docs.spring.io/spring-boot/reference/features/external-config.html#features.external-config.typesafe-configuration-properties)
- [Spring Boot — Testing](https://docs.spring.io/spring-boot/reference/testing/index.html) and [auto-configured test slices](https://docs.spring.io/spring-boot/appendix/test-auto-configuration/index.html)
- [Spring Boot — Testcontainers support](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)
- [Testcontainers for Java](https://java.testcontainers.org/)
