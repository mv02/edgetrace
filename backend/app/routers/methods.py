from fastapi import APIRouter

from ..utils.database import fetch_method, fetch_method_callees, fetch_method_callers

router = APIRouter(prefix="/{graph_name}/method")


@router.get("/{id}")
def get_method_by_id(graph_name: str, id: str, entrypoint: bool = False):
    return fetch_method(id, graph_name, entrypoint)


@router.get("/{id}/callers")
def get_all_method_callers(graph_name: str, id: str):
    return fetch_method_callers(graph_name, id)


@router.get("/{id}/callers/{caller_id}")
def get_method_caller(graph_name: str, id: str, caller_id: str | None = None):
    return fetch_method_callers(graph_name, id, caller_id)


@router.get("/{id}/callees")
def get_all_method_callees(graph_name: str, id: str):
    return fetch_method_callees(graph_name, id)


@router.get("/{id}/callees/{callee_id}")
def get_method_callee(graph_name: str, id: str, callee_id: str | None = None):
    return fetch_method_callees(graph_name, id, callee_id)
