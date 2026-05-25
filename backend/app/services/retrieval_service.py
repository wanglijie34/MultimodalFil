import requests
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

    async def expand_parent_context(self, db: AsyncSession, hits: List[Dict[str, Any]], window: int = 1) -> List[Dict[str, Any]]:
        if not hits:
            return []
        
        chunk_ids = [UUID(h["chunk_id"]) for h in hits if h.get("source_type") != "summary"]
        if not chunk_ids:
            return hits
            
        result = await db.execute(select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids)))
        original_chunks = result.scalars().all()
        
        expanded_chunks = set()
        expanded_dicts = []
        
        # Keep original summaries
        for h in hits:
            if h.get("source_type") == "summary":
                expanded_dicts.append(h)
                expanded_chunks.add(str(h["chunk_id"]))
                
        for chunk in original_chunks:
            if str(chunk.id) not in expanded_chunks:
                expanded_chunks.add(str(chunk.id))
                meta = chunk.meta or {}
                expanded_dicts.append({
                    "chunk_id": str(chunk.id),
                    "content": chunk.content,
                    "file_id": str(chunk.file_id),
                    "page_number": chunk.page_number,
                    "score": next((h["score"] for h in hits if h["chunk_id"] == str(chunk.id)), 0),
                    "source_type": "original",
                    "file_category": meta.get("file_category"),
                    "indexing_profile": meta.get("indexing_profile"),
                })
            
            # Fetch adjacent chunks
            if chunk.chunk_index is not None:
                adj_query = select(DocumentChunk).where(
                    (DocumentChunk.file_id == chunk.file_id) & 
                    (DocumentChunk.chunk_index >= chunk.chunk_index - window) &
                    (DocumentChunk.chunk_index <= chunk.chunk_index + window)
                )
                adj_res = await db.execute(adj_query)
                for adj_chunk in adj_res.scalars().all():
                    if str(adj_chunk.id) not in expanded_chunks:
                        expanded_chunks.add(str(adj_chunk.id))
                        meta = adj_chunk.meta or {}
                        expanded_dicts.append({
                            "chunk_id": str(adj_chunk.id),
                            "content": adj_chunk.content,
                            "file_id": str(adj_chunk.file_id),
                            "page_number": adj_chunk.page_number,
                            "score": 0.5, # Lower score for expanded context
                            "source_type": "expanded",
                            "file_category": meta.get("file_category"),
                            "indexing_profile": meta.get("indexing_profile"),
                        })
                        
            # Fetch parent summary
            if chunk.parent_id:
                parent_query = select(DocumentChunk).where(DocumentChunk.id == chunk.parent_id)
                parent_res = await db.execute(parent_query)
                parent_chunk = parent_res.scalar_one_or_none()
                if parent_chunk and str(parent_chunk.id) not in expanded_chunks:
                    expanded_chunks.add(str(parent_chunk.id))
                    meta = parent_chunk.meta or {}
                    expanded_dicts.append({
                        "chunk_id": str(parent_chunk.id),
                        "content": "Parent Summary: " + parent_chunk.content,
                        "file_id": str(parent_chunk.file_id),
                        "page_number": parent_chunk.page_number,
                        "score": 0.6,
                        "source_type": "parent_summary",
                        "file_category": meta.get("file_category"),
                        "indexing_profile": meta.get("indexing_profile"),
                    })
        
        return expanded_dicts

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
                # Use qwen3-rerank or gte-rerank depending on availability
                logger.info(f"Reranking {len(top_results)} results with DashScope reranker")
                
                url = "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank"
                headers = {
                    "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "qwen3-rerank",
                    "input": {
                        "query": query,
                        "documents": [res["content"][:2000] for res in top_results]
                    }
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if "output" in data and "results" in data["output"]:
                        rerank_scores = data["output"]["results"]
                        
                        # Apply scores
                        for item in rerank_scores:
                            idx = item["index"]
                            score = item["relevance_score"]
                            top_results[idx]["score"] = score
                            
                        # Resort based on new score
                        top_results.sort(key=lambda x: x["score"], reverse=True)
                        merged_results = top_results
                else:
                    logger.error(f"DashScope reranker error: {response.text}")
                    
            except Exception as e:
                logger.error(f"Reranking failed: {e}")

        return merged_results[:top_k]

retrieval_service = RetrievalService()
