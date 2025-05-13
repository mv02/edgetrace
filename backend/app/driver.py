"""
File: backend/app/driver.py
Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
Description: Configures the Neo4j driver and initiates connection to the graph database.
"""

import os

from neo4j import GraphDatabase

user, password = os.getenv("NEO4J_AUTH").split("/")

with GraphDatabase.driver("bolt://neo4j", auth=(user, password)) as driver:
    driver.verify_connectivity()
