import ctypes
import os

from diff_c.diff import diff
from fastapi import APIRouter

from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from ..utils.types import CytoscapeEdge, CytoscapeElement, CytoscapeNode, Edge
from .csv_import import CSV_DIR

router = APIRouter(prefix="/{graph_name}/diff")

iteration_count = ctypes.c_int(0)
cancel_flag = ctypes.c_bool(False)


@router.post("/start/{other_graph_name}")
def calculate_diff(graph_name: str, other_graph_name: str, max_iterations: int):
    iteration_count.value = 0
    cancel_flag.value = False
    driver.execute_query(
        "MATCH ({graph: $graph})-[r]->() SET r.value = 0", graph=graph_name
    )
    edges = diff(
        os.path.join(CSV_DIR, graph_name),
        os.path.join(CSV_DIR, other_graph_name),
        max_iterations,
        iteration_count,
        cancel_flag,
    )
    driver.execute_query(
        "UNWIND $data AS row "
        "MATCH (:Method {id: row.source_id, graph: $graph})-[r]->(:Method {id: row.target_id, graph: $graph}) "
        "SET r.value = row.value",
        graph=graph_name,
        data=[
            {"source_id": k[0], "target_id": k[1], "value": v} for k, v in edges.items()
        ],
    )
    driver.execute_query(
        "MERGE (meta:Meta {graph_name: $graph}) SET meta.other_graph = $other_graph",
        graph=graph_name,
        other_graph=other_graph_name,
    )
    return {
        "message": f"Difference with {other_graph_name} calculated: {iteration_count.value - 1} iterations"
    }


@router.post("/cancel")
def cancel_diff():
    global cancel_flag
    cancel_flag.value = True
    return


@router.get("/edges")
def get_top_edges(graph_name: str, n: int):
    records = driver.execute_query(
        "MATCH (source {graph: $graph})-[r]->(target) WHERE r.value IS NOT NULL "
        "ORDER BY r.value DESC RETURN source, r, target LIMIT $n",
        graph=graph_name,
        n=n,
    ).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        source, r, target = record
        edge: Edge = {
            "source": source["id"],
            "target": target["id"],
            "value": r["value"],
        }
        cy_nodes |= node_to_cy(source) | node_to_cy(target)
        cy_edges |= edge_to_cy(edge)

    return {"nodes": list(cy_nodes.values()), "edges": list(cy_edges.values())}
