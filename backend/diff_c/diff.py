"""
File: backend/app/diff_c/diff.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Declares C bindings and implements a wrapper function for the difference algorithm.
"""

import ctypes
import os

type EdgeDiff = dict[str, float | bool]


class Method(ctypes.Structure):
    pass


Method._fields_ = [
    ("id", ctypes.c_int),
    ("name", ctypes.c_char_p),
    ("declared_type", ctypes.c_char_p),
    ("params", ctypes.c_char_p),
    ("return_type", ctypes.c_char_p),
    ("qualified_name", ctypes.c_char_p),
    ("display", ctypes.c_char_p),
    ("flags", ctypes.c_char_p),
    ("is_entry_point", ctypes.c_bool),
    ("is_reachable", ctypes.c_bool),
    ("value", ctypes.c_double),
    ("equivalent", ctypes.POINTER(Method)),
]


class Invoke(ctypes.Structure):
    pass


class Edge(ctypes.Structure):
    pass


Edge._fields_ = [
    ("id", ctypes.c_int),
    ("source", ctypes.POINTER(Method)),
    ("target", ctypes.POINTER(Method)),
    ("value", ctypes.c_double),
    ("next", ctypes.POINTER(Edge)),
]


class HashTable(ctypes.Structure):
    pass


class CallGraph(ctypes.Structure):
    pass


CallGraph._fields_ = [
    ("name", ctypes.c_char_p),
    ("method_count", ctypes.c_int),
    ("reachable_count", ctypes.c_int),
    ("edge_count", ctypes.c_int),
    ("methods", ctypes.POINTER(HashTable)),
    ("invokes", ctypes.POINTER(Invoke)),
    ("edges", ctypes.POINTER(Edge)),
    ("other_graph", ctypes.POINTER(CallGraph)),
]


diff_lib = ctypes.CDLL(os.path.join(os.path.dirname(__file__), "../build/libdiff.so"))
diff_lib.diff_from_dirs.argtypes = (
    ctypes.c_char_p,
    ctypes.c_char_p,
    ctypes.c_int,
    ctypes.POINTER(ctypes.c_int),
    ctypes.POINTER(ctypes.c_bool),
)
diff_lib.diff_from_dirs.restype = ctypes.POINTER(CallGraph)


def diff(
    supergraph_directory: str,
    subgraph_directory: str,
    max_iterations: int,
    iteration_count: ctypes.c_int,
    cancel_flag: ctypes.c_bool,
) -> dict[tuple[str, str], EdgeDiff]:
    result: dict[tuple[str, str], EdgeDiff] = {}

    sup = diff_lib.diff_from_dirs(
        supergraph_directory.encode(),
        subgraph_directory.encode(),
        max_iterations,
        ctypes.byref(iteration_count),
        ctypes.byref(cancel_flag),
    )

    edge = sup.contents.edges
    while edge:
        source = edge.contents.source
        target = edge.contents.target
        result[(str(source.contents.id), str(target.contents.id))] = {
            "value": edge.contents.value,
            "relevant": bool(source.contents.equivalent),
        }
        edge = edge.contents.next

    diff_lib.call_graph_destroy(sup.contents.other_graph)
    diff_lib.call_graph_destroy(sup)
    return result
