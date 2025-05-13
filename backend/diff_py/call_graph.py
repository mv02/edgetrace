"""
File: backend/app/diff_py/call_graph.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Defines a class for call graphs, which are created from the given CSV reports.
"""

import os
from csv import DictReader

from edge import Edge
from invoke import Invoke
from method import Method, MethodKey

type MethodsById = dict[int, Method]
type MethodsLookupTable = dict[MethodKey, Method]
type InvokesById = dict[int, Invoke]

type EdgeId = tuple[Method, Method]


class CallGraph:
    def __init__(self, dir_name: str, name: str):
        self.directory = os.path.join(os.path.dirname(__file__), dir_name)
        self.name = name
        self.edges: dict[EdgeId, Edge] = {}
        self.methods, self.methods_lut = self._load_methods()
        self.invokes = self._load_invokes()
        self._load_call_targets()

        self.reachable_count = 0
        for entry_point in [m for m in self.methods.values() if m.is_entry_point]:
            entry_point.is_reachable = True
            self.reachable_count += 1
        self._compute_reachability()

    def _load_methods(self) -> tuple[MethodsById, MethodsLookupTable]:
        methods: MethodsById = {}
        lut: MethodsLookupTable = {}
        with open(os.path.join(self.directory, "call_tree_methods.csv")) as f:
            reader = DictReader(f)
            for line in reader:
                id = int(line["Id"])
                key = MethodKey(
                    line["Name"],
                    line["Type"],
                    line["Parameters"] if line["Parameters"] != "empty" else None,
                    line["Return"],
                    line["Flags"],
                    line["IsEntryPoint"] == "true",
                )
                method = Method(id, *key, line["Display"])
                methods[id] = method
                lut[key] = method
        return methods, lut

    def _load_invokes(self) -> InvokesById:
        invokes: InvokesById = {}
        with open(os.path.join(self.directory, "call_tree_invokes.csv")) as f:
            reader = DictReader(f)
            for line in reader:
                id = int(line["Id"])
                source_id = int(line["MethodId"])
                target_id = int(line["TargetId"])
                invokes[id] = Invoke(
                    id,
                    self.methods[source_id],
                    self.methods[target_id],
                    line["IsDirect"] == "true",
                )
        return invokes

    def _load_call_targets(self):
        with open(os.path.join(self.directory, "call_tree_targets.csv")) as f:
            reader = DictReader(f)
            for line in reader:
                invoke_id = int(line["InvokeId"])
                target_id = int(line["TargetId"])
                invoke = self.invokes[invoke_id]
                source = invoke.source
                target = self.methods[target_id]
                invoke.add_call_target(target)

                if (source, target) not in self.edges:
                    edge = Edge(source, target)
                    self.edges[(source, target)] = edge
                    source.add_outgoing_edge(edge)
                    target.add_incoming_edge(edge)

    def _compute_reachability(self):
        prev_count = 0
        while self.reachable_count > prev_count:
            prev_count = self.reachable_count
            for edge in self.edges.values():
                if not edge.source.is_reachable or edge.target.is_reachable:
                    continue
                edge.target.is_reachable = True
                edge.target.value = 1.0
                self.reachable_count += 1
        for invoke in self.invokes.values():
            if invoke.source.is_reachable and not invoke.target.is_reachable:
                invoke.target.is_reachable = True
                self.reachable_count += 1

    def purge_common_edges(self):
        self.edges = {
            key: edge
            for key, edge in self.edges.items()
            if edge.target.equivalent is None or not edge.target.equivalent.is_reachable
        }

    def __repr__(self) -> str:
        return f"{self.name}: {len(self.methods)} methods ({self.reachable_count} reachable), {len(self.edges)} edges"
