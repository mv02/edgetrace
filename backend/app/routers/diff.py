import asyncio
import ctypes
import os

from diff_c.diff import EdgeDiff, diff
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..driver import driver
from ..utils.database import fetch_edges
from .csv_import import CSV_DIR

router = APIRouter(prefix="/{graph_name}")

iteration_count = ctypes.c_int(0)
cancel_flag = ctypes.c_bool(False)
edges: dict[tuple[str, str], EdgeDiff]


def start_diff(graph_name: str, other_graph_name: str, max_iterations: int):
    driver.execute_query(
        "MATCH ({graph: $graph})-[r]->() SET r.value = 0", graph=graph_name
    )

    global edges
    edges = diff(
        os.path.join(CSV_DIR, graph_name),
        os.path.join(CSV_DIR, other_graph_name),
        max_iterations,
        iteration_count,
        cancel_flag,
    )


async def send_progress(websocket: WebSocket):
    while True:
        await websocket.send_text(str(iteration_count.value))
        await asyncio.sleep(0.25)


async def wait_for_cancel(websocket: WebSocket):
    global cancel_flag
    while not cancel_flag:
        text = await websocket.receive_text()
        if text == "cancel":
            cancel_flag.value = True


def save_progress(graph_name: str, other_graph_name: str) -> str:
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

    return f"Difference with {other_graph_name} calculated: {iteration_count.value} iterations"


@router.websocket("/diff")
async def diff_websocket(websocket: WebSocket):
    iteration_count.value = 0
    cancel_flag.value = False

    await websocket.accept()
    try:
        text = await websocket.receive_text()
        graph_name, other_graph_name, max_iterations = text.split(",")

        # Task that runs the difference algorithm
        diff_task = asyncio.create_task(
            asyncio.to_thread(
                start_diff, graph_name, other_graph_name, int(max_iterations)
            )
        )

        # Task that sends progress periodically
        progress_task = asyncio.create_task(send_progress(websocket))
        # Task that listens for the cancel command
        cancel_task = asyncio.create_task(wait_for_cancel(websocket))

        # Wait until the algorithm ends
        await diff_task

        # Stop both tasks
        progress_task.cancel()
        cancel_task.cancel()

        # Save progress
        await websocket.send_text("saving")
        await asyncio.sleep(0)
        message = save_progress(graph_name, other_graph_name)

        await websocket.send_json(
            {"message": message, "iterations": iteration_count.value}
        )
        await websocket.close()
    except WebSocketDisconnect:
        pass


@router.get("/topedges")
def get_top_edges(graph_name: str, n: int):
    return fetch_edges(graph_name, limit=n, with_nodes=True)
