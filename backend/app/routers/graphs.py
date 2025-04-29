import logging

from fastapi import APIRouter

from ..driver import driver
from ..utils.conversions import methods_to_tree
from . import diff, edges, methods

logger = logging.getLogger("uvicorn")
logger.propagate = False

router = APIRouter(prefix="/graphs")

router.include_router(methods.router)
router.include_router(edges.router)
router.include_router(diff.router)


@router.get("")
def get_graphs():
    records = driver.execute_query(
        "MATCH (m:Method) "
        "OPTIONAL MATCH (m)-[r]->() "
        "WITH m.graph AS name, count(DISTINCT m) AS nodeCount, count(r) AS edgeCount "
        "ORDER BY name "
        "OPTIONAL MATCH (meta:Meta {graph_name: name}) "
        "RETURN name, nodeCount, edgeCount, meta.other_graph AS otherGraph, "
        "       meta.iterations AS iterations"
    ).records
    return [record.data() for record in records]


@router.delete("/{graph_name}")
def delete_graph(graph_name: str):
    _, summary, _ = driver.execute_query(
        "MATCH (m {graph: $graph}) DETACH DELETE m", graph=graph_name
    )

    node_count = summary.counters.nodes_deleted
    edge_count = summary.counters.relationships_deleted

    driver.execute_query(
        "MATCH (meta:Meta {graph_name: $graph}) DELETE meta", graph=graph_name
    )

    message = f"Deleted {node_count} nodes and {edge_count} edges"
    logger.info(message)
    return {"message": message}


@router.get("/{graph_name}/tree")
def get_method_tree(graph_name: str):
    records = driver.execute_query(
        "MATCH (m {graph: $graph}) RETURN m.id AS id, m.name AS name, m.parent_class AS parent ORDER BY parent, name",
        graph=graph_name,
    ).records

    methods = [record.data() for record in records]
    return methods_to_tree(methods)
