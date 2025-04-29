import asyncio
import ctypes
import os

from diff_c.diff import diff
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..driver import driver
from ..utils.database import fetch_edges
from .csv_import import CSV_DIR

router = APIRouter(prefix="/{graph_name}/diff")

iteration_count = ctypes.c_int(0)
cancel_flag = ctypes.c_bool(False)
saving = False


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

    global saving
    saving = True
    driver.execute_query(
        "UNWIND $data AS row "
        "MATCH (:Method {id: row.source_id, graph: $graph})-[r]->(:Method {id: row.target_id, graph: $graph}) "
        "SET r.value = row.value, r.relevant = row.relevant",
        graph=graph_name,
        data=[
            {
                "source_id": k[0],
                "target_id": k[1],
                "value": v["value"],
                "relevant": v["relevant"],
            }
            for k, v in edges.items()
        ],
    )
    driver.execute_query(
        "MERGE (meta:Meta {graph_name: $graph}) "
        "SET meta.other_graph = $other_graph, meta.iterations = $iterations",
        graph=graph_name,
        other_graph=other_graph_name,
        iterations=iteration_count.value,
    )
    saving = False

    return {
        "message": f"Difference with {other_graph_name} calculated: {iteration_count.value} iterations",
        "iterations": iteration_count.value,
    }


@router.post("/cancel")
def cancel_diff():
    global cancel_flag
    cancel_flag.value = True
    return


@router.websocket("/ws")
async def diff_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while not saving:
            await websocket.send_text(str(iteration_count.value))
            await asyncio.sleep(0.25)
        await websocket.send_text("saving")
        await websocket.close()
    except WebSocketDisconnect:
        pass


@router.get("/edges")
def get_top_edges(graph_name: str, n: int):
    return fetch_edges(graph_name, limit=n, with_nodes=True)
