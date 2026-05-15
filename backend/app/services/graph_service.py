import json
from typing import List, Dict, Any
from uuid import UUID
from app.integrations.neo4j_client import neo4j_integration
from app.services.llm_service import llm_service
from loguru import logger

class GraphService:
    async def extract_entities_from_chunk(self, chunk_content: str) -> List[Dict[str, str]]:
        prompt = f"""Extract key entities and their types from the following text. 
        Return the result as a JSON list of objects with 'name' and 'type'.
        
        Text: {chunk_content}
        JSON:"""
        
        try:
            response = await llm_service.chat([{"role": "user", "content": prompt}])
            # Basic JSON extraction logic
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            entities = json.loads(response.strip())
            return entities
        except Exception as e:
            logger.error(f"Failed to extract entities: {e}")
            return []

    async def add_entities_to_graph(self, file_id: str, entities: List[Dict[str, str]]):
        for entity in entities:
            query = """
            MERGE (e:Entity {name: $name})
            SET e.type = $type
            MERGE (f:Document {id: $file_id})
            MERGE (f)-[:MENTIONS]->(e)
            """
            neo4j_integration.run_query(query, {
                "name": entity["name"],
                "type": entity["type"],
                "file_id": file_id
            })
            
    async def search_graph(self, query_text: str):
        # Very simple search: find entities mentioned in documents
        cypher = """
        MATCH (e:Entity)
        WHERE e.name CONTAINS $query
        MATCH (e)<-[:MENTIONS]-(d:Document)
        RETURN e.name as entity, e.type as type, d.id as document_id
        """
        return neo4j_integration.run_query(cypher, {"query": query_text})

    async def get_entity_context(self, chunk_ids: List[str]) -> str:
        """LightRAG-style: Expand context using entity neighbors"""
        if not chunk_ids:
            return ""
            
        cypher = """
        MATCH (c:DocumentChunk)-[:MENTIONS]->(e:Entity)
        WHERE c.id IN $chunk_ids
        MATCH (e)-[r]-(neighbor:Entity)
        RETURN e.name as source, type(r) as relation, neighbor.name as target
        LIMIT 20
        """
        triples = neo4j_integration.run_query(cypher, {"chunk_ids": chunk_ids})
        
        if not triples:
            return ""
            
        context_parts = ["Knowledge Graph Context:"]
        for t in triples:
            context_parts.append(f"- {t['source']} {t['relation']} {t['target']}")
            
        return "\n".join(context_parts)

graph_service = GraphService()
