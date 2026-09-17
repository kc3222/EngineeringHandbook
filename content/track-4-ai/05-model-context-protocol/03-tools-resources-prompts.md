---
title: "Tools, Resources & Prompts"
description: "The three things an MCP server can offer, who decides when each one is used, and a working server that exposes all three."
track: 4
chapter: 5
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Architecture: Host, Client, Server** — the host decides what reaches the model.
:::

## Three primitives, three deciders

A server can offer three kinds of capability. The useful way to tell them apart is not
what they contain but **who decides they get used**:

| Primitive | Who decides | What it is | Typical surface in a host |
| --- | --- | --- | --- |
| **Tools** | The model | A function the model can ask to run | Invoked mid-conversation, often behind a confirmation |
| **Resources** | The application | Addressable data the host can attach to context | A file picker, an "attach" menu, or automatic inclusion |
| **Prompts** | The user | A parameterised template for a whole interaction | A slash command or a menu entry |

The split matters because risk follows control. A tool runs because a model, which can
be misled by text it reads, decided it should. A resource only enters the conversation
when application logic or the user chooses it. A prompt only runs when a person picks it.
When you're deciding how to expose a capability, the first question is who *should* be
making that decision.

## One server, all three

Here is a small server for an issue tracker, using the official Python SDK (v2, where the
high-level server class is `MCPServer`). Type hints and docstrings do most of the work:
the SDK turns them into the schemas and descriptions clients see.

```python
from mcp.server import MCPServer
from mcp.types import ToolAnnotations

mcp = MCPServer("tickets")

TICKETS = {
    101: {"title": "Login page times out", "state": "open"},
    102: {"title": "CSV export drops last row", "state": "closed"},
}


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
def search_tickets(query: str, state: str = "open") -> list[dict]:
    """Find tickets whose title contains `query`. Use this when the user
    describes a ticket rather than giving its number. `state` is
    "open", "closed", or "all"."""
    return [
        {"id": tid, **t}
        for tid, t in TICKETS.items()
        if query.lower() in t["title"].lower()
        and state in ("all", t["state"])
    ]


@mcp.resource("tickets://{ticket_id}")
def ticket(ticket_id: int) -> str:
    """The full record for one ticket."""
    t = TICKETS[int(ticket_id)]
    return f"#{ticket_id} [{t['state']}] {t['title']}"


@mcp.prompt()
def triage(ticket_id: int) -> str:
    """Draft a triage note for a ticket."""
    return (
        f"Read tickets://{ticket_id}. Summarise the problem in one line, "
        "guess the component at fault, and propose a severity."
    )


if __name__ == "__main__":
    mcp.run()  # stdio by default
```

## Tools

A tool is what the model sees in `tools/list`. For `search_tickets` above, the SDK
generates this (trimmed):

```json
{
  "name": "search_tickets",
  "description": "Find tickets whose title contains `query`. Use this when ...",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "state": { "type": "string", "default": "open" }
    },
    "required": ["query"]
  },
  "outputSchema": { "...": "derived from the return type" },
  "annotations": { "readOnlyHint": true }
}
```

The docstring became the description, so **the docstring is written for the model**, not
for the next maintainer. Everything from the previous chapter's tool-design guidance
applies here: say when to call it, when not to, and what the values mean. A closed value
set like `state` is better expressed as a `Literal` type, which the SDK turns into an
`enum`.

A call returns two parallel forms of the result. `content` is a list of blocks (text,
images, links to resources) meant for the model. `structuredContent` is typed JSON that
matches the `outputSchema`, meant for code. Failures come in two kinds, and the
distinction is deliberate:

- **Tool execution errors** (a bad date, an upstream 404) come back as a normal result with `isError: true` and a message the model can act on. Hosts should pass these to the model so it can correct itself.
- **Protocol errors** (an unknown tool name, a malformed request) come back as JSON-RPC errors. They signal a bug, not something the model can fix.

**Annotations** such as `readOnlyHint`, `destructiveHint`, `idempotentHint`, and
`openWorldHint` describe a tool's behaviour so hosts can decide what to auto-approve. They
are hints from the server about itself. The spec says clients must treat them as untrusted
unless the server is trusted, which means an unknown server's claim to be read-only
should not be what skips a confirmation.

## Resources

A resource is data identified by a URI: `file:///repo/README.md`, `tickets://101`, or a
custom scheme of your choosing. Clients enumerate fixed resources with `resources/list`
and parameterised ones with `resources/templates/list`. The `tickets://{ticket_id}`
decorator above produces a template. Either kind is fetched with `resources/read`.

Resources suit material that is **read, not acted on**: reference documents, schemas,
configuration, a record the user wants to discuss. The host chooses what to attach, so a
resource doesn't cost a model decision or a round trip through the agent loop, and it
doesn't appear in the tool list competing for the model's attention.

The honest caveat is that host support is uneven. Many hosts surface tools well and
resources only partially. If a capability must work everywhere, a read-only tool is the
more portable choice, and some servers expose the same data both ways. A tool can also
bridge the two by returning a **resource link** in its result, pointing at data the
client can fetch.

## Prompts

A prompt is a named template with arguments. `prompts/get` fills it in and returns a list
of messages ready to send to the model. The `triage` prompt above becomes a single user
message referencing the ticket.

Prompts are how a server ships **workflows**, not just capabilities. The team that owns
the ticket system knows what a good triage note contains, and a prompt lets them encode
that once. Users see it as a slash command or menu entry in whichever host they use. A
prompt never runs on its own initiative; it waits for a person to choose it.

## Using them from a client

The same SDK provides a client. This launches the server above as a subprocess and
exercises each primitive:

```python
import asyncio
import sys

from mcp import Client, StdioServerParameters


async def main() -> None:
    server = StdioServerParameters(command=sys.executable, args=["server.py"])
    async with Client(server) as client:
        tools = await client.list_tools()
        print([t.name for t in tools.tools])

        result = await client.call_tool("search_tickets", {"query": "login"})
        print(result.structured_content)

        page = await client.read_resource("tickets://101")
        print(page.contents[0].text)

        prompt = await client.get_prompt("triage", {"ticket_id": "101"})
        print(prompt.messages[0].content.text)


asyncio.run(main())
```

```text
['search_tickets']
{'result': [{'id': 101, 'title': 'Login page times out', 'state': 'open'}]}
#101 [open] Login page times out
Read tickets://101. Summarise the problem in one line, guess the component at fault, and propose a severity.
```

In a real host this code is invisible. The host's client does the listing, the model
drives `call_tool`, and the UI drives `read_resource` and `get_prompt`.

## Choosing a primitive

| If… | Expose it as |
| --- | --- |
| The model should decide, mid-task, to do it | A tool |
| It changes state anywhere | A tool, with a confirmation in the host |
| It's data a person or the app picks to include | A resource |
| It's data the model needs to find by itself | A read-only tool, optionally returning resource links |
| It's a repeatable multi-step request users start deliberately | A prompt |

## What to take away

- Tools are model-controlled, resources are application-controlled, prompts are user-controlled. Choose based on who should make the decision.
- In the SDK, docstrings and type hints become the tool description and schema. Write them for the model.
- Return recoverable failures as `isError` results so the model can correct itself. Protocol errors are for malformed requests.
- Tool annotations are the server's claims about itself. Don't let an untrusted server's `readOnlyHint` bypass a confirmation.
- Resources avoid a model decision but have uneven host support. When portability matters, a read-only tool is the safer choice.

## References

- [MCP specification — Server features overview](https://modelcontextprotocol.io/specification/2026-07-28/server) · [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) · [Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) · [Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — the SDK used in the examples (v2)
