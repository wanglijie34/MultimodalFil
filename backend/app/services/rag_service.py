from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.retrieval_service import retrieval_service
from app.services.graph_service import graph_service
from app.services.llm_service import llm_service
from loguru import logger

class RAGService:
    async def answer_question(
        self, 
        db: AsyncSession, 
        query: str, 
        workspace_id: UUID,
        top_k: int = 5
    ) -> Dict[str, Any]:
        # 1. Hierarchical Retrieval (RAPTOR-inspired)
        # Search summaries first to get global context
        summary_results = await retrieval_service.search(db, query, workspace_id, top_k=3)
        
        # 2. Detailed Retrieval
        relevant_chunks = await retrieval_service.search(db, query, workspace_id, top_k=top_k)
        
        # 3. Graph Context Expansion (LightRAG-inspired)
        chunk_ids = [c["chunk_id"] for c in relevant_chunks]
        graph_context = await graph_service.get_entity_context(chunk_ids)
        
        # 4. Build Context
        context_parts = []
        if summary_results:
            context_parts.append("Global Summary Context:")
            for s in summary_results:
                context_parts.append(s["content"])
        
        context_parts.append("\nDetailed Evidence:")
        for i, chunk in enumerate(relevant_chunks):
            context_parts.append(f"Source [{i+1}] (File: {chunk['file_id']}, Page: {chunk['page_number']}):\n{chunk['content']}")
        
        if graph_context:
            context_parts.append(f"\n{graph_context}")
            
        context_str = "\n\n".join(context_parts)
        
        # 5. Prompt LLM
        system_prompt = (
            "You are an AI assistant for InsightGraph Agent. "
            "Answer the user's question based ONLY on the provided context. "
            "If you don't know the answer, say you don't know. "
            "Always cite your sources using [Source X] format."
        )
        
        user_prompt = f"Context:\n{context_str}\n\nQuestion: {query}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        answer = await llm_service.chat(messages)
        
        return {
            "answer": answer,
            "sources": relevant_chunks
        }

rag_service = RAGService()
