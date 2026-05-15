from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.report import Report
from app.services.report_service import report_service

router = APIRouter()

DEFAULT_WORKSPACE_ID = UUID("00000000-0000-0000-0000-000000000000")
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

@router.post("")
async def create_report(
    topic: str,
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    return await report_service.generate_report(db, topic, workspace_id, DEFAULT_USER_ID)

@router.get("")
async def list_reports(
    workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Report).where(Report.workspace_id == workspace_id))
    return result.scalars().all()

@router.get("/{report_id}")
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
