import json
from typing import List, Dict, Any
from app.services.llm_service import llm_service
from app.models.game_models import ChatRequest

class ChatEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

    async def chat_with_minister(self, request: ChatRequest) -> str:
        world = self.state_manager.world_state
        ministers_data = self.state_manager.ministers
        
        # Find minister
        minister = next((m for m in ministers_data if m["minister_id"] == request.minister_id), None)
        if not minister:
            return "臣不在朝堂之中，请陛下明鉴。"

        # Build prompt context
        state_summary = (
            f"大明当前局势 (崇祯{world.get('date', {}).get('year', 1627)}年{world.get('date', {}).get('month', 10)}月):\n"
            f"- 国库: {world.get('treasury', {}).get('silver', 0)}两\n"
            f"- 威望: {world.get('emperor', {}).get('prestige', 50)}, 民心: {world.get('national_metrics', {}).get('public_support', 50)}\n"
            f"- 灾害压力: {world.get('national_metrics', {}).get('disaster_pressure', 0)}\n"
            f"- 边患压力: {world.get('national_metrics', {}).get('manchu_pressure', 0)}\n"
        )

        system_prompt = (
            f"你现在扮演明朝崇祯时期的朝臣。皇帝在御书房/暖阁单独召见你进行密谈。\n"
            f"你的身份信息：\n"
            f"- 姓名: {minister.get('name', '未知')}\n"
            f"- 官职: {minister.get('role', '未知')}\n"
            f"- 派系: {minister.get('faction', '未知')}\n"
            f"- 性格与偏好: {', '.join(minister.get('personality', []))}\n"
            f"- 说话风格: {minister.get('speaking_style', '文言与白话结合，符合古代大臣身份')}\n\n"
            f"{state_summary}\n"
            f"请直接给出你的回话。切勿输出格式标签、多余的动作描写（除非是非常简短的括号动作，如（伏地叩首））。\n"
            f"语气要绝对符合你的身份和性格。如果皇帝斥责，要表现出惶恐或辩解；如果皇帝询问，要给出具体的建议或太极推手。"
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history
        for msg in request.history:
            # Map roles if necessary, assuming frontend sends 'user' (emperor) and 'assistant' (minister)
            messages.append({"role": msg.role, "content": msg.content})
            
        # Add current user message
        messages.append({"role": "user", "content": request.user_message})

        try:
            response_text = await llm_service.chat(messages, json_mode=False)
            return response_text
        except Exception as e:
            print(f"LLM chat error for minister {request.minister_id}: {e}")
            return "臣连日风寒，未能深思，请陛下恕罪。 [系统提示: LLM生成异常]"
