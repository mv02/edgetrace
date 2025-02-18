import csv
import io
import logging

from fastapi import APIRouter, UploadFile

from ..driver import driver
from ..utils import CytoscapeElement, invoke_to_cy, method_to_cy, methods_to_tree

logger = logging.getLogger("uvicorn")
logger.propagate = False

router = APIRouter()


@router.get("/databases")
def get_databases():
    records = driver.execute_query("SHOW DATABASES WHERE type='standard'").records
    return [record.data() for record in records]


@router.get("/tree")
def get_method_tree():
    records = driver.execute_query(
        "MATCH (m:Method) RETURN m.Id AS id, m.Name AS name, m.Type AS type ORDER BY type, name"
    ).records

    methods: list[dict] = []
    for record in records:
        data = record.data()
        methods.append(
            {"id": int(data["id"]), "name": data["name"], "type": data["type"]}
        )
    return methods_to_tree(methods)


@router.get("/method/{id}")
def get_method_by_id(id: str):
    record = driver.execute_query(
        "MATCH (m:Method { Id: $id }) "
        "OPTIONAL MATCH (caller:Method)-->(m) "
        "OPTIONAL MATCH (m)-->(callee:Method) "
        "RETURN m, collect(caller) AS callers, collect(callee) AS callees",
        id=id,
    ).records[0]

    m, callers, callees = record
    result: list[CytoscapeElement] = [method_to_cy(m, "navy")]
    for caller in callers:
        result += [method_to_cy(caller), invoke_to_cy(caller, m)]
    for callee in callees:
        result += [method_to_cy(callee), invoke_to_cy(m, callee)]
    return result


@router.post("/import")
def import_csv(files: list[UploadFile]):
    csv_files = {file.filename: file for file in files}

    # Delete all nodes and edges, create uniqueness constraints
    logger.info("Purging database")
    driver.execute_query("MATCH ()-[r]-() DELETE r")
    driver.execute_query("MATCH (n) DELETE n")
    driver.execute_query(
        "CREATE CONSTRAINT unique_method_id IF NOT EXISTS "
        "FOR (m:Method) REQUIRE m.Id IS UNIQUE"
    )
    driver.execute_query(
        "CREATE CONSTRAINT unique_invoke_id IF NOT EXISTS "
        "FOR (i:Invoke) REQUIRE i.Id IS UNIQUE"
    )

    # Create method nodes
    logger.info("Creating method nodes")
    methods_csv = io.TextIOWrapper(csv_files["call_tree_methods.csv"].file)
    reader = csv.DictReader(methods_csv)
    (node_count,) = driver.execute_query(
        "UNWIND $data as row CREATE (m:Method) SET m += row RETURN count(*) AS node_count",
        data=[row for row in reader],
    ).records[0]

    # Create temporary invoke nodes
    logger.info("Creating temporary invoke nodes")
    invokes_csv = io.TextIOWrapper(csv_files["call_tree_invokes.csv"].file)
    reader = csv.DictReader(invokes_csv)
    driver.execute_query(
        "UNWIND $data as row CREATE (i:Invoke) SET i += row",
        data=[row for row in reader],
    )

    # Create edges between method nodes
    logger.info("Creating edges between method nodes")
    targets_csv = io.TextIOWrapper(csv_files["call_tree_targets.csv"].file)
    reader = csv.DictReader(targets_csv)
    (edge_count,) = driver.execute_query(
        "UNWIND $data AS row "
        "MATCH (t:Method { Id: row.TargetId }) "
        "MATCH (i:Invoke { Id: row.InvokeId }) "
        "MATCH (s:Method { Id: i.MethodId }) "
        "MERGE (s)-[r:CALLS]->(t) "
        "RETURN count(DISTINCT r) AS edge_count",
        data=[row for row in reader],
    ).records[0]

    # Delete temporary invoke nodes
    logger.info("Deleting temporary invoke nodes")
    driver.execute_query("MATCH (i:Invoke) DELETE i")

    message = f"Imported {node_count} nodes and {edge_count} edges"
    logger.info(message)
    return {"message": message}
