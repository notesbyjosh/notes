---
layout: post
title: "Three ways to migrate Documentum content to Azure Data Lake Storage Gen2"
tags: [documentum, cmis, adls-gen2, azure-data-factory, logic-apps, alfresco, migration, bicep, terraform]
---
Migrating a document repository out of OpenText Documentum and into Azure is a common first
step toward modernization, archival, and AI-grounded search. This post walks through a proof of
concept that moves documents from a Documentum-compatible source into Azure Data Lake Storage
(ADLS) Gen2 using three interchangeable mechanisms, and explains why the same approach points at a
real Documentum repository by changing a single URL.

<figure>
  <img src="{{ '/assets/images/documentum-adls-migration-as-built.png' | relative_url }}"
       alt="Architecture diagram. An Azure VM runs an Alfresco Community Edition stack (Alfresco, Solr, Share, Transform, Postgres, ActiveMQ) in Docker Compose, acting as a Documentum stand-in over CMIS. Three mechanisms read the source: a Python migrator on the VM, an Azure Data Factory pipeline, and a Logic App. All three write to an ADLS Gen2 account with managed-identity authentication, landing content under per-mechanism paths. A downstream box shows Azure AI Search to Foundry as the next phase." />
  <figcaption>An Alfresco/CMIS source stands in for Documentum. A Python migrator, an Azure Data Factory pipeline, and a Logic App each copy content into ADLS Gen2 using managed-identity auth.</figcaption>
</figure>

## Why CMIS is the key

Documentum exposes the **Content Management Interoperability Services (CMIS)** open standard. CMIS
defines a repository model (documents, folders, properties, ACLs) and a query language, served over
HTTP through either an AtomPub/XML binding or a Browser/JSON binding. Because CMIS is a standard,
code written against it is portable across any compliant repository.

That portability is what makes the proof of concept practical. A live Documentum instance is not
always available for development, so the PoC uses **Alfresco Community Edition** as the source.
Alfresco speaks CMIS 1.1, the same standard Documentum exposes, so every mechanism built here points
at a production Documentum endpoint by changing the base URL and credentials. There is no
first-party Documentum connector for Azure Data Factory or Logic Apps; CMIS over the generic HTTP
connector is the supported, durable path.

## The source environment

The source runs as a Docker Compose stack on a single Azure virtual machine. Alfresco Community
Edition provides the CMIS endpoint and repository, backed by PostgreSQL for metadata and an Apache
Solr container for search. A small seeding script creates a representative document set — contracts,
invoices organized by year, and policies — so the migration has a realistic folder tree to move.

The Solr container matters more than it first appears. CMIS supports two ways to enumerate content:
a SQL-style **query** (`SELECT ... FROM cmis:document WHERE IN_TREE('<folder-id>')`) and **folder
navigation** (walking children and descendants). The query path is concise but depends on the
repository's search index being healthy and current. The navigation path needs no index at all. For
Documentum, the equivalent index is **xPlore**, so confirming index health is part of planning which
enumeration strategy to use.

## The target: ADLS Gen2 with no storage keys

Every mechanism writes to an ADLS Gen2 account that has hierarchical namespace enabled, so folder
paths are real directories rather than name prefixes. Authentication uses **managed identities**
rather than storage account keys. The VM, the Data Factory, and the Logic App each have a
system-assigned identity granted the **Storage Blob Data Contributor** role on the account. This is
the security pattern customers expect, and it removes secrets from the migration path entirely.

## Mechanism one: a Python migrator

The highest-fidelity option is a Python script that runs on the VM. It walks the CMIS folder tree by
navigation, so it does not depend on the search index, and for each document it copies the content
stream into ADLS Gen2 while also writing a sidecar JSON manifest. The manifest captures the object
identifier, version label, MIME type, size, audit fields, custom metadata, and the document's access
control entries. Because the script walks folders, it reproduces the source folder structure exactly.
Authentication to storage uses `DefaultAzureCredential`, which resolves to the VM's managed identity.

This option is the right fit when the migration needs custom logic or full metadata and ACL fidelity.

## Mechanism two: Azure Data Factory

The second option is an Azure Data Factory pipeline, which is closest to what a production migration
at scale looks like. A Web activity runs a CMIS query to enumerate the documents, a ForEach activity
iterates the results in parallel, and a Copy activity streams each document from the CMIS content
endpoint (an HTTP binary source) directly into an ADLS Gen2 binary sink. Data Factory contributes the
orchestration concerns that matter in production: parallelism, retries, scheduling, and monitoring.

The base pipeline writes documents into a single folder, because the enumeration query returns
documents but not their paths — in CMIS, `cmis:path` is a property of folders, not documents. To
mirror the source tree, a second pair of pipelines enumerates folders (which do carry `cmis:path`)
and, for each folder, invokes a child pipeline that copies that folder's documents to the matching
ADLS path. Data Factory does not allow a ForEach nested directly inside another ForEach, so the
parent/child pipeline pattern is the idiomatic way to express the recursion.

## Mechanism three: a Logic App

The third option is a Consumption Logic App. A request trigger starts a workflow that calls the CMIS
query over HTTP, iterates the results with a For Each action, fetches each document's content, and
writes it to ADLS Gen2 with an HTTP PUT to the Blob REST API. The PUT authenticates with the Logic
App's managed identity. One detail is worth recording: writing to Blob storage with a managed-identity
bearer token requires an explicit `x-ms-version` header; without it, the request returns a 403 with
the message that the bearer scheme is not supported in that version. This option suits lightweight,
event-driven integration where a low-code workflow is preferred.

## How much of this is code?

A fair question, given that the result is mostly Azure resources. The honest breakdown is roughly 70
percent infrastructure as code and declarative configuration, with the remainder split between a
small amount of Python and some PowerShell glue. The ADLS Gen2 account, the VM, the Data Factory and
its pipeline, and the Logic App are all defined in **Bicep**, with a **Terraform** equivalent for the
Data Factory solution. The source stack is a Docker Compose file. The Data Factory and Logic App
definitions are declarative JSON. The only bespoke application code is the two Python scripts — the
migrator and the seeder. In other words, the migration is overwhelmingly platform configuration, not
custom software.

## Pointing at a real Documentum repository

Reproducing the PoC against a production Documentum environment changes a handful of values and
nothing else: the CMIS base URL becomes the Documentum REST/CMIS endpoint, the credentials become a
service account sourced from Azure Key Vault, the source folder identifier becomes the cabinet or
folder to migrate, and the target becomes the customer's ADLS Gen2 account. When the Documentum
instance is on-premises, a **Self-Hosted Integration Runtime** (for Data Factory) or an on-premises
data gateway (for Logic Apps) bridges the network boundary.

## Where this leads

Landing content in ADLS Gen2 is deliberate. The next phase connects the migrated content to **Azure
AI Search** and **Azure AI Foundry** for retrieval-augmented generation. AI Search has a native
Blob and ADLS Gen2 indexer with built-in document cracking and integrated vectorization, and Foundry
grounds models on an AI Search index. There is no native AI Search indexer for SMB file shares, which
is one more reason the migration targets Blob storage. Carrying document metadata across as sidecar
records pays off again here: those fields become filterable facets in the search index and citations
in the generated answers.

The full proof of concept — Bicep and Terraform, the Docker Compose source stack, the Python scripts,
and the exported Data Factory and Logic App definitions — is published as a reproducible repository so
the environment can be rebuilt from scratch when needed:
[notesbyjosh/documentum-adls-migration](https://github.com/notesbyjosh/documentum-adls-migration).
