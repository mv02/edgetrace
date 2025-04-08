import os

from diff_c.diff import diff
from fastapi import APIRouter

from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from ..utils.types import CytoscapeElement, Edge
from .csv_import import CSV_DIR

router = APIRouter(prefix="/{graph_name}/diff")


@router.post("/{other_graph_name}")
def calculate_diff(graph_name: str, other_graph_name: str, max_iterations: int):
    driver.execute_query(
        "MATCH ({graph: $graph})-[r]->() SET r.value = 0", graph=graph_name
    )
    edges = diff(
        os.path.join(CSV_DIR, graph_name),
        os.path.join(CSV_DIR, other_graph_name),
        max_iterations,
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
    return


@router.get("/edges")
def get_top_edges(graph_name: str, n: int):
    records = driver.execute_query(
        "MATCH (source {graph: $graph})-[r]->(target) WHERE r.value IS NOT NULL "
        "ORDER BY r.value DESC RETURN source, r, target LIMIT $n",
        graph=graph_name,
        n=n,
    ).records

    result: list[CytoscapeElement] = []
    for record in records:
        source, r, target = record
        edge: Edge = {
            "source": source["id"],
            "target": target["id"],
            "value": r["value"],
        }
        result += [*node_to_cy(source), edge_to_cy(edge), *node_to_cy(target)]
    return result
