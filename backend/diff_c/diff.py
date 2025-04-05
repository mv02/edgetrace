import ctypes
import os


class Method(ctypes.Structure):
    _fields_ = [
        ("id", ctypes.c_int),
        ("name", ctypes.c_char_p),
        ("declared_type", ctypes.c_char_p),
        ("params", ctypes.c_char_p),
        ("return_type", ctypes.c_char_p),
        ("qualified_name", ctypes.c_char_p),
        ("display", ctypes.c_char_p),
        ("flags", ctypes.c_char_p),
        ("is_entrypoint", ctypes.c_bool),
        ("reachability", ctypes.c_int),
        ("value", ctypes.c_char_p),
    ]


class Invoke(ctypes.Structure):
    pass


class Edge(ctypes.Structure):
    pass


Edge._fields_ = [
    ("id", ctypes.c_int),
    ("source", ctypes.POINTER(Method)),
    ("target", ctypes.POINTER(Method)),
    ("is_spurious", ctypes.c_bool),
    ("value", ctypes.c_double),
    ("next", ctypes.POINTER(Edge)),
]


class HashTable(ctypes.Structure):
    pass


class CallGraph(ctypes.Structure):
    _fields_ = [
        ("name", ctypes.c_char_p),
        ("method_count", ctypes.c_int),
        ("unreachable_count", ctypes.c_int),
        ("spuriously_reachable_count", ctypes.c_int),
        ("truly_reachable_count", ctypes.c_int),
        ("edge_count", ctypes.c_int),
        ("spurious_count", ctypes.c_int),
        ("nonspurious_count", ctypes.c_int),
        ("methods", ctypes.POINTER(HashTable)),
        ("invokes", ctypes.POINTER(Invoke)),
        ("edges", ctypes.POINTER(Edge)),
    ]


diff_lib = ctypes.CDLL(os.path.join(os.path.dirname(__file__), "libdiff.so"))
diff_lib.diff_from_dirs.argtypes = (
    ctypes.c_char_p,
    ctypes.c_char_p,
    ctypes.c_int,
)
diff_lib.diff_from_dirs.restype = ctypes.POINTER(CallGraph)


def diff(
    supergraph_directory: str,
    subgraph_directory: str,
    max_iterations: int,
) -> dict[tuple[int, int], float]:
    result: dict[tuple[int, int], float] = {}

    sup = diff_lib.diff_from_dirs(
        supergraph_directory.encode(), subgraph_directory.encode(), max_iterations
    )

    edge = sup.contents.edges
    while edge:
        source = edge.contents.source
        target = edge.contents.target
        result[(source.contents.id, target.contents.id)] = edge.contents.value
        edge = edge.contents.next

    diff_lib.call_graph_destroy(sup)
    return result
