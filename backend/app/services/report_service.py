from typing import List, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.report import Report
from app.services.rag_service import rag_service
from loguru import logger

class ReportService:
    async def generate_report(
        self, 
        db: AsyncSession, 
        topic: str, 
        workspace_id: UUID, 
        user_id: UUID
    ) -> Report:
        logger.info(f"Generating report for topic: {topic}")
        
        # 1. Use RAG to get detailed info
        query = f"Provide a comprehensive overview and analysis of {topic} based on the documents."
        rag_result = await rag_service.answer_question(db, query, workspace_id, top_k=10)
        
        content = f"# Report: {topic}\n\n"
        content += rag_result["answer"]
        content += "\n\n## Sources\n"
        for i, source in enumerate(rag_result["sources"]):
            content += f"- [{i+1}] File: {source['file_id']}, Page: {source['page_number']}\n"
            
        # 2. Save to DB
        db_report = Report(
            id=uuid4(),
            user_id=user_id,
            workspace_id=workspace_id,
            title=topic,
            content=content,
            status="generated"
        )
        
        db.add(db_report)
        await db.commit()
        await db.refresh(db_report)
        
        return db_report

report_service = ReportService()
