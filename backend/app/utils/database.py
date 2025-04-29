from ..driver import driver
from ..utils.conversions import edge_to_cy, node_to_cy
from .types import CytoscapeEdge, CytoscapeNode, Edge, NeighborType


def fetch_method(
    id: str,
    graph_name: str,
):
    query = """
    MATCH (m {id: $id, graph: $graph})
    OPTIONAL MATCH (caller)-[caller_edge]->(m)
    OPTIONAL MATCH (m)-[callee_edge]->(callee)
    ORDER BY callee.name, caller.name
    RETURN m, collect(DISTINCT caller) AS callers, collect(DISTINCT caller_edge) AS caller_edges,
           collect(DISTINCT callee) AS callees, collect(DISTINCT callee_edge) AS callee_edges
    """

    records = driver.execute_query(query, id=id, graph=graph_name).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        m, callers, caller_edges, callees, callee_edges = record

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
        for r in caller_edges:
            edge: Edge = {
                "source": r.start_node["id"],
                "target": id,
                "value": r["value"],
                "relevant": r["relevant"],
            }
            cy_edges |= edge_to_cy(edge)
        for r in callee_edges:
            edge: Edge = {
                "source": id,
                "target": r.end_node["id"],
                "value": r["value"],
                "relevant": r["relevant"],
            }
            cy_edges |= edge_to_cy(edge)

    return {
        "nodes": list(cy_nodes.values()),
        "edges": list(cy_edges.values()),
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
    OPTIONAL MATCH (neighbor_caller)-[neighbor_caller_edge]->(neighbor)
    OPTIONAL MATCH (neighbor)-[neighbor_callee_edge]->(neighbor_callee)
    ORDER BY neighbor_caller.name, neighbor_callee.name
    RETURN neighbor, r,
           collect(DISTINCT neighbor_caller) AS n_callers,
           collect(DISTINCT neighbor_caller_edge) AS n_caller_edges,
           collect(DISTINCT neighbor_callee) AS n_callees,
           collect(DISTINCT neighbor_callee_edge) AS n_callee_edges
    """

    records = driver.execute_query(
        query, id=method_id, neighbor_id=neighbor_id, graph=graph_name
    ).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        neighbor, r, n_callers, n_caller_edges, n_callees, n_callee_edges = record

        if neighbor is None:
            continue

        cy_nodes |= node_to_cy(neighbor)

        neighbor_node = cy_nodes[neighbor["id"]][0]
        neighbor_node["data"]["callers"] = []
        neighbor_node["data"]["callees"] = []

        # Neighbor callers
        for caller in n_callers:
            definition = list(node_to_cy(caller).values())[0]
            neighbor_node["data"]["callers"].append(definition)
        # Neighbor calees
        for callee in n_callees:
            definition = list(node_to_cy(callee).values())[0]
            neighbor_node["data"]["callees"].append(definition)
        # Edges from neighbor callers to neighbor
        for r in n_caller_edges:
            edge: Edge = {
                "source": r.start_node["id"],
                "target": neighbor["id"],
                "value": r["value"],
                "relevant": r["relevant"],
            }
            cy_edges |= edge_to_cy(edge)
        # Edges from neighbor to neighbor callees
        for r in n_callee_edges:
            edge: Edge = {
                "source": neighbor["id"],
                "target": r.end_node["id"],
                "value": r["value"],
                "relevant": r["relevant"],
            }
            cy_edges |= edge_to_cy(edge)

    return {"nodes": list(cy_nodes.values()), "edges": list(cy_edges.values())}


def fetch_edge(edge_id: str, graph_name: str, with_nodes: bool = False):
    source_id, target_id = edge_id.split("->")

    records = driver.execute_query(
        """
        MATCH (source {id: $source_id, graph: $graph})-[r]->(target {id: $target_id})
        OPTIONAL MATCH (source_caller)-[source_caller_edge]->(source)
        OPTIONAL MATCH (source)-[source_callee_edge]->(source_callee)
        OPTIONAL MATCH (target_caller)-[target_caller_edge]->(target)
        OPTIONAL MATCH (target)-[target_callee_edge]->(target_callee)
        ORDER BY source_caller.name, source_callee.name, target_caller.name, target_callee.name
        RETURN source, r, target,
               collect(DISTINCT source_caller) AS s_callers, collect(DISTINCT source_callee) AS s_callees,
               collect(DISTINCT source_caller_edge) AS s_caller_edges, collect(DISTINCT source_callee_edge) AS s_callee_edges,
               collect(DISTINCT target_caller) AS t_callers, collect(DISTINCT target_callee) AS t_callees,
               collect(DISTINCT target_caller_edge) AS t_caller_edges, collect(DISTINCT target_callee_edge) AS t_callee_edges
        """,
        source_id=source_id,
        target_id=target_id,
        graph=graph_name,
    ).records

    cy_nodes: dict[str, list[CytoscapeNode]] = {}
    cy_edges: dict[str, CytoscapeEdge] = {}

    for record in records:
        (
            source,
            r,
            target,
            s_callers,
            s_callees,
            s_caller_edges,
            s_callee_edges,
            t_callers,
            t_callees,
            t_caller_edges,
            t_callee_edges,
        ) = record

        edge: Edge = {
            "source": source["id"],
            "target": target["id"],
            "value": r["value"],
            "relevant": r["relevant"],
        }
        cy_edges |= edge_to_cy(edge)

        if with_nodes:
            cy_nodes |= node_to_cy(source)
            cy_nodes |= node_to_cy(target)

            source_node = cy_nodes[source["id"]][0]
            source_node["data"]["callers"] = []
            source_node["data"]["callees"] = []
            target_node = cy_nodes[target["id"]][0]
            target_node["data"]["callers"] = []
            target_node["data"]["callees"] = []

            # Source node callers
            for caller in s_callers:
                definition = list(node_to_cy(caller).values())[0]
                source_node["data"]["callers"].append(definition)
            # Source node callees
            for callee in s_callees:
                definition = list(node_to_cy(callee).values())[0]
                source_node["data"]["callees"].append(definition)
            # Target node callers
            for caller in t_callers:
                definition = list(node_to_cy(caller).values())[0]
                target_node["data"]["callers"].append(definition)
            # Target node callees
            for callee in t_callees:
                definition = list(node_to_cy(callee).values())[0]
                target_node["data"]["callees"].append(definition)

            # Edges from source node caller to source node
            for r in s_caller_edges:
                edge: Edge = {
                    "source": r.start_node["id"],
                    "target": source["id"],
                    "value": r["value"],
                    "relevant": r["relevant"],
                }
                cy_edges |= edge_to_cy(edge)
            # Edges from source node to source node callee
            for r in s_callee_edges:
                edge: Edge = {
                    "source": source["id"],
                    "target": r.end_node["id"],
                    "value": r["value"],
                    "relevant": r["relevant"],
                }
                cy_edges |= edge_to_cy(edge)
            # Edges from target node caller to target node
            for r in t_caller_edges:
                edge: Edge = {
                    "source": r.start_node["id"],
                    "target": target["id"],
                    "value": r["value"],
                    "relevant": r["relevant"],
                }
                cy_edges |= edge_to_cy(edge)
            # Edges from target node to target node callee
            for r in t_callee_edges:
                edge: Edge = {
                    "source": target["id"],
                    "target": r.end_node["id"],
                    "value": r["value"],
                    "relevant": r["relevant"],
                }
                cy_edges |= edge_to_cy(edge)

    return {"nodes": list(cy_nodes.values()), "edges": list(cy_edges.values())}
