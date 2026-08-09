---
title: "JWTs in Practice"
description: "The validation steps you must not skip, plus claims, lifetimes and the revocation problem."
track: 2
chapter: 8
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**OAuth 2.0 & OIDC** — this is what your API does with the access token that flow produced.
:::

## What a JWT is

Three base64url segments separated by dots: header, payload, signature.

```text
eyJhbGciOiJSUzI1NiIsImtpZCI6IjJhIn0 . eyJzdWIiOiJ1XzkzMSIsImV4cCI6MTc2… . MEUCIQD…
└──────── header ────────┘   └──────── payload ────────┘   └── signature ──┘
```

```json
{"alg": "RS256", "kid": "2a", "typ": "JWT"}
{"iss": "https://auth.example.com", "sub": "u_931",
 "aud": "https://api.example.com", "exp": 1767225600, "iat": 1767222000,
 "scope": "orders:read"}
```

The property to internalise: **a JWT is signed, not encrypted.** Anyone holding it can
read every claim — paste one into [jwt.io](https://jwt.io/) and see. The signature
proves integrity and origin, nothing about confidentiality. Never put anything in a
JWT you wouldn't put in a URL.

## Validation, in order

Libraries do this, but they do it *according to how you configure them*, and the
common vulnerabilities are all skipped steps.

Every one of these must pass, and any failure is a `401`:

1. The `alg` is in **our** allowlist — not whatever the token asked for.
2. The signature verifies against the key named by `kid`, fetched from JWKS.
3. `iss` is our issuer.
4. `aud` names **this** API.
5. The current time is within `exp` / `nbf`, allowing small clock skew.

Passing all five means authenticated — authorization is still ahead of you.

Where each step earns its place:

**Algorithm allowlist.** Configure the expected algorithm explicitly; never let the
token's own `alg` header choose the verification method. The historical attack is
`alg: none` (a token with an empty signature accepted as valid) and the RS256→HS256
confusion attack, where an attacker signs a token using the *public* key as an HMAC
secret. Both are library-configuration failures, not cryptographic ones.

**`iss` and `aud`.** A signature check alone proves only that *some* issuer you trust
made this token. Without `aud`, a token minted for a different service — or an OIDC ID
token minted for the frontend — passes. Without `iss`, a token from a different tenant
of the same identity provider passes.

**`exp` and `nbf`**, with a small clock-skew leeway (30–60 seconds). Larger leeway
quietly extends every token's life.

**Key rotation via JWKS.** Fetch keys from the provider's `jwks_uri`, select by the
token's `kid`, and cache them. Refresh on an unknown `kid` — with a rate limit, or an
attacker can force unbounded fetches by sending garbage `kid` values. Hardcoding a
public key means rotation day is an outage.

## Claims: what belongs in there

Registered claims worth knowing ([RFC 7519 §4.1](https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1)):
`iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`.

`sub` is the user id and it is **the** identifier to key your data on — not the email,
which changes and can be reassigned.

Custom claims are fine, and namespaced (`https://example.com/roles`) if the provider
requires it. What to weigh:

- **Every claim costs bytes on every request.** A few roles are fine. A hundred permissions is a token that inflates every request and can exceed header size limits at a proxy.
- **Claims are frozen at issue time.** Roles put in a token stay true for the token's whole lifetime, whatever the database says. That's the entire revocation problem below, in miniature.

## Lifetimes and refresh

The core tension: a self-contained token can't be un-issued, so its lifetime *is* your
worst-case exposure window.

Short-lived access tokens with a long-lived refresh token is the standard shape. It
works because the two travel differently: the access token goes to every API on every
call, while the refresh token goes only to the authorization server's token endpoint,
so its exposure is far smaller.

**Rotate refresh tokens**, and detect reuse. Each refresh returns a new refresh token
and invalidates the old one; if an old one is presented again, either it was stolen or
it was replayed — revoke the entire token family and force re-authentication. RFC 9700
requires rotation or sender-constraining for public clients, and reuse detection is
what makes rotation actually protective.

## Revocation: the honest answer

**You cannot revoke a stateless token.** A signed JWT is valid until `exp`, and every
"JWT revocation" scheme works by putting state back in — the thing statelessness was
meant to avoid.

Options, with what each actually costs:

| Approach | Effect | Cost |
| --- | --- | --- |
| Short expiry (5–15 min) | Bounds the window; no lookup | Doesn't revoke, only expires |
| Denylist of `jti` | Immediate for specific tokens | A lookup per request — you're now stateful |
| `token_version` per user, checked on refresh | "Log out everywhere" within one access-token lifetime | Delay equal to the access-token TTL |
| [Token introspection (RFC 7662)](https://www.rfc-editor.org/rfc/rfc7662.html) | Real-time validity from the issuer | A network call per request; cache carefully |
| Opaque tokens | Full revocation, by construction | A store lookup per request — back to sessions |

For most systems, short expiry plus refresh rotation is the right trade. Add a
denylist only for high-value operations, and be clear-eyed that adopting it means the
architecture is no longer stateless.

If sub-second revocation is a hard requirement — anything money-moving or safety-critical —
opaque tokens with server-side state are the design that meets it. Don't reach for a
JWT and then bolt state onto it.

## Common mistakes, collected

- Verifying the signature but skipping `aud` or `iss`
- Accepting the token's `alg` instead of enforcing your own
- Long-lived access tokens (hours or days) because refresh was inconvenient to build
- Secrets or PII in claims — they're readable by anyone who has the token
- Symmetric `HS256` shared across services: every service that can *verify* can also *mint*. Use `RS256`/`ES256` so verifiers hold only the public key
- Logging the whole `Authorization` header, which puts live credentials into your log aggregator

## What to take away

- Signed, not encrypted. Assume every claim is public.
- Validate algorithm, signature, `iss`, `aud` and time — in that order, and skip none of them.
- Short access-token lifetimes with rotated refresh tokens and reuse detection is the workable default.
- Revocation requires state. Decide deliberately whether you want statelessness or instant revocation; you cannot have both.

## References

- [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html) (BCP 225) — the validation rules above, normatively.
- [RFC 9700 §4.14 — Refresh token protection](https://www.rfc-editor.org/rfc/rfc9700.html) (2025)
- [RFC 7519 — JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519.html), [RFC 7517 — JSON Web Key](https://www.rfc-editor.org/rfc/rfc7517.html), [RFC 7662 — Token Introspection](https://www.rfc-editor.org/rfc/rfc7662.html) — the base specs.
- [OWASP — JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) — continuously updated.
