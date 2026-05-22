import asyncio
from typing import List, Optional, Dict
from app.core.config import settings
from loguru import logger

class LLMService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER

    async def chat(self, messages: List[Dict[str, str]], stream: bool = False) -> str:
        if self.provider == "gemini" and settings.GOOGLE_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                # Convert messages to Gemini format
                # simplified for MVP
                prompt = messages[-1]["content"]
                response = await asyncio.to_thread(model.generate_content, prompt)
                return response.text
            except Exception as e:
                logger.error(f"Gemini chat failed: {e}")
        
        elif self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"OpenAI chat failed: {e}")

        elif self.provider == "deepseek" and settings.DEEPSEEK_API_KEY:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(
                    api_key=settings.DEEPSEEK_API_KEY,
                    base_url=settings.DEEPSEEK_BASE_URL
                )
                response = await client.chat.completions.create(
                    model="deepseek-v4-flash", 
                    messages=messages
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"DeepSeek chat failed: {e}")

        # Fallback
        return "This is a simulated AI response. Please configure AI API keys for real answers."

llm_service = LLMService()
