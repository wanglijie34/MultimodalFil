from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/search")
async def search_graph(
    query: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db)
):
    results = await graph_service.search_graph(query, db)
    return {"query": query, "results": results}

@router.get("/entities")
async def list_entities():
    # Fetch entities and relations to form a reasonable knowledge graph
    from app.integrations.neo4j_client import neo4j_integration
    nodes_query = "MATCH (e:Entity) RETURN e.name as name, e.type as type LIMIT 100"
    edges_query = """
    MATCH (s:Entity)-[r:RELATED_TO]->(t:Entity)
    RETURN s.name as source, type(r) as label, r.type as relation, t.name as target LIMIT 100
    """
    nodes = neo4j_integration.run_query(nodes_query)
    edges = neo4j_integration.run_query(edges_query)
    return {"nodes": nodes, "edges": edges}
