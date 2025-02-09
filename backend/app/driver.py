import os

from neo4j import GraphDatabase

user, password = os.getenv("NEO4J_AUTH").split("/")

with GraphDatabase.driver("bolt://neo4j", auth=(user, password)) as driver:
    driver.verify_connectivity()
