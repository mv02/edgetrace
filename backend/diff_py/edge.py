"""
File: backend/app/diff_py/edge.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Defines a class for call graph edges.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from method import Method


class Edge:
    def __init__(self, source: Method, target: Method):
        self.source = source
        self.target = target
        self.value = 0.0

    def __repr__(self) -> str:
        return f"[{self.value:.4}] {self.source} -> {self.target}"
