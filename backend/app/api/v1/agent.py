from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from app.db.session import get_db
from app.services.rag_service import rag_service
from app.agents.graph import agent_executor
from app.agents.state import AgentState
from app.models.agent import AgentRun, AgentMessage
from loguru import logger

router = APIRouter()

DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")

@router.post("/runs")
async def create_run(
    query: str,
    file_id: Optional[UUID] = None,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    initial_state = {
        "run_id": str(uuid4()),
        "workspace_id": str(workspace_id),
        "file_id": str(file_id) if file_id else None,
        "user_query": query,
        "sub_queries": [],
        "task_type": None,
        "retrieved_chunks": [],
        "verification_result": None,
        "final_answer": None,
        "citations": [],
        "errors": [],
        "trace_logs": [],
        "retries": 0,
        "db": db
    }
    
    final_state = await agent_executor.ainvoke(initial_state)
    
    answer = final_state.get("final_answer", "Error generating response.")
    citations = final_state.get("citations", [])
    trace_logs = final_state.get("trace_logs", [])
    
    DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001") # MVP hardcode with valid FK
    run = AgentRun(
        user_id=DEFAULT_USER_ID,
        workspace_id=workspace_id,
        query=query,
        status="completed",
        result=answer
    )
    db.add(run)
    await db.flush()
    
    user_msg = AgentMessage(run_id=run.id, role="user", content=query)
    assistant_msg = AgentMessage(run_id=run.id, role="assistant", content=answer)
    db.add(user_msg)
    db.add(assistant_msg)
    
    await db.commit()
    
    logger.info(f"Agent Chat Run [{run.id}] Workspace [{workspace_id}] - Query: '{query}' | Citations: {len(citations)}")
    
    return {
        "run_id": str(run.id),
        "query": query,
        "answer": answer,
        "citations": citations,
        "trace_logs": trace_logs
    }

@router.get("/runs")
async def list_runs(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AgentRun).where(AgentRun.workspace_id == workspace_id).order_by(desc(AgentRun.created_at))
    res = await db.execute(stmt)
    runs = res.scalars().all()
    
    return [
        {
            "id": str(r.id),
            "query": r.query,
            "result": r.result,
            "created_at": r.created_at
        }
        for r in runs
    ]
