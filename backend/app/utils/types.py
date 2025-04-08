from typing import Any, TypedDict


type ElementId = int | str


class Method(TypedDict):
    id: ElementId
    name: str
    parent_class: str
    parameters: list[str]
    return_type: str
    display: str
    flags: str
    is_entrypoint: bool


class Invoke(TypedDict):
    id: int
    method_id: int
    bci: int
    target_id: int
    is_direct: bool


class Edge(TypedDict):
    source: int
    target: int
    value: float


type CytoscapeElement = dict[str, Any]
type Tree = dict[str, Tree | int]
