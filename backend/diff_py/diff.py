"""
File: backend/app/diff_py/diff.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Entry point and logic of the call graph difference algorithm.
"""

import sys

from call_graph import CallGraph
from method import Method

ALPHA = 0.125
EPSILON = 0.001


def link_equivalents(sup: CallGraph, sub: CallGraph):
    for m in sup.methods.values():
        m.equivalent = sub.methods_lut.get(m.key())
    for m in sub.methods.values():
        m.equivalent = sup.methods_lut.get(m.key())


def level(m: Method) -> float:
    if m.equivalent is not None and m.equivalent.is_reachable:
        return 0
    if m.equivalent is None and m.is_entry_point:
        return 0
    return m.value


def diff(sup: CallGraph, sub: CallGraph, max_iterations: int):
    i = 0
    max = 1

    print(sup)
    print(sub)
    link_equivalents(sup, sub)
    print("Purging common edges")
    sup.purge_common_edges()
    print(sup)
    print(sub)

    print("Starting difference algorithm")
    while max > EPSILON and i < max_iterations:
        max = 0

        for edge in sup.edges.values():
            l2 = level(edge.target)
            l1 = level(edge.source)
            if l2 > max:
                max = l2
            if l1 > max:
                max = l1

            diff = ALPHA * (l2 - l1)
            if diff > 0:
                edge.value += diff
                edge.target.value -= diff
                edge.source.value += diff

        i += 1
        if i % 100 == 0 or max <= EPSILON:
            print(f"Iteration {i}, max {max}")

    print(f"Done, {i} iterations.")


def diff_from_dirs(
    supergraph_directory: str, subgraph_directory: str, max_iterations: int
):
    sup = CallGraph(supergraph_directory, "Supergraph")
    sub = CallGraph(subgraph_directory, "Subgraph")
    diff(sup, sub, max_iterations)
    return sup


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python diff.py DIR1 DIR2 [max_iterations] [top_n]", file=sys.stderr
        )
        exit(1)

    sup = diff_from_dirs(
        sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) >= 4 else 1000
    )

    top_n = int(sys.argv[4]) if len(sys.argv) == 5 else 10
    if top_n == 0:
        exit()

    print(f"\nTop {top_n} edges:")
    edges = filter(lambda e: e.source.equivalent is not None, sup.edges.values())
    for edge in sorted(edges, key=lambda e: e.value, reverse=True)[:top_n]:
        print(edge)
