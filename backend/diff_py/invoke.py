"""
File: backend/app/diff_py/invoke.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Defines a class for method invokes.
"""

from method import Method


class Invoke:
    def __init__(self, id: int, source: Method, target: Method, is_direct: bool):
        self.id = id
        self.source = source
        self.target = target
        self.is_direct = is_direct
        self.call_targets: list[Method] = []

    def add_call_target(self, target: Method):
        self.call_targets.append(target)
