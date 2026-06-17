---
layout: post
title: "Power BI aggregations in a composite model (DirectQuery fact + Import dimensions)"
tags: [power-bi, aggregations, composite-models, directquery]
---

A customer asked me a great batch of questions about Power BI aggregation tables:
how to design them, whether they work when the fact table is **DirectQuery** but the
dimensions come from a **Dataflow (Import)**, how to tell whether a query actually
*hits* the aggregation, and why they could only ever set a table to Import or
DirectQuery — never **Dual**. Here's the write-up I put together, plus a sketch of
how the pieces fit.

<figure>
  <img src="{{ '/assets/images/powerbi-aggregations.png' | relative_url }}"
       alt="Power BI aggregations in a composite model: a query router sends a DAX query to an Import aggregation table on a hit, or falls back to the DirectQuery detail fact on a miss, with Dual dimensions serving both paths." />
  <figcaption>Aggregations route transparently: an agg HIT is served from the in-memory table; a MISS falls back to the DirectQuery detail fact. Dual dimensions serve both paths.</figcaption>
</figure>

## 1. Designing &amp; implementing aggregation tables

- **Use a star schema** with single-direction relationships from dimensions to the
  fact. Aggregations rely on clean relationships.
- **Build the aggregation table at the grain you actually query** — e.g. Date (or
  month) × Brand × Territory/Group-key, with pre-summed measures.
- **Pre-aggregate at the source where possible.** Materialize the agg table in the
  warehouse/lakehouse (a summarized view or table) so it stays consistent with the
  detail and is easy to refresh.
- **Set the agg table to Import (or Dual).** It must be in-memory to be fast.
- **Map it via Manage Aggregations** (Model view → right-click the agg table →
  *Manage aggregations*): key columns → **GroupBy**; measure columns →
  **Sum / Count / Min / Max / Count table rows**.
- **Prefer relationship-based (precedence) aggregations** by relating the agg table
  to the same Dual dimensions — more flexible than GroupBy-only mapping because
  dimension attributes can trigger agg hits.
- **Hide the agg table** from report authors — it works transparently behind your
  existing measures.

## 2. Does it work with a DirectQuery fact + Import (Dataflow) dimensions?

**Yes — this is exactly what composite models are for.** The key is the storage mode
of the *dimensions*, not just the fact:

| Table | Recommended storage mode |
|---|---|
| Detail fact (e.g. `FACT_POS`) | **DirectQuery** |
| Aggregation table | **Import** (or Dual) |
| Dimensions (Date, Item, Stores, Exchange Rate) | **Dual** |

**Why Dual for the dimensions is critical:**

- When a query is answered by the **Import agg table**, the dimensions need to behave
  as **Import** (fast, in-memory).
- When a query **misses the agg and falls to the DirectQuery detail**, the dimensions
  need to behave as **DirectQuery** so the join can be pushed down.
- A dimension left as **pure Import** forces every detail (miss) query into a
  **limited (weak) cross-source relationship**, which is slower. Dual avoids that on
  the agg-hit path.

**One important caveat:** if the dimensions come from a **Dataflow**, that's a
*different source* than a Databricks/warehouse **DirectQuery** fact. Detail-path
joins are then **cross-source ("limited") relationships** — Power BI can't fold the
dim↔fact join into the source and joins in its own engine. Aggregation **hits are
unaffected**, but **agg misses to the detail will be slower**. If detail performance
matters, source the dimensions from the **same DirectQuery source** (in Dual) so
detail joins fold natively.

## 3. Validating &amp; troubleshooting whether aggregations are hit

The reliable way is a trace:

- **DAX Studio → Server Timings:** run a visual's query. An **agg hit** shows scans
  only against the in-memory agg/dim tables, with **no SQL sent** to the source. An
  **agg miss** shows a **DirectQuery SQL** event sent to the source.
- **SQL Server Profiler** (connect to the model): trace the
  **"Aggregate Table Rewrite Query"** event. Each query emits JSON with
  `matchingResult` = `matchFound` (agg used) or a reason it didn't match.
- **Performance Analyzer** in Desktop to capture the DAX, then paste into DAX Studio.
- Common miss reasons: a measure references a column with no Sum mapping, mismatched
  data types between agg and detail columns, or a dimension not in Dual mode.

## 4. Is one DirectQuery source — or an all-fields fact — required?

**Neither is required.** Aggregations work across mixed storage modes. For *optimal*
performance, though: the agg table should be Import/Dual, the dimensions should be
Dual, and for the detail (miss) path to be efficient the dims ideally share the
**same DirectQuery source** as the fact so joins fold. Cross-source dims work but use
limited relationships on the detail path. So the "all same source" guidance only
improves the **detail fallback**, not the agg hits.

## 5. Best-practice design patterns for composite models

- Star schema, single-direction relationships, no bi-directional filters on the agg
  path.
- Agg table small enough to live comfortably in memory; keep it summarized.
- **Match data types exactly** between agg GroupBy columns and the detail columns.
- Dimensions in **Dual**; detail fact in **DirectQuery**; agg in **Import**.
- Prefer **relationship-based aggregations** over pure GroupBy.
- Hide the agg table; keep all reporting on the existing measures.
- Where feasible, keep dims and fact in the **same source** to avoid limited
  relationships.
- Validate every key measure/visual with a Profiler trace before shipping.
- Consider **Automatic Aggregations** (Premium/PPU) to let the service train aggs
  from real query patterns.

## 6. Why you can only pick Import or DirectQuery (no Dual)

Dual is real but a bit hidden. Set it in **Model view → select the table →
Properties pane → Advanced → Storage mode.**

- Dual only appears once the model is genuinely a **composite model** — i.e. it
  already contains at least one **DirectQuery** table. If the fact isn't yet
  DirectQuery in the model, Dual won't be offered.
- Dual is **not offered** for calculated tables, or tables whose source can't support
  it.
- A Dataflow (Import) dimension **can** be set to Dual. If you only see
  Import/DirectQuery on a dim, confirm: (a) the model already has a DirectQuery table,
  and (b) you're on the table node in **Model view**, not editing in Power Query.

## 7. Do all measures need to live on the DirectQuery table?

**No** — a common misconception.

- Aggregations map **columns, not measures**. You map base columns (e.g. `Sum` of
  `FACT_POS[SalesAmount]`) in Manage Aggregations.
- **Measures can live anywhere** — ideally on a dedicated, empty measures table. A
  measure defined as `SUM(FACT_POS[SalesAmount])` is **automatically** answered by
  the agg as long as that column has a matching **Sum** mapping.
- What *does* matter: any column a measure relies on must have a corresponding
  aggregation mapping. If a measure touches an unmapped column, *that* query falls
  through to the detail.

## Bottom line

Keep the big detail fact in **DirectQuery**, add an **Import aggregation table** at
the grain you query (e.g. Date × Brand × Territory), set the dimensions to **Dual**,
map **columns (not measures)**, and verify hits with DAX Studio Server Timings or the
Profiler "Aggregate Table Rewrite Query" event. The main watch-item with
Dataflow-sourced dims is the cross-source *limited* relationship on the detail path —
if detail-query speed becomes an issue, move those dims onto the same DirectQuery
source in Dual mode.
