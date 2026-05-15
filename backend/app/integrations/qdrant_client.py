from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
from loguru import logger

class QdrantIntegration:
    def __init__(self):
        self.client = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
            api_key=settings.QDRANT_API_KEY
        )
        self.collection_name = "document_chunks"
        # In a real app, vector size depends on the model. 
        # OpenAI text-embedding-3-small is 1536. 
        # Gemini text-embedding-004 is 768.
        # We'll use 768 as default for Gemini.
        self.vector_size = 768 
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                logger.info(f"Creating Qdrant collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=self.vector_size,
                        distance=models.Distance.COSINE
                    )
                )
        except Exception as e:
            logger.error(f"Failed to ensure Qdrant collection: {e}")

    def upsert_chunks(self, points):
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    def search(self, vector, top_k=10, filters=None):
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=top_k,
            query_filter=filters
        )

qdrant_integration = QdrantIntegration()
