from fastapi import APIRouter

from ..utils.database import fetch_method, fetch_method_neighbors

router = APIRouter(prefix="/{graph_name}/method")


@router.get("/{id}")
def get_method_by_id(graph_name: str, id: str):
    return fetch_method(id, graph_name)


@router.get("/{id}/callers")
def get_all_method_callers(graph_name: str, id: str):
    return fetch_method_neighbors(graph_name, id, "callers")


@router.get("/{id}/callers/{caller_id}")
def get_method_caller(graph_name: str, id: str, caller_id):
    return fetch_method_neighbors(graph_name, id, "callers", caller_id)


@router.get("/{id}/callees")
def get_all_method_callees(graph_name: str, id: str):
    return fetch_method_neighbors(graph_name, id, "callees")


@router.get("/{id}/callees/{callee_id}")
def get_method_callee(graph_name: str, id: str, callee_id: str):
    return fetch_method_neighbors(graph_name, id, "callees", callee_id)
