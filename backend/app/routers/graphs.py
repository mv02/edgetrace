from fastapi import APIRouter

from ..driver import driver
from ..utils import methods_to_tree
from . import diff, methods

router = APIRouter(prefix="/graphs")

router.include_router(methods.router)
router.include_router(diff.router)


@router.get("")
def get_graphs():
    records = driver.execute_query(
        "MATCH (m) "
        "OPTIONAL MATCH (m)-[r]->() "
        "RETURN m.graph AS name, count(DISTINCT m) AS nodeCount, count(r) AS edgeCount "
        "ORDER BY name"
    ).records
    return [record.data() for record in records]


@router.get("/{graph_name}/tree")
def get_method_tree(graph_name: str):
    records = driver.execute_query(
        "MATCH (m {graph: $graph}) RETURN m.id AS id, m.name AS name, m.parent_class AS parent ORDER BY parent, name",
        graph=graph_name,
    ).records

    methods = [record.data() for record in records]
    return methods_to_tree(methods)
