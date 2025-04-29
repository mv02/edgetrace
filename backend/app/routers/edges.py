from fastapi import APIRouter

from ..utils.database import fetch_edges

router = APIRouter(prefix="/{graph_name}/edge")


@router.get("/{id}")
def get_edge_by_id(graph_name: str, id: str, with_nodes: bool = False):
    return fetch_edges(graph_name, id, with_nodes=with_nodes)
