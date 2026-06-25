---
layout: post
title: "Azure ML and Microsoft Fabric: the Titanic dataset, built two ways"
tags: [azure-ml, fabric, fabric-data-science, onelake, direct-lake, power-bi, mlflow]
---

Azure Machine Learning (AML) and Microsoft Fabric both train, register, and score machine
learning models, but they sit at different points in the data and AI lifecycle. To make the
boundary concrete, this post walks through the same project — predicting survival on the classic
Titanic dataset — built two ways: once with **Azure ML reading from Fabric**, and once **entirely
inside Fabric**. The goal is not the best model; it is to understand what each platform does, where
they overlap, and how they complement each other.

Both builds reach the same result: a logistic-regression classifier at roughly **80% accuracy
(ROC AUC 0.84)**, with predictions served back to Power BI. What differs is the machinery around
that model.

<figure>
  <img src="{{ '/assets/images/azureml-fabric-titanic-architecture.png' | relative_url }}"
       alt="Architecture diagram with two rows. Build A: a Titanic CSV is loaded by a Fabric notebook into a Lakehouse Delta table in OneLake; Azure ML reads that table over abfss with no copy through a datastore and data asset, trains on a compute cluster, and registers the model. Build B: a single Fabric notebook ingests, trains, registers, and scores; the predictions Delta table feeds a Direct Lake semantic model and a Power BI report. A caption notes that OneLake Delta is the shared substrate that data never leaves." />
  <figcaption>The same model, two platforms, joined at OneLake. Azure ML reads Fabric data over <code>abfss://</code>; Fabric reads and writes it natively.</figcaption>
</figure>

## The shared foundation: OneLake

The single most important concept is **OneLake**, Fabric's tenant-wide data lake. Every Fabric
Lakehouse stores its tables as **Delta** (Parquet files plus a `_delta_log` transaction log) in
OneLake. Because Delta is an open format, engines outside Fabric — including Azure ML — can read
those exact files directly through the `abfss://` driver. No copy, no export, no ETL.

OneLake is what makes the two platforms complementary rather than competing: Fabric owns the data
and the business-intelligence layer; Azure ML owns the heavyweight machine-learning lifecycle; and
they meet on the same physical Delta files.

## Build A: Azure ML reading from Fabric

In this build, Fabric is the data platform and Azure ML is the ML platform.

1. A Fabric **notebook** ingests the Titanic CSV and writes it as a Delta table (`titanic`) in a
   Lakehouse.
2. An Azure ML **OneLake datastore** points at that Lakehouse, and a **data asset** references the
   `titanic` Delta table.
3. An Azure ML **command job** runs on a compute cluster, reads the table directly from OneLake,
   trains a scikit-learn pipeline, and logs everything to **MLflow**.
4. The model is registered in the **Azure ML model registry** as `titanic-survival`.
5. The trained model is moved into Fabric's own MLflow registry, and predictions are written back
   to OneLake for Power BI.

The instructive part is the asymmetry: reading Fabric data into Azure ML is smooth, but the natural
place to **land** model outputs is Fabric itself. Writing predictions back to OneLake from the
training job fails with a permission error, because the OneLake datastore supports
identity-passthrough reads but not the output-mount write path. The fix is to write predictions
from a Fabric notebook instead.

## Build B: entirely inside Fabric

The second build never leaves Fabric. A single **Fabric Data Science notebook** runs the whole
lifecycle in one Spark session: ingest the CSV into a Delta table, train a scikit-learn pipeline
tracked by Fabric's built-in MLflow, register the model as a first-class Fabric **ML model** item,
and score every passenger into a `titanic_predictions` Delta table.

Keeping training and scoring in one session matters: the model is trained and used with identical
library versions, which sidesteps a real failure mode where a model pickled with one scikit-learn
build fails to load under a slightly different one.

## Serving predictions to Power BI

Both builds finish by writing a `titanic_predictions` Delta table that Power BI reads with no data
movement. In the Fabric-only build, a **Direct Lake** semantic model sits over that table, with DAX
measures such as *Model Accuracy* and *Predicted Survival Rate*, and a report visualizes it. Direct
Lake queries the Delta files in OneLake directly — there is no import and no refresh.

<figure>
  <img src="{{ '/assets/images/azureml-fabric-titanic-report.png' | relative_url }}"
       alt="A Power BI report titled Titanic survival predictions. Two cards show 80.2% model accuracy and 891 passengers. A clustered column chart shows predicted survival rate by passenger class and sex, with first- and second-class women near 100% and second- and third-class men near zero. A table lists each class and sex with passenger counts, predicted survival rate, and average survival probability." />
  <figcaption>Predicted survival is near-certain for first- and second-class women and effectively zero for second- and third-class men — the classic "women and children first, by class" pattern, learned from data rather than coded by hand.</figcaption>
</figure>

## Side-by-side comparison

| Aspect | Build A — Azure ML + Fabric | Build B — Fabric only |
|---|---|---|
| Compute | Dedicated Azure ML compute cluster (VMs) | Fabric Spark pool on the capacity |
| Experiment tracking | Azure ML MLflow | Fabric MLflow |
| Model registry | Azure ML model registry | Fabric ML model item |
| Data location | OneLake, read over `abfss://` | OneLake, read natively |
| Setup friction | Datastore, data asset, cluster, identity, jobs | One notebook |
| Billing model | Separate per-VM compute | Shared capacity units (CUs) |
| Best for | Large-scale training, real-time serving, MLOps | Prototyping, batch scoring next to the data and BI |

## When to use which

Reach for **Fabric Data Science** when the data already lives in OneLake, the consumers are Power BI
users, and the need is prototyping or batch scoring written straight back to a Lakehouse with low
operational overhead.

Reach for **Azure ML** when the model needs real-time serving through a managed online endpoint,
when training is heavy (GPU clusters, distributed training, large-scale AutoML and hyperparameter
sweeps), or when the project requires formal MLOps such as CI/CD, Responsible AI dashboards, and
model monitoring.

A practical rule of thumb: **prototype and batch-score in Fabric; train at scale, serve in real
time, and operationalize in Azure ML** — and let OneLake be the shared substrate so data never has
to be copied between them.

## Gotchas worth knowing

A few rough edges surfaced while building this, all worth noting:

- **Writing predictions back to OneLake from an Azure ML job fails** with a permission error.
  Identity-passthrough reads work; the output-mount write path does not. Write predictions from a
  Fabric notebook instead.
- **`az ml datastore create` for a OneLake datastore** throws *"Object of type Datastore is not
  JSON serializable"* — a CLI bug. Create the datastore through the ARM REST API.
- **Azure ML workspace storage** can have shared-key auth disabled by tenant policy, which blocks
  CLI log downloads. Grant the user `Storage Blob Data Reader` and read logs over Entra auth.
- **An inline `%pip install` in a batch Fabric notebook** restarts the interpreter and cancels the
  Spark session. Rely on the runtime's built-in libraries, or attach a pinned environment.

## The model is portable in both directions

Because Azure ML and Fabric both speak MLflow, a model can move either way. Azure ML to Fabric:
download the MLflow model and register it as a Fabric ML model item, then score with Fabric's
no-code `PREDICT`. Fabric to Azure ML: register a Fabric-trained model into Azure ML to deploy it to
a managed endpoint or wire it into a release pipeline. The two registries are separate, so the model
is moved rather than shared — but the artifact format is identical, which makes the move trivial.

## Summary

Azure ML and Fabric are not substitutes; they are two halves of one platform story joined at
OneLake. Fabric brings the data, the notebooks, and the BI; Azure ML brings scalable training,
real-time serving, and MLOps. Building the same Titanic project both ways makes the boundary
concrete: the model is the easy part, and the platform choice is really a choice about **where the
data lives, who consumes the output, and how the model needs to be operated**.

The full code for both builds — notebooks, Azure ML job definitions, the Direct Lake semantic model,
and the Power BI report — is on GitHub at
[notesbyjosh/azureml-fabric-titanic](https://github.com/notesbyjosh/azureml-fabric-titanic).
