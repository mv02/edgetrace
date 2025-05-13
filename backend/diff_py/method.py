"""
File: backend/app/diff_py/method.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Defines a class for call graph methods.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, NamedTuple

if TYPE_CHECKING:
    from edge import Edge


class MethodKey(NamedTuple):
    name: str
    class_: str
    parameters: str | None
    return_type: str
    flags: str
    is_entry_point: bool


class Method:
    def __init__(
        self,
        id: int,
        name: str,
        class_: str,
        parameters: str | None,
        return_type: str,
        flags: str,
        is_entry_point: bool,
        display: str,
    ):
        self.id = id
        self.name = name
        self.class_ = class_
        self.parameters = parameters
        self.return_type = return_type
        self.flags = flags
        self.is_entry_point = is_entry_point
        self.display = display

        self.equivalent: Method | None = None
        self.outgoing_edges: set[Edge] = set()
        self.incoming_edges: set[Edge] = set()
        self.is_reachable = False
        self.value = 0.0

    def key(self) -> MethodKey:
        return MethodKey(
            self.name,
            self.class_,
            self.parameters,
            self.return_type,
            self.flags,
            self.is_entry_point,
        )

    def add_outgoing_edge(self, edge: Edge):
        self.outgoing_edges.add(edge)

    def add_incoming_edge(self, edge: Edge):
        self.incoming_edges.add(edge)

    def __repr__(self) -> str:
        return f"{self.class_}.{self.name}({self.parameters if self.parameters is not None else ''})"
