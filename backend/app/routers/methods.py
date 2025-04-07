from fastapi import APIRouter

from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from ..utils.types import CytoscapeElement, Edge, Method

router = APIRouter(prefix="/{graph_name}/method")


@router.get("/{id}")
def get_method_by_id(graph_name: str, id: int):
    record = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH p = ALL SHORTEST (e {graph: $graph})-->+(m) "
        "WHERE e.is_entrypoint "
        "RETURN m, nodes(p) AS path, [r in relationships(p) | r.value] AS edge_values LIMIT 1",
        id=id,
        graph=graph_name,
    ).records[0]

    m: Method
    path: list[Method]
    edge_values: list[float]

    m, path, edge_values = record
    if path is None:
        return {"nodes": [*node_to_cy(m)]}

    nodes: list[CytoscapeElement] = []
    edges: list[CytoscapeElement] = []
    for i, (m1, m2) in enumerate(zip(path, path[1:])):
        edge: Edge = {"source": m1["id"], "target": m2["id"], "value": edge_values[i]}
        nodes += [*node_to_cy(m1), *node_to_cy(m2)]
        edges.append(edge_to_cy(edge))
    return {"nodes": nodes, "edges": edges}


@router.get("/{id}/callers")
def get_method_callers(graph_name: str, id: int):
    records = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH (caller {graph: $graph})-[r]->(m) "
        "RETURN caller, r.value AS edge_value",
        id=id,
        graph=graph_name,
    ).records

    result: list[CytoscapeElement] = []
    for record in records:
        caller, edge_value = record
        if caller is None:
            continue
        edge: Edge = {"source": caller["id"], "target": id, "value": edge_value}
        result += [*node_to_cy(caller), edge_to_cy(edge)]
    return result


@router.get("/{id}/callees")
def get_method_callees(graph_name: str, id: int):
    records = driver.execute_query(
        "MATCH (m {id: $id, graph: $graph}) "
        "OPTIONAL MATCH (m)-[r]->(callee {graph: $graph}) "
        "RETURN callee, r.value AS edge_value",
        id=id,
        graph=graph_name,
    ).records

    result: list[CytoscapeElement] = []
    for record in records:
        callee, edge_value = record
        if callee is None:
            continue
        edge: Edge = {"source": id, "target": callee["id"], "value": edge_value}
        result += [*node_to_cy(callee), edge_to_cy(edge)]
    return result
