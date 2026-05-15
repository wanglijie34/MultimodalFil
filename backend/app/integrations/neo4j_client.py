from neo4j import GraphDatabase
from app.core.config import settings
from loguru import logger

class Neo4jIntegration:
    def __init__(self):
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            self._verify_connectivity()
        except Exception as e:
            logger.warning(f"Failed to connect to Neo4j: {e}")
            self.driver = None

    def _verify_connectivity(self):
        if self.driver:
            self.driver.verify_connectivity()
            logger.info("Connected to Neo4j")

    def close(self):
        if self.driver:
            self.driver.close()

    def run_query(self, query: str, parameters: dict = None):
        if not self.driver:
            logger.warning("Neo4j driver not initialized")
            return []
            
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]

neo4j_integration = Neo4jIntegration()
