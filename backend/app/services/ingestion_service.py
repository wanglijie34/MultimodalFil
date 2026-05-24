import os
import tempfile
from typing import List, Dict, Optional, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.file import File, DocumentPage, DocumentChunk
from app.integrations.minio_client import minio_client
from app.parsers.pdf_parser import PDFParser
from app.parsers.docx_parser import DOCXParser
from app.parsers.pptx_parser import PPTXParser
from app.parsers.txt_parser import TXTParser
from app.parsers.md_parser import MDParser
from app.parsers.epub_parser import EPUBParser
import asyncio
from app.services.chunking_service import chunking_service
from app.services.file_profile_service import get_file_profile
from app.core.websocket import manager
from loguru import logger

class IngestionService:
    def __init__(self):
        self.parsers = {
            "pdf": PDFParser(),
            "docx": DOCXParser(),
            "pptx": PPTXParser(),
            "txt": TXTParser(),
            "md": MDParser(),
            "epub": EPUBParser()
        }

    async def process_file(self, file_id: UUID, db: Optional[AsyncSession] = None):
        from app.db.session import AsyncSessionLocal

        if db is not None:
            await self._process_file_with_session(db, file_id)
            return

        async with AsyncSessionLocal() as session:
            await self._process_file_with_session(session, file_id)

    async def _process_file_with_session(self, db: AsyncSession, file_id: UUID):
        # 1. Get file metadata
        from app.services.file_service import file_service
        db_file = await file_service.get_file(db, file_id)
        if not db_file:
            logger.error(f"File {file_id} not found for ingestion")
            return

        profile = get_file_profile(db_file.file_type, db_file.mime_type)
        if not profile["supported_for_ingestion"]:
            db_file.status = "stored"
            db_file.error_message = "Stored successfully, but semantic indexing is not enabled for this file type yet."
            await db.commit()
            return

        db_file.status = "parsing"
        await db.commit()
        await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "parsing"})

        try:
            # 2. Download from MinIO to local temp file
            file_data = minio_client.download_file(db_file.storage_key)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{db_file.file_type}") as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            # 3. Select parser and parse
            parser = self.parsers.get(profile["parser_key"] or db_file.file_type)
            if not parser:
                raise ValueError(f"No parser for file type: {db_file.file_type}")

            parsed_doc = parser.parse(tmp_path, str(file_id))
            
            # 4. Save pages
            db_file.status = "chunking"
            await db.commit()
            await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "chunking"})
            
            for page in parsed_doc.pages:
                db_page = DocumentPage(
                    file_id=file_id,
                    page_number=page.page_number,
                    text_content=page.text
                )
                db.add(db_page)
            
            # 5. Chunk
            chunks = chunking_service.chunk_document(
                parsed_doc,
                chunk_size=profile["chunk_size"],
                chunk_overlap=profile["chunk_overlap"],
                split_mode=profile["split_mode"],
                overlap_lines=profile["overlap_lines"],
                extra_meta={
                    "file_type": db_file.file_type,
                    "file_category": profile["file_category"],
                    "indexing_profile": profile["indexing_profile"],
                    "query_bias": profile["query_bias"],
                },
            )
            db.add_all(chunks)
            
            # 6. Embed and Index (Phase 4)
            db_file.status = "embedding"
            await db.commit()
            await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "embedding"})
            
            from app.services.embedding_service import embedding_service
            from app.services.vector_store_service import vector_store_service
            from app.services.llm_service import llm_service
            
            chunk_texts = [c.content for c in chunks]
            embeddings = await embedding_service.embed_batch(chunk_texts)
            await vector_store_service.index_chunks(chunks, embeddings)
            
            # 7. RAPTOR: Generate Hierarchical Summaries
            summary_chunks = []
            if profile["enable_summaries"]:
                db_file.status = "summarizing"
                await db.commit()
                await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "summarizing"})
                summary_chunks = await self._generate_hierarchical_summaries(db, chunks)
            
            # 8. Graph Extraction
            if profile["enable_graph_extraction"]:
                db_file.status = "graph_extracting"
                await db.commit()
                await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "graph_extracting"})

                from app.services.graph_service import graph_service

                graph_sem = asyncio.Semaphore(5)

                async def _extract_chunk(chunk):
                    async with graph_sem:
                        try:
                            await graph_service.process_graph_extraction(
                                db=db,
                                workspace_id=db_file.workspace_id,
                                file_id=db_file.id,
                                chunk_id=chunk.id,
                                chunk_content=chunk.content
                            )
                        except Exception as ge:
                            logger.error(f"Graph extraction failed for chunk {chunk.id}: {ge}")

                graph_chunks = summary_chunks if summary_chunks else chunks
                await asyncio.gather(*[_extract_chunk(c) for c in graph_chunks])
            
            # Update counts
            db_file.page_count = len(parsed_doc.pages)
            db_file.chunk_count = await self._get_total_chunk_count(db, file_id)
            db_file.status = "indexed" 
            await db.commit()
            await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "indexed"})
            
        except Exception as e:
            logger.exception(f"Error ingesting file {file_id}: {e}")
            db_file.status = "failed"
            db_file.error_message = str(e)
            await db.commit()
            await manager.broadcast({"type": "file_status", "file_id": str(file_id), "status": "failed"})

    async def _generate_hierarchical_summaries(self, db: AsyncSession, leaf_chunks: List[DocumentChunk]):
        """RAPTOR-style summary generation"""
        from app.services.llm_service import llm_service
        from app.services.embedding_service import embedding_service
        from app.services.vector_store_service import vector_store_service
        from uuid import uuid4
        
        # Group chunks by page for first level summary
        pages = {}
        for chunk in leaf_chunks:
            pg = chunk.page_number or 1
            if pg not in pages: pages[pg] = []
            pages[pg].append(chunk.content)
            
        summary_chunks = []
        sem = asyncio.Semaphore(10)

        async def process_level1(pg, texts):
            combined_text = "\n".join(texts)
            if len(combined_text.split()) < 100: return None
            
            prompt = f"Summarize the following document page in 2-3 concise sentences:\n\n{combined_text}"
            async with sem:
                try:
                    summary_text = await llm_service.chat([{"role": "user", "content": prompt}])
                    return DocumentChunk(
                        id=uuid4(),
                        file_id=leaf_chunks[0].file_id,
                        is_summary=True,
                        level=1,
                        page_number=pg,
                        chunk_index=999 + pg,
                        content=summary_text,
                        meta={
                            **leaf_chunks[0].meta,
                            "source_page": pg,
                            "is_summary": True,
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to generate summary for page {pg}: {e}")
                    return None

        l1_tasks = [process_level1(pg, texts) for pg, texts in pages.items()]
        l1_results = await asyncio.gather(*l1_tasks)

        l1_chunks = []
        for s_chunk in l1_results:
            if s_chunk:
                db.add(s_chunk)
                l1_chunks.append(s_chunk)
                summary_chunks.append(s_chunk)
                
        # Level 2 Summaries (Global Themes)
        if len(l1_chunks) > 1:
            # Chunk L1 summaries into blocks of 10 to form L2
            l1_texts = [c.content for c in l1_chunks]
            l2_chunks = []
            block_size = 10
            for i in range(0, len(l1_texts), block_size):
                block = l1_texts[i:i+block_size]
                combined_l1 = "\n".join(block)
                prompt = f"Synthesize these page summaries into a comprehensive macro-level thematic summary (focusing on major events, global topics, and comprehensive concepts):\n\n{combined_l1}"
                try:
                    l2_text = await llm_service.chat([{"role": "user", "content": prompt}])
                    l2_chunk = DocumentChunk(
                        id=uuid4(),
                        file_id=leaf_chunks[0].file_id,
                        is_summary=True,
                        level=2,
                        page_number=0,
                        chunk_index=9000 + i,
                        content=l2_text,
                        meta={
                            **leaf_chunks[0].meta,
                            "type": "macro_summary",
                            "is_summary": True,
                        }
                    )
                    db.add(l2_chunk)
                    l2_chunks.append(l2_chunk)
                    summary_chunks.append(l2_chunk)
                except Exception as e:
                    logger.error(f"Failed to generate Level 2 summary: {e}")
            
        await db.commit()
        
        # Index summaries in Qdrant
        if summary_chunks:
            s_texts = [s.content for s in summary_chunks]
            s_embeddings = await embedding_service.embed_batch(s_texts)
            await vector_store_service.index_chunks(summary_chunks, s_embeddings)
            logger.info(f"Generated and indexed {len(l1_chunks)} L1 and {len(summary_chunks) - len(l1_chunks)} L2 summaries for RAPTOR")
            
        return summary_chunks

    async def _get_total_chunk_count(self, db: AsyncSession, file_id: UUID) -> int:
        from sqlalchemy import func, select
        result = await db.execute(select(func.count()).select_from(DocumentChunk).where(DocumentChunk.file_id == file_id))
        return result.scalar() or 0

ingestion_service = IngestionService()
