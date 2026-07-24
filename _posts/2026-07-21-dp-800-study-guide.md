---
layout: post
title: "DP-800 study guide: Developing AI-Enabled Database Solutions"
tags: [sql-server, azure-sql, fabric, ai, certification, dp-800, vectors, vector-search, rag, mcp, embeddings, dab]
---

This is my working study guide for **Exam DP-800: Developing AI-Enabled Database
Solutions** — the first SQL certification where **AI is a weighted, first-class
domain** rather than a footnote. It spans the whole modern SQL family — **SQL Server,
Azure SQL, and SQL database in Microsoft Fabric** — and assumes you can not only write
T-SQL but also wire up **embeddings, vector search, and RAG *inside the database***.
I'm keeping it here as a single reference I can revise as I work through each objective.

## Exam at a glance

| Item | Detail |
| --- | --- |
| Certification | Microsoft Certified: Developing AI-Enabled Database Solutions |
| Exam | DP-800 |
| Passing score | **700 / 1000** |
| Primary language | T-SQL |
| Platforms | SQL Server, Azure SQL, SQL database in Microsoft Fabric |
| Scope | Mostly GA features; commonly used Preview features may appear |
| Skills version | As of March 12, 2026 |

The audience profile is a developer who writes T-SQL and builds databases and who is now
expected to be fluent in **embeddings, vectors, and models**. In one line: it's a
database-developer exam that assumes you can also build semantic search and RAG *without
leaving SQL*.

## Skills measured &amp; weighting

| Domain | Weight |
| --- | --- |
| 1. Design and develop database solutions | 35–40% |
| 2. Secure, optimize, and deploy database solutions | 35–40% |
| 3. **Implement AI capabilities in database solutions** | **25–30%** |

Domains 1 and 2 are the bread-and-butter T-SQL and ops work; Domain 3 is the
differentiator and where I spend the most *new* study time. Below is the full objective
breakdown, then the AI features worth knowing cold, a study plan, and a vocabulary list.

## Domain 1 — Design &amp; develop (35–40%)

- **Database objects:** tables (data types, indexes, **columnstore**); specialized tables
  — **in-memory**, **temporal**, **external**, **ledger**, and **graph**; **JSON columns
  and indexes**; constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `DEFAULT`);
  `SEQUENCES`; and table/index **partitioning**.
- **Programmability:** views, scalar functions, table-valued functions, stored procedures,
  and triggers.
- **Advanced T-SQL:** CTEs and window functions; **JSON functions** (`JSON_OBJECT`,
  `JSON_ARRAY`, `JSON_ARRAYAGG`, `JSON_CONTAINS`, `OPENJSON`, `JSON_VALUE`); **regular
  expressions** (`REGEXP_LIKE`, `REGEXP_REPLACE`, `REGEXP_SUBSTR`, `REGEXP_INSTR`,
  `REGEXP_COUNT`, `REGEXP_MATCHES`, `REGEXP_SPLIT_TO_TABLE`); **fuzzy matching**
  (`EDIT_DISTANCE`, `EDIT_DISTANCE_SIMILARITY`, `JARO_WINKLER_DISTANCE`); graph queries with
  the **`MATCH`** operator; correlated queries; and error handling.
- **🔑 AI-assisted development:** interpret the **security impact** of AI-assisted tools;
  enable **GitHub Copilot** and **Microsoft Copilot in Fabric**; configure **model and MCP
  (Model Context Protocol) tool options** in a Copilot chat session; create **Copilot
  instruction files**; and connect to **MCP server endpoints** — including **SQL Server**
  and **Fabric lakehouse**.

Pointing Copilot at a **SQL Server MCP endpoint** is now an exam objective, not just a
party trick.

## Domain 2 — Secure, optimize &amp; deploy (35–40%)

- **Security &amp; compliance:** **Always Encrypted** and column-level encryption; **Dynamic
  Data Masking**; **Row-Level Security**; object-level permissions; **passwordless** access;
  auditing; and — new — **securing model endpoints with Managed Identity** and **securing
  GraphQL, REST, and MCP endpoints**.
- **Performance:** database configuration; **transaction isolation levels** and concurrency
  control; reading **execution plans, DMVs, Query Store, and Query Performance Insight**;
  and resolving **blocking and deadlocks**.
- **CI/CD with SQL Database Projects:** unit + integration testing; reference/static data in
  source control; **SDK-style** database projects; branching, PRs, and conflict resolution;
  **secrets management**; **schema-drift** detection; and deployment-pipeline controls
  (branch policies, approvals, code owners).
- **Azure integration — Data API builder (DAB):** config files; entities for **REST and
  GraphQL** with caching, pagination, search, and filtering; exposing stored procedures and
  views; DAB deployment; **Azure Monitor** (App Insights, Log Analytics); and change handling
  via **CDC, Change Tracking, change event streaming (CES)**, Azure Functions SQL trigger
  binding, or Logic Apps.

If you've built a DAB SQL MCP server before, this domain is home turf — but give the
**securing MCP/REST/GraphQL endpoints** angle a careful pass.

## Domain 3 — 🔑 Implement AI capabilities (25–30%)

The heart of the cert, in three sub-areas.

**Models &amp; embeddings.** Evaluate **external models** (multimodal, multilanguage, size,
**structured output**); create and manage external models; choose an **embedding
maintenance method** (table triggers, Change Tracking, Azure Functions SQL trigger binding,
Logic Apps, CDC, CES, or **Microsoft Foundry**); pick **which columns** to embed; design
**chunking**; and generate the embeddings.

**Intelligent search.** Choose between **full-text**, **semantic vector**, and **hybrid**
search; design **vector data** (the **`VECTOR` type**, vector indexes, dimensions); use the
vector functions **`VECTOR_NORMALIZE`, `VECTOR_DISTANCE`, `VECTORPROPERTY`, `VECTOR_SEARCH`**;
choose **ANN vs ENN** (approximate vs exact nearest neighbor); evaluate index types and
distance metrics; implement **hybrid search** and **Reciprocal Rank Fusion (RRF)**; and
measure search performance.

**Retrieval-Augmented Generation (RAG).** Identify RAG use cases; build a prompt with the
**`sp_invoke_external_rest_endpoint`** stored procedure; convert structured data to JSON for
the model; send results to a language model; and extract the response.

### What Domain 3 looks like in T-SQL

The thing that makes this domain click is realizing how *little* leaves the database. You
store embeddings in a `VECTOR` column, search them with `VECTOR_SEARCH`, and call the model
over REST — all from T-SQL:

```sql
-- 1) A vector column holds the embedding for each chunk
CREATE TABLE dbo.DocChunks (
    ChunkId     INT IDENTITY PRIMARY KEY,
    DocId       INT NOT NULL,
    ChunkText   NVARCHAR(MAX) NOT NULL,
    Embedding   VECTOR(1536) NOT NULL      -- dimensions match your model
);

-- 2) Semantic search: exact nearest neighbors (ENN) to a query embedding
SELECT TOP (5) c.ChunkId, c.ChunkText,
       VECTOR_DISTANCE('cosine', c.Embedding, @queryEmbedding) AS Distance
FROM   dbo.DocChunks AS c
ORDER  BY Distance;     -- smaller cosine distance = more similar

-- 3) Or approximate nearest neighbors (ANN) once a vector index exists — faster at scale
SELECT s.ChunkId, s.ChunkText, s.distance
FROM   VECTOR_SEARCH(
           TABLE      = dbo.DocChunks AS c,
           COLUMN     = Embedding,
           SIMILAR_TO = @queryEmbedding,
           METRIC     = 'cosine',
           TOP_N      = 5
       ) AS s;

-- 4) RAG: call an external model with the retrieved context
DECLARE @response NVARCHAR(MAX);
EXEC sp_invoke_external_rest_endpoint
     @url     = N'https://my-foundry.openai.azure.com/.../chat/completions?api-version=2024-10-21',
     @method  = 'POST',
     @headers = @headers,           -- auth via Managed Identity, no keys in code
     @payload = @jsonPayloadWithContext,
     @response = @response OUTPUT;
```

Retrieve with vectors, ground the model on what you found, generate the answer — the same
RAG loop you'd build in app code, except retrieval lives **in the database** and the model
call is one stored procedure. **Hybrid search** just adds a full-text query alongside the
vector search and blends the two ranked lists with **RRF**.

A few facts worth memorizing:

- **Cosine distance:** smaller = more similar (0 means identical direction).
- **`VECTOR_SEARCH`** is **ANN** and needs a vector index; **`VECTOR_DISTANCE`** in an
  `ORDER BY` is **ENN** — a full scan, exact but slower.
- **RRF** is the standard way to combine keyword and vector results.
- The dimension of your **`VECTOR(n)`** column **must equal** the embedding model's output
  dimension.
- Prefer **Managed Identity** over API keys when SQL authenticates to a model endpoint.

## My 5-week plan

| Week | Focus |
| --- | --- |
| 1 | Domain 1 T-SQL refresh — JSON, regex, fuzzy matching, graph `MATCH`, specialized tables |
| 2 | Domain 3a — external models, embeddings, chunking, embedding maintenance methods |
| 3 | Domain 3b — `VECTOR` type, vector indexes, `VECTOR_SEARCH`, hybrid + RRF, then RAG |
| 4 | Domain 2 — Always Encrypted, RLS, DDM, securing REST/GraphQL/MCP, Query Store |
| 5 | SQL Database Projects + DAB + CI/CD, then the free practice assessment and review |

## Vocabulary to know cold

- **Embedding** — a numeric vector capturing semantic meaning; stored in a `VECTOR` column.
- **`VECTOR` data type** — native SQL type for embeddings; the backbone of semantic search.
- **`VECTOR_DISTANCE` / `VECTOR_SEARCH`** — similarity between two vectors (with a metric) /
  index-backed nearest-neighbor search.
- **ANN vs ENN** — approximate nearest neighbor (fast, scalable) vs exact (precise, slower).
- **Distance metric** — cosine, Euclidean, or dot product; match how the model was trained.
- **Chunking** — splitting documents into passages before embedding and indexing.
- **Full-text / vector / hybrid search** — keyword / semantic similarity / both combined.
- **Reciprocal Rank Fusion (RRF)** — merges multiple ranked result sets into one score.
- **RAG** — Retrieval-Augmented Generation: retrieve, ground, then generate.
- **`sp_invoke_external_rest_endpoint`** — T-SQL proc that calls REST APIs (LLMs, Azure AI) from SQL.
- **External model** — an in-database registration of a model endpoint for embeddings/inference.
- **Embedding maintenance** — keeping embeddings fresh as rows change (triggers, Change
  Tracking, CDC, CES, Functions, Logic Apps, Foundry).
- **MCP (Model Context Protocol)** — a standard interface that lets AI agents call tools and
  data; SQL Server and Fabric both expose MCP servers.
- **DAB (Data API builder)** — auto-generates REST and GraphQL endpoints over SQL.
- **Managed Identity** — passwordless Entra-based auth; how you secure model and API endpoints.
- **Specialized tables** — in-memory (OLTP), temporal (system-versioned), external
  (virtualization), ledger (tamper-evident), graph (nodes/edges).
- **Always Encrypted / DDM / RLS** — encryption at rest and in use / masking on read /
  row-level filtering.
- **SQL Database Projects (SDK-style)** — declarative schema in source control for CI/CD.
- **Schema drift** — divergence between the project's declared schema and the live database.

## Resources

- [DP-800 study guide (objective source)](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-800)
- [Certification overview &amp; how to earn it](https://learn.microsoft.com/en-us/credentials/certifications/developing-ai-enabled-database-solutions/)
- [Exam sandbox — try the UI](https://aka.ms/examdemo)
- Product docs: [Intelligent apps with SQL Server &amp; AI](https://learn.microsoft.com/en-us/sql/relational-databases/vectors/),
  [`sp_invoke_external_rest_endpoint`](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-invoke-external-rest-endpoint-transact-sql),
  [Data API builder](https://learn.microsoft.com/en-us/azure/data-api-builder/),
  [SQL Database Projects](https://learn.microsoft.com/en-us/sql/tools/sql-database-projects/sql-database-projects)
- 📺 Microsoft Reactor: [Get Certified SQL+AI (DP-800): Bring AI to SQL with Embeddings, Search, and RAG](https://www.youtube.com/watch?v=SLXvXKb9758)

The best part is that I can practice nearly all of this in my own tenant: add a `VECTOR`
column, generate embeddings, wire up an in-database RAG query, and expose it through DAB or
an MCP server. More posts to come as I work through each domain.
