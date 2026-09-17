---
title: "Transports & Connecting a Server"
description: "stdio for a server running on the user's machine, Streamable HTTP for a server running somewhere else, and how to choose between them."
track: 4
chapter: 5
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Architecture: Host, Client, Server** — requests are self-contained JSON-RPC messages.
:::

## A transport only moves messages

Tools, resources, prompts, and errors mean the same thing on every transport. A
transport only defines how a message is framed, delivered, and cancelled, and how the
connection ends. The spec defines two:

- **stdio** — the client starts the server as a child process and exchanges messages over its standard input and output.
- **Streamable HTTP** — the server is an independent web service, and every message is an HTTP POST to one endpoint.

Custom transports are allowed if they keep the message format, but almost everything in
practice is one of these two.

## stdio: the server is a subprocess

With stdio, the host's client **launches** the server. Configuring a stdio server means
giving the host a command to run, and the SDK's client makes that concrete:

```python
StdioServerParameters(
    command="python",
    args=["server.py"],
    env={"TICKETS_API_TOKEN": "..."},
)
```

The client writes requests to the server's stdin and reads responses from its stdout, one
JSON message per line. Messages can't contain raw newlines. The rules that follow from
that are strict:

- **stdout carries protocol messages and nothing else.** A stray `print()` in server code, or a library that logs to stdout, corrupts the stream, and the client typically reports a parse error rather than your debug line. Send logs to stderr.
- **stderr is free-form.** The client may show it, store it, or discard it, and it doesn't signal an error by itself.
- **Shutdown is closing stdin.** The server should exit when its input reaches end-of-file. The client escalates to a signal if it doesn't.
- **Credentials come from the environment.** The spec's OAuth flow is for HTTP. A stdio server reads a token from an environment variable or a local credential store.

The process runs as the user, with the user's filesystem and network access. Installing a
stdio server is installing and running a program, and page 5 treats it that way.

**Where stdio fits:** tools that need the local machine, such as the filesystem, a local
git checkout, or a CLI already installed on the machine; single-user setups; and anything
you want working without deploying a service. Its limits are the flip side: one user per
process, every user installs and updates it themselves, and nothing is shared across a
team.

## Streamable HTTP: the server is a service

With Streamable HTTP, the server runs on its own and exposes **one endpoint**, typically
`/mcp`. Every client message is a separate POST to it. For each request, the server
chooses one of two response forms:

- **A plain JSON body** holding the result, for anything quick.
- **A Server-Sent Events stream** scoped to that request. It can carry progress notifications before the final result and closes once the result is sent.

Here is a real exchange with the server from page 3, reformatted and trimmed. The server was started with
`mcp.run(transport="streamable-http")`. The SDK binds to `127.0.0.1:8000` at `/mcp` by
default.

```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: search_tickets

{"jsonrpc": "2.0", "id": 1, "method": "tools/call",
 "params": {"name": "search_tickets", "arguments": {"query": "login"},
            "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28",
                      "io.modelcontextprotocol/clientCapabilities": {}}}}
```

```http
HTTP/1.1 200 OK
content-type: application/json

{"jsonrpc": "2.0", "id": 1, "result": {"resultType": "complete",
 "content": [{"type": "text", "text": "{\"id\": 101, ...}"}],
 "structuredContent": {"result": [{"id": 101, "title": "Login page times out", "state": "open"}]},
 "isError": false}}
```

The `Mcp-Method` and `Mcp-Name` headers repeat what's in the body. That lets gateways,
load balancers, and firewalls route or rate-limit by tool without parsing JSON. The
server must reject any request where the headers and body disagree; otherwise a gateway
could approve one tool while the server runs another.

The client in the SDK takes the URL instead of a command:

```python
async with Client("http://127.0.0.1:8000/mcp") as client:
    result = await client.call_tool("search_tickets", {"query": "csv", "state": "all"})
```

For change notifications, such as a tool list that changed or a resource that updated, a
client opens one long-lived stream with a `subscriptions/listen` request and names the
notification types it wants.

**Where Streamable HTTP fits:** shared, team-wide, or public servers; anything wrapping a
system that already lives on the network; and anything that needs central auth, logging,
and updates. Because the current protocol is stateless, any request can go to any
replica, so the server scales like an ordinary API, with no session affinity to manage.

## "HTTP with SSE" is two different things

Older material describes an **HTTP+SSE transport** with a GET endpoint that held open an
event stream and a separate endpoint for POSTs. That was the transport in the protocol's
first revision (2024-11-05). It has been deprecated since 2025-03-26 and is on the path
to removal. New servers shouldn't implement it. Clients may still need a fallback for old
servers.

SSE itself survived, but only as a *response format* inside Streamable HTTP. The
2025-era versions of Streamable HTTP also had session IDs, a standalone GET stream, and
resumable streams. The 2026-07-28 revision removed all three. If a tutorial mentions
`Mcp-Session-Id`, it predates the stateless protocol.

## Choosing

| Question | stdio | Streamable HTTP |
| --- | --- | --- |
| Where does the server run? | On the user's machine, as a child of the host | Anywhere reachable over the network |
| Who installs and updates it? | Each user | Whoever operates the service |
| How many users per server process? | One | Many |
| How does it authenticate? | Credentials from the environment | OAuth 2.1 bearer tokens (page 5) |
| Needs the local filesystem or local CLIs? | Natural fit | Not without a local agent |
| Scaling | Not applicable | Stateless, so any replica can serve any request |
| Cancelling a request | A cancel notification on the shared stream | Close that request's response stream |

A common path is to start a server on stdio while it's being built and move it behind
HTTP once more than one person needs it. The server code stays the same. Only the
`run()` call and the deployment around it change.

## Operational notes

- **Bind local HTTP servers to `127.0.0.1`**, never `0.0.0.0`, unless you mean to expose them.
- **Validate `Origin`.** Without that check, a malicious web page can reach a server on localhost through DNS rebinding. The Python SDK rejects unexpected origins with a 403 by default.
- **Let SSE through proxies unbuffered.** A proxy that buffers responses turns progress updates into one late block. Servers should send `X-Accel-Buffering: no`, and proxy configuration should honour it.
- **Retries are new requests.** Streams aren't resumable, so a dropped connection loses the in-flight call, and the client re-sends it with a new id. Make tools with side effects idempotent.

## What to take away

- The transport changes delivery, not meaning. The same server code runs on either.
- stdio means the host runs your server as the user, over stdin and stdout. Keep stdout clean and take credentials from the environment.
- Streamable HTTP means one POST endpoint, a JSON or SSE response per request, and routing headers that must match the body.
- The old HTTP+SSE transport is deprecated. SSE now appears only as a per-request response stream.
- Use stdio for single-user local capability and HTTP for anything shared.

## References

- [MCP specification — Transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) · [stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio) · [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [WHATWG HTML — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — the streaming format used in responses
