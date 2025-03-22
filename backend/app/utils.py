from typing import Any

type Method = dict[str, str]
type CytoscapeElement = dict[str, Any]
type Tree = dict[str, Tree | int]


def method_to_cy(method: Method, color: str | None = None) -> list[CytoscapeElement]:
    """Convert a method to Cytoscape.js node."""
    label = ".".join(method["Display"].split(".")[-2:])
    result: list[CytoscapeElement] = [
        {
            "group": "nodes",
            "data": {
                "id": method["Id"],
                "parent": method["Type"],
                "label": label,
                **method,
            },
            "classes": ["leaf"],
            **({"style": {"background-color": color}} if color else {}),
        }
    ]

    t = method["Type"]
    level = 0
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


def invoke_to_cy(
    source: Method, target: Method, color: str | None = None
) -> CytoscapeElement:
    """Convert an invoke to Cytoscape.js edge."""
    return {
        "group": "edges",
        "data": {
            "id": f"{source['Id']}->{target['Id']}",
            "source": source["Id"],
            "target": target["Id"],
        },
        **(
            {"style": {"line-color": color, "target-arrow-color": color}}
            if color
            else {}
        ),
    }


def methods_to_tree(methods: list[dict]) -> Tree:
    """Convert a list of methods to tree structure based on type hierarchy."""
    tree: Tree = {}
    for m in methods:
        node: dict = tree
        for part in m["type"].split("."):
            if part not in node:
                node[part] = {}
            node = node[part]
        node[m["name"]] = m["id"]
    return tree
