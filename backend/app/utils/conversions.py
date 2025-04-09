from .types import (
    CytoscapeEdge,
    CytoscapeNode,
    Edge,
    Invoke,
    Method,
    Tree,
)


def fix_levels(elements: dict[str, CytoscapeNode]) -> dict[str, CytoscapeNode]:
    """Fix compound node levels in given collection to eliminate color collisions."""
    method_nodes = {x[0]: x[1] for x in elements.items() if "level" not in x[1]["data"]}

    for node in method_nodes.values():
        level = 1
        parent_id = node["data"].get("parent")

        while parent_id is not None:
            parent = elements[parent_id]
            parent["data"]["level"] = max(parent["data"]["level"], level)
            level += 1
            parent_id = parent["data"].get("parent")

    return elements


def method_from_csv(row: dict[str, str]) -> Method:
    """Convert CSV record to method dict."""
    return {
        "id": row["Id"],
        "name": row["Name"],
        "parent_class": row["Type"],
        "parameters": [] if row["Parameters"] == "empty" else row["Parameters"].split(),
        "return_type": row["Return"],
        "display": row["Display"],
        "flags": row["Flags"],
        "is_entrypoint": row["IsEntryPoint"] == "true",
    }


def invoke_from_csv(row: dict[str, str]) -> Invoke:
    """Convert CSV record to invoke dict."""
    return {
        "id": row["Id"],
        "method_id": row["MethodId"],
        "bci": int(row["BytecodeIndexes"]),
        "target_id": row["TargetId"],
        "is_direct": row["IsDirect"] == "true",
    }


def node_to_cy(node: Method) -> dict[str, list[CytoscapeNode]]:
    """Convert a node to Cytoscape.js node and its parent nodes."""
    id = node["id"]

    cy_node: CytoscapeNode = {
        "group": "nodes",
        "data": {"label": node["name"], "parent": node["parent_class"], **node},
    }

    result: dict[str, list[CytoscapeNode]] = {id: [cy_node]}

    t = node["parent_class"]
    level = 1
    while "." in t:
        parent_t = t[: t.rindex(".")]
        parent_node: CytoscapeNode = {
            "group": "nodes",
            "data": {
                "id": t,
                "parent": parent_t,
                "label": t[t.rindex(".") + 1 :],
                "level": level,
            },
        }
        result[id].append(parent_node)
        t = parent_t
        level += 1
    result[id].append({"group": "nodes", "data": {"id": t, "label": t, "level": level}})

    return result


def edge_to_cy(edge: Edge) -> dict[str, CytoscapeEdge]:
    """Convert an edge between nodes to Cytoscape.js edge."""
    id = f"{edge['source']}->{edge['target']}"
    return {id: {"group": "edges", "data": {"id": id, **edge}}}


def methods_to_tree(methods: list[dict]) -> Tree:
    """Convert a list of methods to tree structure based on type hierarchy."""
    tree: Tree = {}
    for m in methods:
        node: dict = tree
        for part in m["parent"].split("."):
            if part not in node:
                node[part] = {}
            node = node[part]
        node[m["name"]] = m["id"]
    return tree
