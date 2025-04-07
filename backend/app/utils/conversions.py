from .types import CytoscapeElement, Edge, Invoke, Method, Tree


def method_from_csv(row: dict[str, str]) -> Method:
    """Convert CSV record to method dict."""
    return {
        "id": int(row["Id"]),
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
        "id": int(row["Id"]),
        "method_id": int(row["MethodId"]),
        "bci": int(row["BytecodeIndexes"]),
        "target_id": int(row["TargetId"]),
        "is_direct": row["IsDirect"] == "true",
    }


def node_to_cy(node: Method, color: str | None = None) -> list[CytoscapeElement]:
    """Convert a node to Cytoscape.js node."""
    result: list[CytoscapeElement] = [
        {
            "group": "nodes",
            "data": {"label": node["name"], "parent": node["parent_class"], **node},
            **({"style": {"background-color": color}} if color else {}),
        }
    ]

    t = node["parent_class"]
    level = 1
    while "." in t:
        parent_t = t[: t.rindex(".")]
        result.append(
            {
                "group": "nodes",
                "data": {
                    "id": t,
                    "parent": parent_t,
                    "label": t[t.rindex(".") + 1 :],
                    "level": level,
                },
            }
        )
        t = parent_t
        level += 1
    result.append({"group": "nodes", "data": {"id": t, "label": t, "level": level}})

    return result


def edge_to_cy(edge: Edge) -> CytoscapeElement:
    """Convert an edge between nodes to Cytoscape.js edge."""
    return {
        "group": "edges",
        "data": {"id": f"{edge['source']}->{edge['target']}", **edge},
    }


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
