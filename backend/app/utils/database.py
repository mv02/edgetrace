from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from .types import CytoscapeEdge, CytoscapeNode, Edge, NeighborType


def fetch_method(
    id: str,
    graph_name: str,
    with_entrypoint: bool = False,
):
    query = """
    MATCH (m {id: $id, graph: $graph})
    OPTIONAL MATCH (caller)-->(m)
    OPTIONAL MATCH (m)-->(callee)
    OPTIONAL MATCH p = ALL SHORTEST (e {graph: $graph})-->+(m)
    WHERE e.is_entrypoint
    ORDER BY callee.name, caller.name

    WITH m, collect(DISTINCT caller) AS callers, collect(DISTINCT callee) AS callees, p
    UNWIND nodes(p) AS path_node

    OPTIONAL MATCH (pn_caller)-->(path_node)
    WITH m, callers, callees, p, path_node, collect(DISTINCT pn_caller) AS pn_callers
    OPTIONAL MATCH (path_node)-->(pn_callee)
    WITH m, callers, callees, p, path_node, pn_callers, collect(DISTINCT pn_callee) AS pn_callees

    RETURN m, callers, callees, p AS path,
           collect({ callers: pn_callers, callees: pn_callees }) AS path_node_neighbors
    """

    print(query)

    records = driver.execute_query(query, id=id, graph=graph_name).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    path_nodes: dict[str, list[CytoscapeNode]] = {}
    path_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        m, callers, callees, path, path_node_neighbors = record

        if with_entrypoint and path is not None:
            # Include path edges and path nodes with neighbors
            for i, node in enumerate(path.nodes[:-1]):
                path_nodes |= node_to_cy(node)
                method_node = path_nodes[node["id"]][0]
                method_node["data"]["callers"] = [
                    list(node_to_cy(caller).values())[0]
                    for caller in path_node_neighbors[i]["callers"]
                ]
                method_node["data"]["callees"] = [
                    list(node_to_cy(callee).values())[0]
                    for callee in path_node_neighbors[i]["callees"]
                ]
            for rel in path.relationships:
                edge: Edge = {
                    "source": rel.start_node["id"],
                    "target": rel.end_node["id"],
                    "value": rel["value"],
                    "relevant": rel["relevant"],
                }
                path_edges |= edge_to_cy(edge)

        cy_nodes |= node_to_cy(m)

        method_node = cy_nodes[id][0]
        method_node["data"]["callers"] = []
        method_node["data"]["callees"] = []

        for caller in callers:
            definition = list(node_to_cy(caller).values())[0]
            method_node["data"]["callers"].append(definition)
        for callee in callees:
            definition = list(node_to_cy(callee).values())[0]
            method_node["data"]["callees"].append(definition)

    return {
        "nodes": list(cy_nodes.values()),
        "edges": list(cy_edges.values()),
        "path": {
            "nodes": list(path_nodes.values()),
            "edges": list(path_edges.values()),
        },
    }


def fetch_method_neighbors(
    graph_name: str,
    method_id: str,
    neighbor_type: NeighborType,
    neighbor_id: str | None = None,
):
    if neighbor_type == "callers":
        match_pattern = (
            "(neighbor {id: $neighbor_id})-[r]->(m)"
            if neighbor_id is not None
            else "(neighbor)-[r]->(m)"
        )
    else:
        match_pattern = (
            "(m)-[r]->(neighbor {id: $neighbor_id})"
            if neighbor_id is not None
            else "(m)-[r]->(neighbor)"
        )

    query = f"""
    MATCH (m {{id: $id, graph: $graph}})
    OPTIONAL MATCH {match_pattern}
    OPTIONAL MATCH (neighbor_caller)-->(neighbor)
    OPTIONAL MATCH (neighbor)-->(neighbor_callee)
    ORDER BY neighbor_caller.name, neighbor_callee.name
    RETURN neighbor, r,
           collect(DISTINCT neighbor_caller) AS neighbor_callers,
           collect(DISTINCT neighbor_callee) AS neighbor_callees
    """

    records = driver.execute_query(
        query, id=method_id, neighbor_id=neighbor_id, graph=graph_name
    ).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        neighbor, r, neighbor_callers, neighbor_callees = record

        if neighbor is None:
            continue

        edge: Edge = {
            "source": neighbor["id"] if neighbor_type == "callers" else method_id,
            "target": method_id if neighbor_type == "callers" else neighbor["id"],
            "value": r["value"],
            "relevant": r["relevant"],
        }
        cy_nodes |= node_to_cy(neighbor)
        cy_edges |= edge_to_cy(edge)

        neighbor_node = cy_nodes[neighbor["id"]][0]
        neighbor_node["data"]["callers"] = []
        neighbor_node["data"]["callees"] = []

        for caller in neighbor_callers:
            definition = list(node_to_cy(caller).values())[0]
            neighbor_node["data"]["callers"].append(definition)
        for callee in neighbor_callees:
            definition = list(node_to_cy(callee).values())[0]
            neighbor_node["data"]["callees"].append(definition)

    return {"nodes": list(cy_nodes.values()), "edges": list(cy_edges.values())}
