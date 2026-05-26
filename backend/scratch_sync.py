import asyncio
from app.db.session import AsyncSessionLocal
import app.db.base
from app.models.file import DocumentChunk
from app.models.graph import Entity, ChunkEntity, EntityRelation
from app.integrations.neo4j_client import neo4j_integration
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(DocumentChunk))
        chunks = res.scalars().all()
        
        for c in chunks:
            q = select(Entity).join(ChunkEntity).where(ChunkEntity.chunk_id == c.id)
            res_e = await db.execute(q)
            entities = res_e.scalars().all()
            
            if not entities: continue
            
            for e in entities:
                if not e.name: continue
                query = '''
                MERGE (en:Entity {name: $name})
                SET en.type = $type
                SET en += $attributes
                SET en.aliases = $aliases
                MERGE (ch:DocumentChunk {id: $chunk_id})
                SET ch.file_id = $file_id
                MERGE (ch)-[:MENTIONS]->(en)
                '''
                
                meta = e.meta or {}
                attrs = meta.get('attributes', {})
                aliases = meta.get('aliases', [])
                
                str_attributes = {str(k): str(v) for k, v in attrs.items()}
                
                neo4j_integration.run_query(query, {
                    'name': str(e.name),
                    'type': str(e.type) if e.type else 'CONCEPT',
                    'aliases': aliases,
                    'attributes': str_attributes,
                    'chunk_id': str(c.id),
                    'file_id': str(c.file_id)
                })
        
        res_r = await db.execute(select(EntityRelation))
        relations = res_r.scalars().all()
        
        for r in relations:
            src = await db.get(Entity, r.source_id)
            tgt = await db.get(Entity, r.target_id)
            if src and tgt and src.name and tgt.name:
                query = '''
                MATCH (s:Entity {name: $source_name})
                MATCH (t:Entity {name: $target_name})
                MERGE (s)-[rel:RELATED_TO {type: $r_type}]->(t)
                '''
                neo4j_integration.run_query(query, {
                    'source_name': str(src.name),
                    'target_name': str(tgt.name),
                    'r_type': str(r.relation_type) if r.relation_type else 'RELATED'
                })
                
        print('Finished copying Postgres graph to Neo4j')

asyncio.run(main())
