from typing import Literal, TypedDict


class Method(TypedDict):
    id: str
    name: str
    parent_class: str
    parameters: list[str]
    return_type: str
    display: str
    flags: str
    is_entrypoint: bool


class Invoke(TypedDict):
    id: str
    method_id: str
    bci: int
    target_id: str
    is_direct: bool


class Edge(TypedDict):
    source: str
    target: str
    value: float
    relevant: bool


class CytoscapeElementData(TypedDict):
    id: str


class CytoscapeNodeRequiredData(CytoscapeElementData):
    label: str


class CytoscapeNodeOptionalData(TypedDict, total=False):
    parent: str | None


class CytoscapeNodeData(CytoscapeNodeRequiredData, CytoscapeNodeOptionalData):
    pass


class CytoscapeCompoundNodeData(CytoscapeNodeData):
    level: int


class CytoscapeMethodNodeData(CytoscapeNodeData, Method):
    pass


class CytoscapeEdgeRequiredData(CytoscapeElementData):
    source: str
    target: str


class CytoscapeEdgeOptionalData(TypedDict, total=False):
    value: float


class CytoscapeEdgeData(CytoscapeEdgeRequiredData, CytoscapeEdgeOptionalData):
    pass


class CytoscapeCompoundNode(TypedDict):
    group: Literal["nodes"]
    data: CytoscapeCompoundNodeData


class CytoscapeMethodNode(TypedDict):
    group: Literal["nodes"]
    data: CytoscapeMethodNodeData


class CytoscapeEdge(TypedDict):
    group: Literal["edges"]
    data: CytoscapeEdgeData


type CytoscapeNode = CytoscapeCompoundNode | CytoscapeMethodNode
type CytoscapeElement = CytoscapeNode | CytoscapeEdge


type NeighborType = Literal["callers"] | Literal["callees"]
type Tree = dict[str, Tree | str]
