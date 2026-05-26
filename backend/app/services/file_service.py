import os
import mimetypes
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, func
from fastapi import UploadFile
from app.models.file import File, DocumentChunk
from app.models.graph import ChunkEntity, Entity, EntityRelation
from app.models.agent import Citation
from app.integrations.minio_client import minio_client
from app.core.config import settings
from app.services.file_profile_service import get_file_profile
from loguru import logger

class FileService:
    def serialize_file(self, db_file: File) -> Dict[str, Any]:
        profile = get_file_profile(db_file.file_type, db_file.mime_type)
        return {
            "id": db_file.id,
            "workspace_id": db_file.workspace_id,
            "folder_id": db_file.folder_id,
            "uploader_id": db_file.uploader_id,
            "original_filename": db_file.original_filename,
            "file_type": db_file.file_type,
            "mime_type": db_file.mime_type,
            "file_size": db_file.file_size,
            "status": db_file.status,
            "error_message": db_file.error_message,
            "page_count": db_file.page_count,
            "chunk_count": db_file.chunk_count,
            "asset_count": db_file.asset_count,
            "entity_count": db_file.entity_count,
            "created_at": db_file.created_at,
            "updated_at": db_file.updated_at,
            "file_category": profile["file_category"],
            "category_label": profile["category_label"],
            "indexing_profile": profile["indexing_profile"],
            "embedding_strategy": profile["embedding_strategy"],
            "retrieval_strategy": profile["retrieval_strategy"],
            "supported_for_ingestion": profile["supported_for_ingestion"],
            "parser_name": profile["parser_name"],
        }

    async def import_local_file(
        self,
        db: AsyncSession,
        file_path: str,
        workspace_id: UUID,
        uploader_id: UUID,
        folder_id: Optional[UUID] = None
    ) -> File:
        with open(file_path, "rb") as f:
            file_content = f.read()

        filename = os.path.basename(file_path)
        file_size = len(file_content)
        file_type = os.path.splitext(filename)[1][1:].lower()
        stored_filename = f"{uuid4()}_{filename}"
        mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        profile = get_file_profile(file_type, mime_type)

        storage_key = f"workspaces/{workspace_id}/files/{stored_filename}"
        minio_client.upload_file(
            file_data=file_content,
            object_name=storage_key,
            content_type=mime_type
        )

        db_file = File(
            id=uuid4(),
            workspace_id=workspace_id,
            folder_id=folder_id,
            uploader_id=uploader_id,
            original_filename=filename,
            stored_filename=stored_filename,
            file_type=file_type,
            mime_type=mime_type,
            file_size=file_size,
            storage_bucket=settings.MINIO_BUCKET_NAME,
            storage_key=storage_key,
            status="uploaded" if profile["supported_for_ingestion"] else "stored",
            error_message=None if profile["supported_for_ingestion"] else "Stored successfully, but semantic indexing is not enabled for this file type yet.",
        )

        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)

        logger.info(f"Local file imported and indexed in DB: {db_file.id} ({filename})")
        return db_file

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
        mime_type = upload_file.content_type or mimetypes.guess_type(upload_file.filename)[0] or "application/octet-stream"
        profile = get_file_profile(file_type, mime_type)
        
        # Upload to MinIO
        storage_key = f"workspaces/{workspace_id}/files/{stored_filename}"
        minio_client.upload_file(
            file_data=file_content,
            object_name=storage_key,
            content_type=mime_type
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
            mime_type=mime_type,
            file_size=file_size,
            storage_bucket=settings.MINIO_BUCKET_NAME,
            storage_key=storage_key,
            status="uploaded" if profile["supported_for_ingestion"] else "stored",
            error_message=None if profile["supported_for_ingestion"] else "Stored successfully, but semantic indexing is not enabled for this file type yet.",
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
            chunk_ids_subquery = select(DocumentChunk.id).where(DocumentChunk.file_id == file_id)

            # Delete relational records that reference this file before removing the file row.
            await db.execute(delete(Citation).where(Citation.file_id == file_id))
            await db.execute(delete(ChunkEntity).where(ChunkEntity.chunk_id.in_(chunk_ids_subquery)))

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
            
            # Delete associated books safely
            from app.models.book import Book, Chapter, ChapterSummary
            try:
                result = await db.execute(select(Book).where(Book.source_file_id == file_id))
                books = result.scalars().all()
                for b in books:
                    # 1. Fetch chapters
                    chap_result = await db.execute(select(Chapter).where(Chapter.book_id == b.id))
                    chapters = chap_result.scalars().all()
                    for c in chapters:
                        # Delete ChapterSummary
                        await db.execute(delete(ChapterSummary).where(ChapterSummary.chapter_id == c.id))
                    
                    from app.models.book import ReadingProgress
                    # Delete ReadingProgress
                    await db.execute(delete(ReadingProgress).where(ReadingProgress.book_id == b.id))
                    
                    # Delete Chapters
                    await db.execute(delete(Chapter).where(Chapter.book_id == b.id))
                    # Delete Book
                    await db.execute(delete(Book).where(Book.id == b.id))
            except Exception as e:
                logger.error(f"Failed to delete books for file {file_id}: {e}")
                
            # Delete from DB
            await db.delete(db_file)

            orphan_entity_ids_subquery = (
                select(Entity.id)
                .outerjoin(ChunkEntity, ChunkEntity.entity_id == Entity.id)
                .where(Entity.workspace_id == db_file.workspace_id)
                .group_by(Entity.id)
                .having(func.count(ChunkEntity.chunk_id) == 0)
            )
            await db.execute(
                delete(EntityRelation).where(
                    EntityRelation.source_id.in_(orphan_entity_ids_subquery) |
                    EntityRelation.target_id.in_(orphan_entity_ids_subquery)
                )
            )
            await db.execute(delete(Entity).where(Entity.id.in_(orphan_entity_ids_subquery)))
            await db.commit()
            return True
        return False

file_service = FileService()
