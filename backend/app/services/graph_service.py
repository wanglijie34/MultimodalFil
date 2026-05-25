import json
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.integrations.neo4j_client import neo4j_integration
from app.services.llm_service import llm_service
from app.models.graph import Entity, ChunkEntity, EntityRelation
from loguru import logger

class GraphService:
    async def extract_entities_from_chunk(self, chunk_content: str) -> Dict[str, List[Dict[str, str]]]:
        prompt = f"""Extract key entities and their relationships from the following text. 
        Return the result EXACTLY as a JSON object with two keys: 'entities' and 'relations'.
        'entities' is a list of objects with 'name', 'type', 'aliases', and 'attributes'. 
        For 'type', use standard broad categories (e.g., PERSON, ORGANIZATION, LOCATION, CONCEPT, EVENT, PRODUCT, TECHNOLOGY). DO NOT use 'unknown'. If unclear, default to 'CONCEPT'.
        'aliases' should be a list of alternative names found in the text.
        'attributes' should be a key-value dictionary of important properties found (e.g., {{"title": "Emperor", "birth_year": "1563"}}).
        'relations' is a list of objects with 'source', 'target', and 'relation'.
        
        Text: {chunk_content}
        JSON:"""
        
        try:
            response = await llm_service.chat([{"role": "user", "content": prompt}])
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            data = json.loads(response.strip())
            return {
                "entities": data.get("entities", []),
                "relations": data.get("relations", [])
            }
        except Exception as e:
            logger.error(f"Failed to extract entities: {e}")
            return {"entities": [], "relations": []}

    async def process_graph_extraction(self, db: AsyncSession, workspace_id: UUID, file_id: UUID, chunk_id: UUID, chunk_content: str):
        """Extracts entities/relations and saves them to both Postgres and Neo4j."""
        data = await self.extract_entities_from_chunk(chunk_content)
        entities = data.get("entities", [])
        relations = data.get("relations", [])
        
        if not entities:
            return
            
        entity_id_map = {}
        
        # 1. Save to Postgres
        for ent in entities:
            name = ent.get("name")
            e_type = ent.get("type")
            
            if not name:
                continue
                
            if not e_type or str(e_type).strip().upper() in ["UNKNOWN", "NULL", "NONE", ""]:
                e_type = "CONCEPT"
                ent["type"] = e_type
                
            # Find or create Entity
            stmt = select(Entity).where(Entity.workspace_id == workspace_id, Entity.name == name)
            result = await db.execute(stmt)
            db_ent = result.scalar_one_or_none()
            
            if not db_ent:
                meta_dict = {}
                if ent.get("aliases"):
                    meta_dict["aliases"] = ent.get("aliases")
                if ent.get("attributes"):
                    meta_dict["attributes"] = ent.get("attributes")
                    
                db_ent = Entity(workspace_id=workspace_id, name=name, type=e_type, meta=meta_dict)
                db.add(db_ent)
                await db.flush() # get ID
            else:
                updated = False
                current_meta = db_ent.meta or {}
                
                new_aliases = set(current_meta.get("aliases", []))
                for alias in ent.get("aliases", []):
                    if alias not in new_aliases:
                        new_aliases.add(alias)
                        updated = True
                
                new_attrs = current_meta.get("attributes", {})
                for k, v in ent.get("attributes", {}).items():
                    if k not in new_attrs or new_attrs[k] != v:
                        new_attrs[k] = v
                        updated = True
                        
                if updated:
                    current_meta["aliases"] = list(new_aliases)
                    current_meta["attributes"] = new_attrs
                    db_ent.meta = dict(current_meta)
                    db.add(db_ent)
                
            entity_id_map[name] = db_ent.id
            
            # Link to Chunk
            chunk_link = ChunkEntity(chunk_id=chunk_id, entity_id=db_ent.id)
            db.add(chunk_link)
            
        # Save Relations to Postgres
        for rel in relations:
            source_name = rel.get("source")
            target_name = rel.get("target")
            r_type = rel.get("relation")
            
            source_id = entity_id_map.get(source_name)
            target_id = entity_id_map.get(target_name)
            
            if source_id and target_id and r_type:
                db_rel = EntityRelation(
                    source_id=source_id,
                    target_id=target_id,
                    relation_type=r_type
                )
                db.add(db_rel)
                
        # Commit Postgres changes
        try:
            await db.commit()
        except Exception as e:
            logger.error(f"Postgres commit failed for graph extraction: {e}")
            await db.rollback()
            return
            
        # 2. Save to Neo4j
        await self.add_entities_to_graph(str(chunk_id), str(file_id), entities, relations)

    async def add_entities_to_graph(self, chunk_id: str, file_id: str, entities: List[Dict[str, str]], relations: List[Dict[str, str]] = None):
        """Persists the extracted entities and relations to Neo4j."""
        if not relations:
            relations = []
            
        # Create Entities and link to DocumentChunk
        for entity in entities:
            query = """
            MERGE (e:Entity {name: $name})
            SET e.type = $type
            WITH e
            CALL apoc.create.setProperties(e, $attributes) YIELD node AS e_with_attrs
            SET e_with_attrs.aliases = $aliases
            MERGE (c:DocumentChunk {id: $chunk_id})
            SET c.file_id = $file_id
            MERGE (c)-[:MENTIONS]->(e_with_attrs)
            """
            
            str_attributes = {}
            for k, v in entity.get("attributes", {}).items():
                str_attributes[str(k)] = str(v)
                
            neo4j_integration.run_query(query, {
                "name": entity.get("name"),
                "type": entity.get("type"),
                "aliases": entity.get("aliases", []),
                "attributes": str_attributes,
                "chunk_id": chunk_id,
                "file_id": file_id
            })
            
        # Create Relations
        for rel in relations:
            query = """
            MATCH (source:Entity {name: $source_name})
            MATCH (target:Entity {name: $target_name})
            MERGE (source)-[r:RELATED_TO {type: $rel_type}]->(target)
            """
            neo4j_integration.run_query(query, {
                "source_name": rel.get("source"),
                "target_name": rel.get("target"),
                "rel_type": rel.get("relation", "RELATED")
            })
            
    async def search_graph(self, query_text: str, file_id: Optional[UUID] = None, db: AsyncSession = None):
        # Very simple search: find entities mentioned in documents
        if file_id:
            cypher = """
            MATCH (e:Entity)
            WHERE e.name CONTAINS $query
            MATCH (e)<-[:MENTIONS]-(c:DocumentChunk {file_id: $file_id})
            RETURN e.name as entity, e.type as type, c.id as chunk_id
            """
            results = neo4j_integration.run_query(cypher, {"query": query_text, "file_id": str(file_id)})
        else:
            cypher = """
            MATCH (e:Entity)
            WHERE e.name CONTAINS $query
            MATCH (e)<-[:MENTIONS]-(c:DocumentChunk)
            RETURN e.name as entity, e.type as type, c.id as chunk_id
            """
            results = neo4j_integration.run_query(cypher, {"query": query_text})
        
        if db and results:
            from app.models.file import DocumentChunk
            from sqlalchemy import select
            
            chunk_ids = list(set([r["chunk_id"] for r in results if r.get("chunk_id")]))
            if chunk_ids:
                stmt = select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids))
                db_result = await db.execute(stmt)
                chunks = db_result.scalars().all()
                chunk_map = {str(c.id): c.content for c in chunks}
                
                for r in results:
                    r["text"] = chunk_map.get(str(r["chunk_id"]), "")
                    
        return results

    async def get_entity_context(self, chunk_ids: List[str]) -> str:
        """LightRAG-style: Expand context using entity neighbors"""
        if not chunk_ids:
            return ""
            
        cypher = """
        MATCH (c:DocumentChunk)-[:MENTIONS]->(e:Entity)
        WHERE c.id IN $chunk_ids
        MATCH (e)-[r]-(neighbor:Entity)
        RETURN e.name as source, r.type as relation, neighbor.name as target
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
