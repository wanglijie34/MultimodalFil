from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.file import DocumentChunk, File
from app.services.embedding_service import embedding_service
from app.services.vector_store_service import vector_store_service
from loguru import logger

class RetrievalService:
    async def search(
        self, 
        db: AsyncSession, 
        query: str, 
        workspace_id: UUID, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        logger.info(f"Performing hybrid search for: {query}")
        
        # 1. Vector Search
        query_vector = await embedding_service.embed_text(query)
        vector_results = await vector_store_service.search(query_vector, top_k=top_k)
        
        # 2. Keyword Search (Simple fallback using SQL ILIKE)
        # In a real app, use pg_trgm or FTS
        keyword_query = select(DocumentChunk).where(DocumentChunk.content.ilike(f"%{query}%")).limit(top_k)
        keyword_result = await db.execute(keyword_query)
        keyword_chunks = keyword_result.scalars().all()
        
        # 3. Merge and Rerank (Simple merge for now)
        seen_ids = set()
        merged_results = []
        
        # Add vector results first
        for res in vector_results:
            seen_ids.add(res.id)
            merged_results.append({
                "chunk_id": res.id,
                "content": res.payload["content"],
                "file_id": res.payload["file_id"],
                "page_number": res.payload.get("page_number"),
                "score": res.score,
                "source_type": "vector"
            })
            
        # Add keyword results if not already there
        for chunk in keyword_chunks:
            if str(chunk.id) not in seen_ids:
                merged_results.append({
                    "chunk_id": str(chunk.id),
                    "content": chunk.content,
                    "file_id": str(chunk.file_id),
                    "page_number": chunk.page_number,
                    "score": 0.5, # Default score for keyword match
                    "source_type": "keyword"
                })
        
        # Sort by score
        merged_results.sort(key=lambda x: x["score"], reverse=True)
        return merged_results[:top_k]

retrieval_service = RetrievalService()
