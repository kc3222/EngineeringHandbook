---
title: "What MCP Is & Why It Exists"
description: "The integration problem that every AI application runs into, and the open protocol that turns it from a per-pair job into a per-system one."
track: 4
chapter: 5
page: 1
readMinutes: 4
---

:::info[Prerequisites]
**Prompting & AI Coding Agents**, especially **Tools, MCP & Extending Agents** — what a
tool definition is and why its description matters. That page introduces MCP in a few
paragraphs; this chapter is the full treatment.
:::

:::note[Spec revision]
Written against the MCP specification revision **2026-07-28**. That revision made the
protocol stateless and removed the connection handshake that earlier revisions and older
tutorials describe. Where the older behaviour still shows up in the wild, the page says so.
:::

## The integration problem

A model on its own can only produce text. Everything useful an AI application does beyond
that — reading a ticket, querying a database, opening a pull request — happens because
the application gave the model a **tool** and ran the call for it.

For the first generation of AI applications, every one of those tools was hand-built
inside the application that used it. The chat assistant had its own issue-tracker
connector. The IDE agent had a different one. The internal support bot had a third. Each
was written against a different tool-definition format, with its own auth handling, its
own error shapes, and its own idea of what "search issues" returns.

That is an **N × M** problem: N applications times M external systems, and every cell in
the grid is a separate integration someone has to write and maintain. The costs compound
in predictable ways:

- **Duplicated work.** The same wrapper around the same API gets written once per application.
- **Drift.** When the upstream API changes, some connectors get updated and some don't.
- **Uneven security.** Each connector makes its own decisions about credentials and scoping, and the weakest one sets the bar.
- **Lock-in.** A connector built for one application's plugin format is useless to the next one.

## What MCP changes

The **Model Context Protocol** is an open standard that puts a fixed interface between
the two sides of that grid. A system's capabilities are packaged once as an **MCP
server**. Any AI application that speaks the protocol can connect to that server and use
what it offers, without code written specifically for that pairing.

| Before | With MCP |
| --- | --- |
| One connector per application–system pair | One server per system, one client implementation per application |
| Tool format defined by each application | Tool, data, and template shapes defined by the spec |
| Auth handled ad hoc per connector | OAuth 2.1 profile defined for remote servers |
| Connector lives inside the application | Server is a separate program, owned by whoever owns the system |
| New application means rewriting connectors | New application works with every existing server |

The grid collapses from N × M to N + M. That is the whole pitch, and it's the same move
the Language Server Protocol made for editors and programming languages, which the MCP
spec cites as its inspiration.

## What the protocol actually standardises

MCP is a message format and a set of conventions, not a runtime. Messages are
**JSON-RPC 2.0**. On top of that, the spec defines:

- **Roles** — the application (host), the connector inside it (client), and the program offering capabilities (server). Page 2 covers how they fit together.
- **Primitives** — the three kinds of thing a server can offer: tools, resources, and prompts. Page 3.
- **Transports** — how messages move between client and server: a local subprocess over standard streams, or HTTP. Page 4.
- **Authorization** — an OAuth 2.1 profile for servers reached over HTTP. Page 5.

Just as important is what it leaves out. MCP does not choose a model, decide when a tool
gets called, define how results are placed in the model's context, or render any UI. It
states that hosts must get user consent before invoking tools, but a protocol cannot
enforce that; the host application has to. A server that follows the spec perfectly can
still be dangerous inside a careless host.

## When it's worth reaching for

MCP earns its overhead when a capability needs to outlive, or be shared across, the
application that first needed it:

- **Several AI applications need the same system.** An IDE agent, a chat assistant, and an automation pipeline all want the deployment system.
- **The system and the agent are owned by different teams.** The team that runs the billing service ships and versions its own server, rather than every consuming team wrapping the billing API itself.
- **You want off-the-shelf integrations.** A large ecosystem of servers already exists for common developer tools and SaaS products.

It is overhead you don't need when a single application calls a handful of functions that
live in its own codebase. Native function calling in the model API does that job with one
fewer process and one fewer protocol, and the tool-design advice from the previous chapter
applies either way.

## What's in here

| Page | What it covers |
| --- | --- |
| Architecture: Host, Client, Server | The three roles, why each client talks to exactly one server, and how a request flows |
| Tools, Resources & Prompts | The three primitives, who controls each, and a working server that exposes all three |
| Transports & Connecting a Server | stdio for local servers, Streamable HTTP for remote ones, and how to choose |
| Security & Scoping | Trust boundaries, least-privilege server design, authorization, and what never to expose |

## Where this connects

Backwards, **Tools, MCP & Extending Agents** in the previous chapter covers writing tool
descriptions and the prompt-injection triangle. Both apply unchanged to MCP servers, and
this chapter doesn't repeat them. **RAG Pipelines** is relevant because a resource-heavy
MCP server is a retrieval system with a standard front door.

Across the handbook, Track 2's **Authentication & Authorization** covers the OAuth 2.0
flows that MCP's authorization profile builds on. Track 6's **Containers & Deployment** is
where a remote MCP server ends up running.

## References

- [Model Context Protocol — specification, revision 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) · [changes from the previous revision](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification) — the message format MCP is built on
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) — the precedent MCP's design follows
