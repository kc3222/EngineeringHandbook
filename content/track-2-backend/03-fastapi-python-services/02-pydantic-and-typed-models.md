---
title: "Pydantic & Typed Models"
description: "Validation, coercion, and why request and response models must be different types."
track: 2
chapter: 3
page: 2
readMinutes: 4
---

:::info[Prerequisites]
**FastAPI & Python Services** — the idea that the function signature is the contract.
:::

## One model, four outputs

A Pydantic model declares the shape once; FastAPI derives the rest.

```python
from pydantic import BaseModel, Field
from uuid import UUID

class OrderLine(BaseModel):
    sku: str = Field(min_length=1, max_length=32)
    quantity: int = Field(gt=0, le=100)

class CreateOrder(BaseModel):
    customer_id: UUID
    lines: list[OrderLine] = Field(min_length=1)
    note: str | None = None

@app.post("/orders", status_code=201)
def create_order(order: CreateOrder) -> OrderResponse:
    ...
```

What you get without writing it: a parsed and coerced `CreateOrder` (never a raw
dict), a `422` with a per-field error list when it doesn't validate, a JSON Schema in
`/openapi.json`, and a real type for your editor and type checker.

The constraints (`gt`, `min_length`) are part of the schema, so they appear in the
generated docs too. A validation rule that isn't documented is a rule clients discover
by getting rejected.

## The request lifecycle

FastAPI parses the request, validates it against your model, and only then calls your
function; on the way out, `response_model` filters what gets serialised.

The important property is that **the handler never runs on invalid input**. There's no
defensive checking at the top of the function, because nothing that failed validation
gets that far.

## Coercion is a design decision

Pydantic v2 runs in *smart mode* by default: it converts across types when the
conversion is lossless and unambiguous, and refuses when it isn't.

```python
class Payload(BaseModel):
    count: int
    active: bool

Payload(count="42", active="true")   # → count=42, active=True
Payload(count="42.7", active="yes")  # → ValidationError
```

This is usually what you want at an HTTP boundary, where everything arrives as a
string. When you don't want it — an internal service where a string in an int field
means the caller has a bug — use strict mode:

```python
class Payload(BaseModel):
    model_config = ConfigDict(strict=True)
```

The other default worth changing early: unknown fields are **ignored** by default. For
request bodies, `extra="forbid"` turns a client's typo into a `422` instead of a
silently dropped field.

```python
model_config = ConfigDict(extra="forbid")
```

Note the asymmetry with the versioning page in Chapter 1: strict input helps clients
catch their own mistakes, but you must not apply the same strictness when *consuming*
someone else's API, or every field they add breaks you.

## Request and response models are different types

The same rule as the Spring chapter, for the same reasons — and Python's dynamism
makes the mistake easier to reach for.

```python
class UserCreate(BaseModel):        # what a client may send
    email: EmailStr
    password: SecretStr

class UserResponse(BaseModel):      # what we return
    id: UUID
    email: EmailStr
    created_at: datetime
    # no password, ever

@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(payload: UserCreate) -> UserResponse:
    ...
```

`response_model` (or the return annotation, which FastAPI now reads directly) is a
**filter**, not just documentation. If the handler returns an ORM object with thirty
attributes, only the declared fields are serialised. That makes leaking a password
hash an explicit act rather than an oversight — the inverse of the default, which is
what you want for a security property.

For reading ORM objects into a response model, enable attribute reading:

```python
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
```

## Validators, for rules the type system can't express

```python
from pydantic import field_validator, model_validator

class DateRange(BaseModel):
    start: date
    end: date

    @field_validator("start", "end")
    @classmethod
    def not_in_the_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("must not be in the past")
        return v

    @model_validator(mode="after")
    def ordered(self) -> "DateRange":
        if self.end < self.start:
            raise ValueError("end must be on or after start")
        return self
```

`field_validator` sees one field; `model_validator(mode="after")` sees the whole
validated object, which is what cross-field rules need. Both raise `ValueError`, which
FastAPI renders into the standard `422` body alongside every other validation failure.

Keep these to **structural** rules. Anything needing a database lookup — "this SKU
exists", "this customer isn't suspended" — belongs in the handler or a service, not in
a validator that has no clean way to reach a connection.

## Errors, and matching Chapter 1

FastAPI's default `422` body is its own shape, not RFC 9457:

```json
{"detail": [{"type": "greater_than", "loc": ["body", "lines", 0, "quantity"],
             "msg": "Input should be greater than 0"}]}
```

It's structured and per-field, which is the important part. If the rest of your estate
uses problem details, override the handler once and translate:

```python
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            "type": "https://api.example.com/problems/validation-failed",
            "title": "Request validation failed",
            "status": 422,
            "errors": [{"field": ".".join(map(str, e["loc"][1:])),
                        "code": e["type"], "detail": e["msg"]} for e in exc.errors()],
        },
    )
```

## What to take away

- One model definition produces validation, coercion, documentation and editor support — keep it as the single source of truth rather than restating rules in the handler.
- Coercion and unknown-field handling are configuration, not fate. `extra="forbid"` on request bodies catches client typos; don't use it on responses you consume.
- Separate request and response models. `response_model` is an allowlist, and that's the property that keeps secrets out of responses.
- Validators cover structural rules; anything needing state belongs in the service layer.

## References

- [FastAPI — Request body](https://fastapi.tiangolo.com/tutorial/body/) and [Response model](https://fastapi.tiangolo.com/tutorial/response-model/)
- [Pydantic — Conversion table](https://docs.pydantic.dev/latest/concepts/conversion_table/) and [Strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/)
- [Pydantic — Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- [FastAPI — Handling errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)
