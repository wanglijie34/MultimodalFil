import os
from typing import List, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import UploadFile
from app.models.file import File
from app.integrations.minio_client import minio_client
from app.core.config import settings
from loguru import logger

class FileService:
    async def upload_file(
        self, 
        db: AsyncSession, 
        upload_file: UploadFile, 
        workspace_id: UUID, 
        uploader_id: UUID,
        folder_id: Optional[UUID] = None
    ) -> File:
        file_content = await upload_file.read()
        file_size = len(file_content)
        file_type = os.path.splitext(upload_file.filename)[1][1:].lower()
        stored_filename = f"{uuid4()}_{upload_file.filename}"
        
        # Upload to MinIO
        storage_key = f"workspaces/{workspace_id}/files/{stored_filename}"
        minio_client.upload_file(
            file_data=file_content,
            object_name=storage_key,
            content_type=upload_file.content_type
        )
        
        # Save to DB
        db_file = File(
            id=uuid4(),
            workspace_id=workspace_id,
            folder_id=folder_id,
            uploader_id=uploader_id,
            original_filename=upload_file.filename,
            stored_filename=stored_filename,
            file_type=file_type,
            mime_type=upload_file.content_type,
            file_size=file_size,
            storage_bucket=settings.MINIO_BUCKET_NAME,
            storage_key=storage_key,
            status="uploaded"
        )
        
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        
        logger.info(f"File uploaded and indexed in DB: {db_file.id}")
        return db_file

    async def list_files(
        self, 
        db: AsyncSession, 
        workspace_id: UUID, 
        folder_id: Optional[UUID] = None
    ) -> List[File]:
        query = select(File).where(File.workspace_id == workspace_id)
        if folder_id:
            query = query.where(File.folder_id == folder_id)
        
        result = await db.execute(query)
        return result.scalars().all()

    async def get_file(self, db: AsyncSession, file_id: UUID) -> Optional[File]:
        result = await db.execute(select(File).where(File.id == file_id))
        return result.scalar_one_or_none()

    async def delete_file(self, db: AsyncSession, file_id: UUID):
        db_file = await self.get_file(db, file_id)
        if db_file:
            # Delete from MinIO
            minio_client.delete_file(db_file.storage_key)
            
            # Delete from Neo4j
            from app.integrations.neo4j_client import neo4j_integration
            try:
                # 1. Delete all chunks associated with the file
                neo4j_integration.run_query("""
                MATCH (c:DocumentChunk {file_id: $file_id})
                DETACH DELETE c
                """, {"file_id": str(file_id)})
                
                # 2. Cleanup orphaned Entities (Entities with no MENTIONS relationships)
                neo4j_integration.run_query("""
                MATCH (e:Entity)
                WHERE NOT (e)<-[:MENTIONS]-()
                DETACH DELETE e
                """)
            except Exception as e:
                logger.error(f"Failed to cleanup Neo4j graph for file {file_id}: {e}")
            
            # Delete from DB
            await db.delete(db_file)
            await db.commit()
            return True
        return False

file_service = FileService()
