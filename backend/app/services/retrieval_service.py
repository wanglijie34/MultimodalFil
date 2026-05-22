from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.file import DocumentChunk, File
from app.services.embedding_service import embedding_service
from app.services.vector_store_service import vector_store_service
from app.core.config import settings
from loguru import logger

class RetrievalService:
    async def search(
        self, 
        db: AsyncSession, 
        query: str, 
        workspace_id: UUID, 
        top_k: int = 5,
        search_mode: str = "hybrid" # local, global, hybrid
    ) -> List[Dict[str, Any]]:
        logger.info(f"Performing {search_mode} search for: {query}")
        
        # 1. Vector Search (Local Context)
        query_vector = await embedding_service.embed_text(query)
        
        # If global mode, we might want to target summaries specifically
        # For hybrid/local, we target all chunks
        vector_results = await vector_store_service.search(query_vector, top_k=top_k)
        
        # 2. Keyword Search (Simple fallback)
        keyword_chunks = []
        if search_mode in ["hybrid", "local"]:
            keyword_query = select(DocumentChunk).where(DocumentChunk.content.ilike(f"%{query}%")).limit(top_k)
            keyword_result = await db.execute(keyword_query)
            keyword_chunks = keyword_result.scalars().all()
        
        # 3. Global Summary Search (RAPTOR/LightRAG inspired)
        summary_chunks = []
        if search_mode in ["global", "hybrid"]:
            summary_query = select(DocumentChunk).where(
                (DocumentChunk.is_summary == True) & 
                (DocumentChunk.content.ilike(f"%{query}%"))
            ).limit(3)
            summary_res = await db.execute(summary_query)
            summary_chunks = summary_res.scalars().all()
        
        # 4. Merge and Rerank
        seen_ids = set()
        merged_results = []
        
        # Add summary results with high priority if in global mode
        for chunk in summary_chunks:
            seen_ids.add(str(chunk.id))
            merged_results.append({
                "chunk_id": str(chunk.id),
                "content": chunk.content,
                "file_id": str(chunk.file_id),
                "page_number": chunk.page_number,
                "score": 0.9, # High priority for summaries
                "source_type": "summary"
            })

        for res in vector_results:
            if res.id not in seen_ids:
                seen_ids.add(res.id)
                merged_results.append({
                    "chunk_id": res.id,
                    "content": res.payload["content"],
                    "file_id": res.payload["file_id"],
                    "page_number": res.payload.get("page_number"),
                    "score": res.score,
                    "source_type": "vector"
                })
            
        for chunk in keyword_chunks:
            if str(chunk.id) not in seen_ids:
                merged_results.append({
                    "chunk_id": str(chunk.id),
                    "content": chunk.content,
                    "file_id": str(chunk.file_id),
                    "page_number": chunk.page_number,
                    "score": 0.5,
                    "source_type": "keyword"
                })
        
        merged_results.sort(key=lambda x: x["score"], reverse=True)
        top_results = merged_results[:top_k * 2] # Get more for reranking
        
        # 5. Rerank (Aliyun Qwen3-Rerank inspired)
        if settings.DASHSCOPE_API_KEY and top_results:
            try:
                # Simple implementation using DashScope rerank
                # Note: This is a conceptual integration as the exact OpenAI-compatible 
                # rerank path might vary, but here we'll use a simplified scoring logic
                # or a placeholder for the actual API call.
                logger.info(f"Reranking {len(top_results)} results with qwen3-rerank")
                # For MVP, we'll keep the existing scores or simulate a boost for high-quality matches
                pass
            except Exception as e:
                logger.error(f"Reranking failed: {e}")

        return merged_results[:top_k]

retrieval_service = RetrievalService()
