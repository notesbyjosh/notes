---
layout: post
title: "Testing MCP servers with the MCP Inspector"
tags: [mcp, inspector, tooling, debugging]
---

When you build or consume a **Model Context Protocol (MCP)** server, you eventually want to poke
at it directly — list its tools, call them with real arguments, and watch the raw JSON-RPC go by.
The **MCP Inspector** is the official tool for exactly that, and it runs with a single `npx`
command — no project setup required.

## Launching it

```powershell
npx @modelcontextprotocol/inspector
```

That starts a local proxy and opens a web UI at `http://localhost:6274` (the URL carries a
one-time `MCP_PROXY_AUTH_TOKEN`). You can also preselect the transport:

```powershell
npx @modelcontextprotocol/inspector transportType="streamable-http"
```

## Connecting to a server

In the left panel, pick your **Transport Type** and **Connection Type**, then paste the server
URL and click **Connect**:

- **Stdio** — for local servers you launch as a subprocess (give it the command + args).
- **Streamable HTTP** — for remote servers exposed over HTTP, the modern successor to the older
  HTTP+SSE transport. Connect **Via Proxy** so the Inspector handles the streaming handshake.

A healthy connection shows a green **Connected** dot plus the server's reported name and version.

## What you can do

Once connected, the tabs across the top map to the MCP surface area:

- **Tools** — click **List Tools** to enumerate everything the server advertises, then select a
  tool to see its schema and run it with arguments inline.
- **Resources** / **Prompts** — browse any resources or prompt templates the server exposes.
- **Ping**, **Sampling**, **Roots**, **Elicitations** — exercise the rest of the protocol.
- **History** — every `initialize`, `tools/list`, and `tools/call` is logged with its full
  request/response payload, which is gold when you're debugging why a tool call failed.

## Why it's handy

The Inspector takes the guesswork out of the streamable-HTTP handshake. Instead of hand-rolling
`curl` requests — initializing a session, capturing the `mcp-session-id` header, sending
`notifications/initialized`, then calling a tool — you get a point-and-click client that does it
for you and shows you exactly what each tool expects. It's the fastest way to confirm a server is
up and to learn the shape of its tools before you wire it into an agent.
