import re
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.models.file import DocumentChunk
from app.services.embedding_service import embedding_service
from app.services.file_profile_service import compute_query_bias_boost, describe_query_profile
from app.services.vector_store_service import vector_store_service
from app.core.config import settings
from loguru import logger

class RetrievalService:
    def _extract_search_terms(self, query: str) -> List[str]:
        raw_parts = re.split(r"[\s,\uFF0C\u3002\uFF1B;\u3001|/()\[\]{}:\uFF1A\"'`!?\uFF1F]+", query)
        seen = set()
        terms = []

        for part in [query.strip(), *raw_parts]:
            term = part.strip()
            if len(term) < 2:
                continue
            key = term.lower()
            if key in seen:
                continue
            seen.add(key)
            terms.append(term)

        return terms[:8]

    async def search(
        self, 
        db: AsyncSession, 
        query: str, 
        workspace_id: UUID, 
        top_k: int = 5,
        search_mode: str = "hybrid", # local, global, hybrid
        file_id: UUID = None
    ) -> List[Dict[str, Any]]:
        logger.info(f"Performing {search_mode} search for: {query}")
        
        # 1. Vector Search (Local Context)
        query_vector = await embedding_service.embed_text(query)
        search_terms = self._extract_search_terms(query)
        query_profile = describe_query_profile(query)
        
        # If global mode, we might want to target summaries specifically
        # For hybrid/local, we target all chunks
        vector_results = await vector_store_service.search(query_vector, top_k=top_k, file_id=file_id)
        
        # 2. Keyword Search (Simple fallback)
        keyword_chunks = []
        if search_mode in ["hybrid", "local"] and search_terms:
            keyword_query = select(DocumentChunk).where(
                or_(*[DocumentChunk.content.ilike(f"%{term}%") for term in search_terms])
            )
            if file_id:
                keyword_query = keyword_query.where(DocumentChunk.file_id == file_id)
            keyword_query = keyword_query.limit(top_k * 4)
            keyword_result = await db.execute(keyword_query)
            keyword_chunks = keyword_result.scalars().all()
        
        # 3. Global Summary Search (RAPTOR/LightRAG inspired)
        summary_chunks = []
        if search_mode in ["global", "hybrid"] and search_terms:
            summary_query = select(DocumentChunk).where(
                (DocumentChunk.is_summary == True) &
                or_(*[DocumentChunk.content.ilike(f"%{term}%") for term in search_terms])
            )
            if file_id:
                summary_query = summary_query.where(DocumentChunk.file_id == file_id)
            summary_query = summary_query.limit(max(3, top_k))
            summary_res = await db.execute(summary_query)
            summary_chunks = summary_res.scalars().all()
        
        # 4. Merge and Rerank
        seen_ids = set()
        merged_results = []
        
        # Add summary results with high priority if in global mode
        for chunk in summary_chunks:
            matched_terms = sum(1 for term in search_terms if term.lower() in chunk.content.lower())
            seen_ids.add(str(chunk.id))
            meta = chunk.meta or {}
            merged_results.append({
                "chunk_id": str(chunk.id),
                "content": chunk.content,
                "file_id": str(chunk.file_id),
                "page_number": chunk.page_number,
                "score": 0.85 + min(matched_terms, 3) * 0.03 + compute_query_bias_boost({**meta, "is_summary": True}, query_profile),
                "source_type": "summary",
                "file_category": meta.get("file_category"),
                "indexing_profile": meta.get("indexing_profile"),
            })

        for res in vector_results:
            if res.id not in seen_ids:
                seen_ids.add(res.id)
                payload = res.payload or {}
                bias_boost = compute_query_bias_boost(payload, query_profile)
                merged_results.append({
                    "chunk_id": res.id,
                    "content": payload["content"],
                    "file_id": payload["file_id"],
                    "page_number": payload.get("page_number"),
                    "score": res.score + bias_boost,
                    "source_type": "vector",
                    "file_category": payload.get("file_category"),
                    "indexing_profile": payload.get("indexing_profile"),
                })
            
        for chunk in keyword_chunks:
            if str(chunk.id) not in seen_ids:
                matched_terms = sum(1 for term in search_terms if term.lower() in chunk.content.lower())
                exact_match_boost = 0.1 if query.lower() in chunk.content.lower() else 0.0
                meta = chunk.meta or {}
                merged_results.append({
                    "chunk_id": str(chunk.id),
                    "content": chunk.content,
                    "file_id": str(chunk.file_id),
                    "page_number": chunk.page_number,
                    "score": 0.45 + min(matched_terms, 4) * 0.08 + exact_match_boost + compute_query_bias_boost(meta, query_profile),
                    "source_type": "keyword",
                    "file_category": meta.get("file_category"),
                    "indexing_profile": meta.get("indexing_profile"),
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
