import os

from diff_c.diff import diff
from fastapi import APIRouter

from ..driver import driver
from .csv_import import CSV_DIR

router = APIRouter(prefix="/{graph_name}/diff")


@router.post("/{other_graph_name}")
def calculate_diff(graph_name: str, other_graph_name: str, max_iterations: int):
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
            {"source_id": str(k[0]), "target_id": str(k[1]), "value": v}
            for k, v in edges.items()
        ],
    )
    return
