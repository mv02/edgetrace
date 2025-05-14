"""
File: backend/app/routers/csv_import.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Defines an API endpoint for importing call graphs from CSV reports.
"""

import csv
import io
import logging
import os
import shutil
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..driver import driver
from ..utils.conversions import invoke_from_csv, method_from_csv
from ..utils.types import Invoke

CSV_DIR = "csv"

logger = logging.getLogger("uvicorn")
logger.propagate = False

router = APIRouter()


@router.post("/import")
def import_csv(
    files: Annotated[list[UploadFile], File()],
    timestamps: Annotated[list[int], Form()],
    graph: Annotated[str, Form()],
):
    keys = ["methods", "invokes", "targets"]

    # Most recent files
    newest: dict[str, tuple[UploadFile, int]] = {}

    for f, t in zip(files, timestamps):
        for key in keys:
            if key not in str(f.filename) or ".csv" not in str(f.filename):
                continue
            if key not in newest or t > newest[key][1]:
                newest[key] = (f, t)

    if any(key not in newest for key in keys):
        raise HTTPException(400, f"Could not find a {key} file")

    logger.info(f"Found files: {[f[0].filename for f in newest.values()]}")

    # Save CSV files to filesystem
    location = os.path.join(CSV_DIR, graph)
    os.makedirs(location, exist_ok=True)
    for key in keys:
        with open(os.path.join(location, f"call_tree_{key}.csv"), "wb") as buffer:
            file = newest[key][0].file
            shutil.copyfileobj(file, buffer)
            file.seek(0)
    logger.info(f"CSV files saved to: {os.path.abspath(location)}")

    # Delete all nodes and edges, create uniqueness constraints and indexes
    logger.info("Purging database")
    driver.session().run(
        "MATCH (m {graph: $graph}) CALL (m) { DETACH DELETE m } IN TRANSACTIONS OF 10000 ROWS",
        graph=graph,
    )
    driver.execute_query("MATCH (m {graph: $graph}) DETACH DELETE m", graph=graph)
    driver.execute_query(
        "MATCH (meta:Meta {graph_name: $graph}) DELETE meta", graph=graph
    )
    driver.execute_query(
        "CREATE CONSTRAINT unique_method_id IF NOT EXISTS "
        "FOR (m:Method) REQUIRE (m.id, m.graph) IS UNIQUE"
    )
    driver.execute_query(
        "CREATE CONSTRAINT unique_invoke_id IF NOT EXISTS "
        "FOR (i:Invoke) REQUIRE (i.id, i.graph) IS UNIQUE"
    )
    driver.execute_query("CREATE INDEX method_id IF NOT EXISTS FOR (m:Method) ON m.id")
    driver.execute_query("CREATE INDEX invoke_id IF NOT EXISTS FOR (i:Invoke) ON i.id")
    driver.execute_query(
        "CREATE INDEX method_graph IF NOT EXISTS FOR (m:Method) ON m.graph"
    )
    driver.execute_query(
        "CREATE INDEX invoke_graph IF NOT EXISTS FOR (i:Invoke) ON i.graph"
    )

    # Create method nodes
    logger.info("Creating method nodes")
    methods_csv = io.TextIOWrapper(newest["methods"][0].file)

    reader = csv.DictReader(methods_csv)
    summary = (
        driver.session()
        .run(
            """
            UNWIND $data AS row
            CALL (row) {
              CREATE (m:Method {graph: $graph}) SET m += row
            } IN TRANSACTIONS OF 10000 ROWS
            """,
            data=[method_from_csv(row) for row in reader],
            graph=graph,
        )
        .to_eager_result()
        .summary
    )
    node_count = summary.counters.nodes_created

    # Map method IDs to element IDs
    logger.info("Mapping method IDs to element IDs")
    records = driver.execute_query(
        "MATCH (m {graph: $graph}) RETURN m.id AS id, elementId(m) AS element_id",
        graph=graph,
    ).records
    element_ids: dict[str, str] = {
        record["id"]: record["element_id"] for record in records
    }

    # Create a map of invokes
    logger.info("Parsing invokes")
    invokes_csv = io.TextIOWrapper(newest["invokes"][0].file)
    reader = csv.DictReader(invokes_csv)

    invokes: dict[str, Invoke] = {}
    for row in reader:
        invoke = invoke_from_csv(row)
        invokes[invoke["id"]] = invoke

    # Create edges between method nodes
    logger.info("Creating edges between method nodes")
    targets_csv = io.TextIOWrapper(newest["targets"][0].file)
    reader = csv.DictReader(targets_csv)

    edges: list[dict[str, str]] = []
    for row in reader:
        invoke_id = row["InvokeId"]
        invoke = invokes[invoke_id]
        edge = {
            "source_element_id": element_ids[invoke["method_id"]],
            "target_element_id": element_ids[row["TargetId"]],
        }
        edges.append(edge)

    summary = (
        driver.session()
        .run(
            """
            UNWIND $data AS row
            CALL (row) {
              MATCH (s:Method) WHERE elementId(s) = row.source_element_id
              MATCH (t:Method) WHERE elementId(t) = row.target_element_id
              MERGE (s)-[r:CALLS]->(t)
            } IN TRANSACTIONS OF 10000 ROWS
            """,
            data=edges,
            graph=graph,
        )
        .to_eager_result()
        .summary
    )
    edge_count = summary.counters.relationships_created

    message = f"Imported {node_count} nodes and {edge_count} edges"
    logger.info(message)
    return {"message": message}
