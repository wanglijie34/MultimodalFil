from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.graph_service import graph_service

from uuid import UUID

router = APIRouter()

@router.get("/search")
async def search_graph(
    query: str = Query(..., min_length=1),
    file_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    results = await graph_service.search_graph(query, file_id, db)
    return {"query": query, "results": results}

@router.get("/entities")
async def list_entities(file_id: Optional[UUID] = None):
    # Fetch entities and relations to form a reasonable knowledge graph
    from app.integrations.neo4j_client import neo4j_integration
    
    if file_id:
        nodes_query = """
        MATCH (c:DocumentChunk {file_id: $file_id})-[:MENTIONS]->(e:Entity)
        RETURN DISTINCT e.name as name, e.type as type LIMIT 100
        """
        edges_query = """
        MATCH (c:DocumentChunk {file_id: $file_id})-[:MENTIONS]->(s:Entity)-[r:RELATED_TO]->(t:Entity)
        RETURN DISTINCT s.name as source, type(r) as label, r.type as relation, t.name as target LIMIT 100
        """
        nodes = neo4j_integration.run_query(nodes_query, {"file_id": str(file_id)})
        edges = neo4j_integration.run_query(edges_query, {"file_id": str(file_id)})
    else:
        nodes_query = "MATCH (e:Entity) RETURN e.name as name, e.type as type LIMIT 100"
        edges_query = """
        MATCH (s:Entity)-[r:RELATED_TO]->(t:Entity)
        RETURN s.name as source, type(r) as label, r.type as relation, t.name as target LIMIT 100
        """
        nodes = neo4j_integration.run_query(nodes_query)
        edges = neo4j_integration.run_query(edges_query)
        
    return {"nodes": nodes, "edges": edges}
