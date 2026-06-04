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
            
        # DashScope restricts batch size to 10 max
        batch_size = 100
        if self.provider == "dashscope" or (self.provider == "deepseek" and settings.DASHSCOPE_API_KEY):
            batch_size = 10
            
        batches = [texts[i:i+batch_size] for i in range(0, len(texts), batch_size)]
        total_batches = len(batches)
        
        logger.info(f"Embedding {len(texts)} texts in {total_batches} batches using {self.provider}")
        
        all_embeddings = [None] * total_batches
        sem = asyncio.Semaphore(5)  # Limit concurrent requests
        
        async def process_batch(index: int, batch_texts: List[str]):
            async with sem:
                if index % 10 == 0 or index == total_batches - 1:
                    logger.info(f"Processing embedding batch {index + 1}/{total_batches}...")
                
                if self.provider == "dashscope" or (self.provider == "deepseek" and settings.DASHSCOPE_API_KEY):
                    try:
                        from openai import AsyncOpenAI
                        client = AsyncOpenAI(api_key=settings.DASHSCOPE_API_KEY, base_url=settings.DASHSCOPE_BASE_URL)
                        response = await client.embeddings.create(model="text-embedding-v4", input=batch_texts, dimensions=self.vector_size)
                        all_embeddings[index] = [item.embedding for item in response.data]
                        return
                    except Exception as e:
                        logger.error(f"DashScope batch embedding failed for batch {index}: {e}")
                        
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
                        all_embeddings[index] = result["embedding"]
                        await asyncio.sleep(1.0)
                        return
                    except Exception as e:
                        logger.error(f"Gemini batch embedding failed for batch {index}: {e}")
                        
                elif self.provider == "openai" and settings.OPENAI_API_KEY:
                    try:
                        from openai import AsyncOpenAI
                        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                        response = await client.embeddings.create(input=batch_texts, model="text-embedding-3-small")
                        all_embeddings[index] = [item.embedding for item in response.data]
                        return
                    except Exception as e:
                        logger.error(f"OpenAI batch embedding failed for batch {index}: {e}")

                # Fallback
                if index % 10 == 0:
                    logger.warning(f"Using fake embedding for batch fallback (batch {index+1})")
                all_embeddings[index] = await asyncio.to_thread(
                    lambda: [self._fake_embedding(t) for t in batch_texts]
                )

        # Run all batches concurrently within semaphore limits
        tasks = [process_batch(i, batch) for i, batch in enumerate(batches)]
        await asyncio.gather(*tasks)
        
        # Flatten the list of lists
        return [emb for batch_res in all_embeddings for emb in batch_res]

embedding_service = EmbeddingService()
