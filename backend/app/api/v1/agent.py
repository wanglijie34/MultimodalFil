from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.rag_service import rag_service
from app.agents.graph import agent_executor
from app.agents.state import AgentState

router = APIRouter()

DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")

@router.post("/runs")
async def create_run(
    query: str,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    # For MVP, we'll use the RAG service directly first as it's more reliable
    # than the complex LangGraph setup without proper session management.
    # But we'll record it as an Agent Run.
    
    result = await rag_service.answer_question(db, query, workspace_id)
    
    # TODO: Save to AgentRun model
    
    return {
        "run_id": str(uuid4()),
        "query": query,
        "answer": result["answer"],
        "citations": result["sources"]
    }
