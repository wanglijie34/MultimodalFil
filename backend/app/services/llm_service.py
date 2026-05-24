from typing import Any, Dict, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.core.config import settings
from loguru import logger


class LLMService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self._models: Dict[str, Any] = {}

    def _to_langchain_messages(self, messages: List[Dict[str, str]]) -> List[Any]:
        lc_messages: List[Any] = []
        for message in messages:
            role = (message.get("role") or "user").lower()
            content = message.get("content", "")
            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))
        return lc_messages

    def _get_model(self) -> Any:
        provider = self.provider
        if provider in self._models:
            return self._models[provider]

        if provider == "gemini" and settings.GOOGLE_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI

            model = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.2,
            )
        elif provider == "openai" and settings.OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI

            model = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.OPENAI_API_KEY,
                temperature=0.2,
            )
        elif provider == "deepseek" and settings.DEEPSEEK_API_KEY:
            from langchain_openai import ChatOpenAI

            model = ChatOpenAI(
                model="deepseek-chat",
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL,
                temperature=0.2,
            )
        else:
            model = None

        self._models[provider] = model
        return model

    def _stringify_content(self, content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: List[str] = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")
                    if text:
                        parts.append(str(text))
                elif item:
                    parts.append(str(item))
            return "\n".join(parts)
        return str(content or "")

    async def chat(self, messages: List[Dict[str, str]], stream: bool = False) -> str:
        try:
            model = self._get_model()
        except Exception as e:
            logger.error(f"Failed to initialize LangChain model for provider {self.provider}: {e}")
            model = None

        if model:
            try:
                response = await model.ainvoke(self._to_langchain_messages(messages))
                return self._stringify_content(getattr(response, "content", ""))
            except Exception as e:
                logger.error(f"{self.provider} LangChain chat failed: {e}")

        # Fallback
        return "This is a simulated AI response. Please configure AI API keys for real answers."

llm_service = LLMService()
