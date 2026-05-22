from typing import List
from uuid import UUID
from qdrant_client.http import models
from app.integrations.qdrant_client import qdrant_integration
from app.models.file import DocumentChunk
from loguru import logger

class VectorStoreService:
    async def index_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]):
        points = []
        for i, chunk in enumerate(chunks):
            points.append(models.PointStruct(
                id=str(chunk.id),
                vector=embeddings[i],
                payload={
                    "file_id": str(chunk.file_id),
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "modality": chunk.modality,
                    **chunk.meta
                }
            ))
        
        batch_size = 500
        for i in range(0, len(points), batch_size):
            batch = points[i:i+batch_size]
            qdrant_integration.upsert_chunks(batch)
        logger.info(f"Indexed {len(points)} chunks into Qdrant in {len(range(0, len(points), batch_size))} batches")

    async def search(self, vector: List[float], workspace_id: UUID = None, top_k: int = 10):
        # We can add workspace_id filtering if needed using Qdrant filters
        results = qdrant_integration.search(vector=vector, top_k=top_k)
        return results

vector_store_service = VectorStoreService()
