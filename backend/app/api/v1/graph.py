from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/search")
async def search_graph(
    query: str = Query(..., min_length=1)
):
    results = await graph_service.search_graph(query)
    return {"query": query, "results": results}

@router.get("/entities")
async def list_entities():
    # Placeholder for listing all entities
    from app.integrations.neo4j_client import neo4j_integration
    query = "MATCH (e:Entity) RETURN e.name as name, e.type as type LIMIT 100"
    return neo4j_integration.run_query(query)
