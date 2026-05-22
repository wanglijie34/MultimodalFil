from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.db.session import get_db
from app.schemas.system import DashboardStats
from app.models.file import File
from app.models.agent import AgentRun
from app.models.graph import Entity
from uuid import UUID

router = APIRouter()

# TODO: Replace with actual auth dependencies
DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")

@router.get("/stats", response_model=DashboardStats)
async def get_system_stats(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    # Total files
    files_result = await db.execute(
        select(func.count(File.id)).where(File.workspace_id == workspace_id)
    )
    total_files = files_result.scalar_one_or_none() or 0

    # Agent runs
    runs_result = await db.execute(
        select(func.count(AgentRun.id)).where(AgentRun.workspace_id == workspace_id)
    )
    agent_runs = runs_result.scalar_one_or_none() or 0

    # Knowledge entities
    entities_result = await db.execute(
        select(func.count(Entity.id)).where(Entity.workspace_id == workspace_id)
    )
    knowledge_entities = entities_result.scalar_one_or_none() or 0

    # Storage used (sum of file_size)
    storage_result = await db.execute(
        select(func.sum(File.file_size)).where(File.workspace_id == workspace_id)
    )
    storage_used_bytes = storage_result.scalar_one_or_none() or 0

    return DashboardStats(
        total_files=total_files,
        agent_runs=agent_runs,
        knowledge_entities=knowledge_entities,
        storage_used_bytes=storage_used_bytes
    )
