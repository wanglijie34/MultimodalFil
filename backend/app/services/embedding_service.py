import numpy as np
from typing import List
from app.core.config import settings
from loguru import logger

class EmbeddingService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.vector_size = 768 # Default for Gemini

    async def embed_text(self, text: str) -> List[float]:
        if not text:
            return [0.0] * self.vector_size

        if self.provider == "gemini" and settings.GOOGLE_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                return result["embedding"]
            except Exception as e:
                logger.error(f"Gemini embedding failed: {e}")
        
        elif self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.embeddings.create(
                    input=[text],
                    model="text-embedding-3-small"
                )
                return response.data[0].embedding
            except Exception as e:
                logger.error(f"OpenAI embedding failed: {e}")

        # Fallback/Dev mode: Deterministic "fake" embedding
        logger.warning(f"Using fake embedding for provider {self.provider}")
        return self._fake_embedding(text)

    def _fake_embedding(self, text: str) -> List[float]:
        # Simple hash-based deterministic "embedding" for dev
        seed = sum(ord(c) for c in text) % 10000
        np.random.seed(seed)
        return np.random.uniform(-1, 1, self.vector_size).tolist()

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # For MVP, we'll just loop. Production should use batch API.
        return [await self.embed_text(t) for t in texts]

embedding_service = EmbeddingService()
