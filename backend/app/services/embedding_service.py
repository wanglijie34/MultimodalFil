import numpy as np
import asyncio
from typing import List
from app.core.config import settings
from loguru import logger

class EmbeddingService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.vector_size = 1024 # Recommended for text-embedding-v4

    async def embed_text(self, text: str) -> List[float]:
        if not text:
            return [0.0] * self.vector_size

        if self.provider == "dashscope" or (self.provider == "deepseek" and settings.DASHSCOPE_API_KEY):
            # Using DashScope for embeddings even if provider is deepseek for chat
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(
                    api_key=settings.DASHSCOPE_API_KEY,
                    base_url=settings.DASHSCOPE_BASE_URL
                )
                response = await client.embeddings.create(
                    model="text-embedding-v4",
                    input=[text],
                    dimensions=self.vector_size
                )
                return response.data[0].embedding
            except Exception as e:
                logger.error(f"DashScope embedding failed: {e}")

        if self.provider == "gemini" and settings.GOOGLE_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                # Run sync call in a thread to avoid blocking the event loop
                result = await asyncio.to_thread(
                    genai.embed_content,
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                return result["embedding"]
            except Exception as e:
                logger.error(f"Gemini embedding failed: {e}")
        
        elif self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                response = await client.embeddings.create(
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
        if not texts:
            return []
            
        # Batch size (e.g., 100 chunks per API call to avoid rate limit)
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            if self.provider == "dashscope" or (self.provider == "deepseek" and settings.DASHSCOPE_API_KEY):
                try:
                    from openai import AsyncOpenAI
                    client = AsyncOpenAI(api_key=settings.DASHSCOPE_API_KEY, base_url=settings.DASHSCOPE_BASE_URL)
                    response = await client.embeddings.create(model="text-embedding-v4", input=batch_texts, dimensions=self.vector_size)
                    embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(embeddings)
                    await asyncio.sleep(0.5)
                    continue
                except Exception as e:
                    logger.error(f"DashScope batch embedding failed: {e}")
                    
            elif self.provider == "gemini" and settings.GOOGLE_API_KEY:
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=settings.GOOGLE_API_KEY)
                    result = await asyncio.to_thread(
                        genai.embed_content,
                        model="models/text-embedding-004",
                        content=batch_texts,
                        task_type="retrieval_document"
                    )
                    # result['embedding'] will be a list of lists if content is a list of strings
                    all_embeddings.extend(result["embedding"])
                    await asyncio.sleep(1.5)
                    continue
                except Exception as e:
                    logger.error(f"Gemini batch embedding failed: {e}")
                    
            elif self.provider == "openai" and settings.OPENAI_API_KEY:
                try:
                    from openai import AsyncOpenAI
                    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                    response = await client.embeddings.create(input=batch_texts, model="text-embedding-3-small")
                    embeddings = [item.embedding for item in response.data]
                    all_embeddings.extend(embeddings)
                    await asyncio.sleep(0.5)
                    continue
                except Exception as e:
                    logger.error(f"OpenAI batch embedding failed: {e}")

            # Fallback
            logger.warning(f"Using fake embedding for batch fallback")
            all_embeddings.extend([self._fake_embedding(t) for t in batch_texts])
            
        return all_embeddings

embedding_service = EmbeddingService()
