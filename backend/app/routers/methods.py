from fastapi import APIRouter

from ..driver import driver
from ..utils import CytoscapeElement, invoke_to_cy, method_to_cy

router = APIRouter(prefix="/{graph_name}/method")


@router.get("/{id}")
def get_method_by_id(graph_name: str, id: int):
    record = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH p = ALL SHORTEST (e {graph: $graph})-->+(m) "
        "WHERE e.is_entrypoint "
        "RETURN m, nodes(p) AS path LIMIT 1",
        id=id,
        graph=graph_name,
    ).records[0]

    m, path = record
    if path is None:
        return [*method_to_cy(m)]

    result: list[CytoscapeElement] = []
    for m1, m2 in zip(path, path[1:]):
        result += [*method_to_cy(m1), *method_to_cy(m2), invoke_to_cy(m1, m2)]
    return result


@router.get("/{id}/callers")
def get_method_callers(graph_name: str, id: int):
    record = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH (caller {graph: $graph})-->(m) "
        "RETURN m, collect(caller) AS callers",
        id=id,
        graph=graph_name,
    ).records[0]

    m, callers = record
    result: list[CytoscapeElement] = []
    for caller in callers:
        result += [*method_to_cy(caller), invoke_to_cy(caller, m)]
    return result


@router.get("/{id}/callees")
def get_method_callees(graph_name: str, id: int):
    record = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH (m)-->(callee {graph: $graph}) "
        "RETURN m, collect(callee) AS callees",
        id=id,
        graph=graph_name,
    ).records[0]

    m, callees = record
    result: list[CytoscapeElement] = []
    for callee in callees:
        result += [*method_to_cy(callee), invoke_to_cy(m, callee)]
    return result
