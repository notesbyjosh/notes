---
layout: post
title: "From SQL Server 2025 change events to a live shipping page with Foundry"
tags: [sql-server-2025, change-event-streaming, event-hubs, schema-registry, foundry, azure-container-apps]
---
SQL Server 2025 introduces **Change Event Streaming (CES)**: the database engine
publishes row-level changes directly to Azure Event Hubs in near real time. There is
no external poller and no change-tracking reader process to operate. The push happens
inside the engine, which is why the pattern is often described as "IOLess." This post
walks through a proof of concept that takes order changes from a local SQL Server 2025
instance all the way to an AI-generated shipping recommendation on a live web page.

<figure>
  <img src="{{ '/assets/images/contoso-ces-architecture.png' | relative_url }}"
       alt="Architecture diagram. On the laptop, an Orders Application writes to SQL Server 2025 (dbo.Orders). CES pushes change events outbound over port 443 to an Azure Event Hub (order-changes). A local consumer reads the events over WebSocket, validates them against an Avro schema in the Event Hubs Schema Registry, calls a gpt-5.4 deployment in Azure AI Foundry for a revised ship date, and POSTs the result outbound to a FastAPI page on Azure Container Apps that customers view." />
  <figcaption>Order changes flow from SQL Server 2025 to Event Hubs, get schema-validated, are enriched by a Foundry model, and surface on a hosted page. Every hop is outbound.</figcaption>
</figure>

## The scenario

Contoso ships physical orders. When an order's estimated ship date drifts too far
out, customers grow unhappy. The goal is to detect each order change the moment it
lands in the database, ask an AI model whether the ship date can be improved, and
surface a customer-friendly update — without rearchitecting the orders application.

## How the pieces fit

The flow has four stages:

1. **Change Event Streaming.** CES is enabled on the `ContosoSales` database and the
   `dbo.Orders` table is added to a stream group that targets an Event Hub. Every
   `INSERT`, `UPDATE`, and `DELETE` is emitted as a CloudEvent. On SQL Server 2025,
   CES is in preview and requires the `PREVIEW_FEATURES` database-scoped configuration.

2. **Event Hubs and Schema Registry.** The Event Hubs namespace runs on the Standard
   tier so it can host a **Schema Registry**. The order-change contract is registered
   as an Avro schema, giving the consumer a versioned contract to validate against and
   a path for safe schema evolution.

3. **Foundry recommendation.** A consumer parses each CloudEvent, validates the record
   against the registered schema, and calls a **gpt-5.4** deployment in Azure AI
   Foundry. The model returns a revised ship date and a one-sentence customer message
   as structured JSON.

4. **A hosted page.** The recommendation is posted to a small FastAPI application on
   Azure Container Apps, which renders a live, auto-refreshing list of shipping updates.

## Serializing the change, and why the registry matters

To leave the database, each change has to be **serialized** — the in-memory row is packed
into a flat sequence of bytes that can travel through Event Hubs. The consumer then
**deserializes** those bytes back into an object. CES can serialize each CloudEvent as
**JSON** (self-describing text, where the field names travel alongside the values) or as
**Avro binary** (compact, values only — *not* self-describing).

That distinction is the entire reason a schema registry exists. Avro binary carries no
field names, so a consumer cannot interpret the bytes without the schema that says which
value is which. The registry is where that schema lives.

### Schema evolution when one side lags

A registry earns its keep when the producer and consumer evolve on different timelines —
for example, a column is added to the orders table today, but the subscriber cannot be
updated until next month. Whether that is safe depends on the **compatibility direction**
configured on the registry:

- **Backward** — a consumer on the new schema can read old data (upgrade consumers first).
- **Forward** — a consumer on the old schema can read new data (upgrade producers first).
- **Full** — both.

The "add a column now, update the subscriber later" case is a producer-first change, so it
calls for **Forward** or **Full** compatibility. Adding a **nullable column with a default**
is safe in both directions: an old consumer simply ignores the new field. The registry's
real value is as a **gate** — it rejects a breaking change, such as dropping a column or
changing a type, before it ever reaches a lagging subscriber.

One honest caveat for this design: CES does not automatically publish to or read from the
Event Hubs Schema Registry. It embeds its own schema inline in each CloudEvent. In this
proof of concept the registry is a contract that the consumer registers and validates
against — and the highest-value way to use it is as a compatibility gate in a deployment
pipeline.

## The architectural detail that matters most

A local database cannot be reached from Azure. There is no inbound path into a laptop,
so an Azure-hosted function cannot write a result back to a local SQL Server. The POC
resolves this by keeping **every hop outbound**:

- CES pushes *out* from the laptop to Event Hubs over port 443.
- The consumer runs *on the laptop*, reads from Event Hubs, and calls Foundry — both
  outbound calls.
- The consumer then POSTs the recommendation *out* to the hosted page.

Azure never initiates a connection back to the laptop. When the source database moves
to **Azure SQL Database** — which also supports CES — the same design runs entirely in
the cloud and an Event Hubs-triggered Azure Function can close the loop directly.

## Two governance gotchas

The environment enforced a policy that disables local (SAS key) authentication on both
Event Hubs and the Foundry account. That produced two failures worth noting:

- **CES could not authenticate to Event Hubs.** A standalone SQL Server instance can
  only use a SAS token for CES; Microsoft Entra authentication for CES requires an
  Arc-enabled or Azure VM instance. The fix was a resource-group–scoped **policy
  exemption** that re-allows SAS on the namespace.
- **Foundry rejected API keys.** Because Foundry is a cloud resource, the cleaner fix
  applied: **Microsoft Entra authentication** with a token credential, which is the
  recommended production pattern regardless.

## A few implementation notes

- **The AI step is a direct model call, not an agent.** The consumer makes a single,
  stateless chat-completion request to the gpt-5.4 deployment. There is no agent, thread,
  or tool loop — which keeps the path simple and avoids the orchestration failure modes
  that managed agents can introduce. An agent is the right tool only when the model needs
  to call tools or retrieve data; for example, to ground the new ship date on real
  lead-time data rather than inventing it.
- **CES is table-based.** A stream group tracks whole tables, not arbitrary column lists;
  the only knobs are whether to include all columns and the before-image. To change what
  is streamed, alter the table.
- **A nightly policy reset.** The governance policy re-disables local authentication on the
  Event Hubs namespace overnight, so the SAS fix has to be re-applied each morning — a small
  operational reality of running a preview feature inside a governed subscription.

## Result

A change to a local SQL Server 2025 table now appears, within seconds, as a
schema-validated, AI-enriched shipping update on a hosted page — for example, an
estimated ship date pulled in from September to July with a ready-to-send customer
message. The full source, infrastructure scripts, and run instructions are available
at [github.com/notesbyjosh/contoso-ces-poc](https://github.com/notesbyjosh/contoso-ces-poc).

> Change Event Streaming is in public preview on SQL Server 2025. Validate the current
> status on Microsoft Learn before relying on it in production.
