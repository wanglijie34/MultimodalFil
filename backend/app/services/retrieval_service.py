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
        search_terms = self._extract_search_terms(query)
        query_profile = describe_query_profile(query)
        vector_results = []
        if search_mode in ["hybrid", "local", "global"]:
            query_vector = await embedding_service.embed_text(query)
            vector_results = await vector_store_service.search(query_vector, top_k=max(top_k * 2, 8), file_id=file_id)

        keyword_chunks = await self.keyword_search(db, search_terms, top_k=top_k, file_id=file_id) if search_mode in ["hybrid", "local"] else []
        summary_chunks = await self.summary_search(db, search_terms, top_k=top_k, file_id=file_id) if search_mode in ["global", "hybrid"] else []

        return self.merge_results(
            vector_results=vector_results,
            keyword_chunks=keyword_chunks,
            summary_chunks=summary_chunks,
            search_terms=search_terms,
            query=query,
            query_profile=query_profile,
            top_k=top_k,
        )

    async def vector_search(self, query: str, top_k: int = 8, file_id: UUID = None):
        query_vector = await embedding_service.embed_text(query)
        return await vector_store_service.search(query_vector, top_k=max(top_k * 2, 8), file_id=file_id)

    async def keyword_search(self, db: AsyncSession, search_terms: List[str], top_k: int = 8, file_id: UUID = None):
        if not search_terms:
            return []

        keyword_query = select(DocumentChunk).where(
            or_(*[DocumentChunk.content.ilike(f"%{term}%") for term in search_terms])
        )
        if file_id:
            keyword_query = keyword_query.where(DocumentChunk.file_id == file_id)
        keyword_query = keyword_query.limit(top_k * 4)
        keyword_result = await db.execute(keyword_query)
        return keyword_result.scalars().all()

    async def summary_search(self, db: AsyncSession, search_terms: List[str], top_k: int = 8, file_id: UUID = None):
        if not search_terms:
            return []

        summary_query = select(DocumentChunk).where(
            (DocumentChunk.is_summary == True) &
            or_(*[DocumentChunk.content.ilike(f"%{term}%") for term in search_terms])
        )
        if file_id:
            summary_query = summary_query.where(DocumentChunk.file_id == file_id)
        summary_query = summary_query.limit(max(4, top_k))
        summary_res = await db.execute(summary_query)
        return summary_res.scalars().all()

    def merge_results(
        self,
        *,
        vector_results: List[Any],
        keyword_chunks: List[DocumentChunk],
        summary_chunks: List[DocumentChunk],
        search_terms: List[str],
        query: str,
        query_profile: Dict[str, Any],
        top_k: int = 8,
    ) -> List[Dict[str, Any]]:
        seen_ids = set()
        merged_results = []

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
        top_results = merged_results[:top_k * 2]

        if settings.DASHSCOPE_API_KEY and top_results:
            try:
                logger.info(f"Reranking {len(top_results)} results with qwen3-rerank")
                pass
            except Exception as e:
                logger.error(f"Reranking failed: {e}")

        return merged_results[:top_k]

retrieval_service = RetrievalService()
