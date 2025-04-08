from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from .types import CytoscapeElement, Edge


def fetch_method(
    id: int,
    graph_name: str,
    with_entrypoint: bool = False,
):
    query = """MATCH (m {id: $id, graph: $graph})
    OPTIONAL MATCH (caller)-[e1]->(m)
    OPTIONAL MATCH (m)-[e2]->(callee)
    OPTIONAL MATCH p = ALL SHORTEST (e {graph: $graph})-->+(m)
    WHERE e.is_entrypoint
    RETURN m, collect(e1) AS caller_edges, collect(caller) AS callers,
    collect(e2) AS callee_edges, collect(callee) AS callees, p AS path"""

    records = driver.execute_query(query, id=id, graph=graph_name).records

    result: list[CytoscapeElement] = []

    for record in records:
        nodes = []
        relationships = []

        if with_entrypoint and record["path"] is not None:
            nodes += list(record["path"].nodes)
            relationships += list(record["path"].relationships)

        for rel in relationships:
            edge: Edge = {
                "source": rel.start_node["id"],
                "target": rel.end_node["id"],
                "value": rel["value"],
            }
            result.append(edge_to_cy(edge))

        for node in nodes:
            result += node_to_cy(node)

    result += node_to_cy(record["m"])

    return result


def fetch_method_callers(graph_name: str, method_id: int, caller_id: int | None = None):
    if caller_id is None:
        query = """MATCH (m {id: $id, graph: $graph})
        OPTIONAL MATCH (caller)-[r]->(m)
        RETURN caller, r"""
    else:
        query = """MATCH (m {id: $id, graph: $graph})
        OPTIONAL MATCH (caller {id: $caller_id})-[r]->(m)
        RETURN caller, r"""

    records = driver.execute_query(
        query, id=method_id, caller_id=caller_id, graph=graph_name
    ).records

    result: list[CytoscapeElement] = []

    for record in records:
        caller, r = record
        edge: Edge = {
            "source": caller["id"],
            "target": method_id,
            "value": r["value"],
        }
        result += node_to_cy(caller)
        result.append(edge_to_cy(edge))
    return result


def fetch_method_callees(graph_name: str, method_id: int, callee_id: int | None = None):
    if callee_id is None:
        query = """MATCH (m {id: $id, graph: $graph})
        OPTIONAL MATCH (m)-[r]->(callee)
        RETURN callee, r"""
    else:
        query = """MATCH (m {id: $id, graph: $graph})
        OPTIONAL MATCH (m)-[r]->(callee {id: $callee_id})
        RETURN callee, r"""

    records = driver.execute_query(
        query, id=method_id, callee_id=callee_id, graph=graph_name
    ).records

    result: list[CytoscapeElement] = []

    for record in records:
        callee, r = record
        edge: Edge = {
            "source": method_id,
            "target": callee["id"],
            "value": r["value"],
        }
        result += node_to_cy(callee)
        result.append(edge_to_cy(edge))
    return result
