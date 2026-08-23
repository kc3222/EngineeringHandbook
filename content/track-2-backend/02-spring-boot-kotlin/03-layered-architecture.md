---
title: "Layered Architecture"
description: "Controller, service, repository — and the boundary where DTOs stop and entities start."
track: 2
chapter: 2
page: 3
readMinutes: 4
---

:::info[Prerequisites]
**Dependency Injection & the Container** — layers are wired by the container described there.
:::

## The three layers, and what each is forbidden to do

The layering everyone draws is only useful if the *constraints* come with it. The
value isn't in having three boxes; it's in what each box refuses to know.

| Layer | Owns | Must not contain |
| --- | --- | --- |
| Controller | HTTP concerns: routing, status codes, headers, DTO mapping | Business rules, database access |
| Service | Business rules, orchestration, the transaction boundary | `HttpServletRequest`, `ResponseEntity`, status codes |
| Repository | Queries and entity mapping | Business rules, HTTP anything |

The rule that carries the most weight is the middle one: **a service that knows about
HTTP cannot be called by anything else.** The day you need that logic in a scheduled
job, a message consumer, or a CLI, you find it returns `ResponseEntity` and throws
`ResponseStatusException`. Services take and return domain types; the controller
translates.

## A slice, end to end

```kotlin
@RestController
@RequestMapping("/orders")
class OrderController(private val orders: OrderService) {

    @PostMapping
    fun create(@Valid @RequestBody req: CreateOrderRequest): ResponseEntity<OrderResponse> {
        val order = orders.place(req.customerId, req.toLines())
        return ResponseEntity
            .created(URI.create("/orders/${order.id}"))
            .body(OrderResponse.from(order))
    }
}

@Service
class OrderService(
    private val repo: OrderRepository,
    private val payments: PaymentClient,
) {
    @Transactional
    fun place(customerId: CustomerId, lines: List<OrderLine>): Order {
        require(lines.isNotEmpty()) { "An order needs at least one line" }
        val order = Order.new(customerId, lines)
        payments.authorize(order.total)          // see the warning below
        return repo.save(order)
    }
}

interface OrderRepository : JpaRepository<Order, UUID> {
    fun findByCustomerId(customerId: UUID): List<Order>
}
```

The controller does four things and no more: bind, validate, delegate, translate. The
service never mentions HTTP. That's the shape to keep.

:::warning[Remote calls inside a transaction]
`payments.authorize(...)` above is inside `@Transactional`, which holds a database
connection open for the duration of a network call to a third party. Under load
that exhausts the connection pool. Do remote work outside the transaction, or
record intent inside it and perform the call afterwards.
:::

## DTOs are not entities

The most consequential boundary decision in the whole layout: **the type you
serialise to JSON is not the type you persist.**

Returning JPA entities from controllers is tempting — one class instead of three —
and it fails in specific ways:

- **The schema becomes the API.** Renaming a column is now a breaking change for every client (see *Versioning & Evolution*).
- **Everything leaks.** `passwordHash`, `internalRiskScore`, `deletedAt` are all serialised unless someone remembers to annotate each one.
- **Lazy loading explodes during serialisation.** Jackson touches a lazy association after the persistence context has closed, and you get `LazyInitializationException` from inside the serialiser — or worse, it succeeds and quietly issues N queries.
- **Mass assignment.** An entity bound directly from a request body lets a caller set fields you never intended to expose.

Kotlin makes the alternative cheap:

```kotlin
data class CreateOrderRequest(
    @field:NotNull val customerId: UUID,
    @field:Size(min = 1) val lines: List<LineRequest>,
)

data class OrderResponse(val id: UUID, val total: Money, val status: String) {
    companion object {
        fun from(o: Order) = OrderResponse(o.id, o.total, o.status.name)
    }
}
```

Separate request and response types, too. They diverge almost immediately — a
response carries a server-assigned id and timestamps that a request must not accept.

## Where validation belongs

Two kinds, two homes:

- **Shape validation** — required, length, format, range — at the controller with Bean Validation (`@Valid` + constraint annotations). It's declarative and rejects garbage before any business code runs.
- **Business rules** — "an order can't be cancelled after dispatch", "this customer's credit limit is exceeded" — in the service or the domain object. They need state the controller doesn't have, and they must hold no matter which entry point is calling.

Putting business rules in annotations is the mistake that looks tidy. A rule needing
a database lookup does not belong in a validator on a DTO.

## Keeping the layering honest as it grows

Layers describe *depth*. Package by **feature**, and put the layers inside:

```text
com.example.orders/       OrderController, OrderService, OrderRepository, dto/
com.example.payments/     PaymentController, PaymentService, …
com.example.shipping/
```

rather than `controllers/`, `services/`, `repositories/`. A feature package can be
read, reviewed and eventually extracted as a unit; a layer package means every change
touches three directories and nothing can be extracted at all.

## What to take away

- The layers are only worth having if each one refuses to know something. HTTP stops at the controller.
- Never return or bind JPA entities directly — the API contract and the schema must be free to change independently.
- Shape validation is declarative and lives at the edge; business rules live in the domain, where the state is.
- Package by feature, layer within it. Layer-first packages scatter every change.

## References

- [Spring — Building a RESTful web service](https://spring.io/guides/gs/rest-service)
- [Jakarta Bean Validation](https://beanvalidation.org/) and [Spring's validation chapter](https://docs.spring.io/spring-framework/reference/core/validation/beanvalidation.html)
- [Spring Framework — Web MVC annotated controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html)
