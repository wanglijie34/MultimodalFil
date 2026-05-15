from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.retrieval_service import retrieval_service
from app.services.rag_service import rag_service

router = APIRouter()

DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")

@router.get("")
async def search(
    query: str,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    top_k: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    results = await retrieval_service.search(db, query, workspace_id, top_k=top_k)
    return {"query": query, "results": results}

@router.post("/ask")
async def ask(
    query: str,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    top_k: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    result = await rag_service.answer_question(db, query, workspace_id, top_k=top_k)
    return result
