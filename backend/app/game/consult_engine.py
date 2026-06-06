import json
from typing import List, Dict, Any
from app.services.llm_service import llm_service
from app.models.game_models import ConsultationResult

class ConsultEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

    async def generate_consultations(self, minister_ids: List[str]) -> List[Dict[str, Any]]:
        world = self.state_manager.world_state
        ministers_data = self.state_manager.ministers
        
        # Build prompt context
        state_summary = (
            f"大明当前局势 (崇祯{world.get('date', {}).get('year', 1627)}年{world.get('date', {}).get('month', 10)}月):\n"
            f"- 国库: {world.get('treasury', {}).get('silver', 0)}两\n"
            f"- 威望: {world.get('emperor', {}).get('prestige', 50)}, 民心: {world.get('national_metrics', {}).get('public_support', 50)}\n"
            f"- 灾害压力: {world.get('national_metrics', {}).get('disaster_pressure', 0)}\n"
            f"- 边患压力: {world.get('national_metrics', {}).get('manchu_pressure', 0)}\n"
            f"- 官僚效率: {world.get('national_metrics', {}).get('bureaucratic_efficiency', 50)}\n"
            f"- 党争激烈度: {world.get('national_metrics', {}).get('factional_conflict', 50)}\n"
        )

        results = []
        for mid in minister_ids:
            # Find minister
            minister = next((m for m in ministers_data if m["minister_id"] == mid), None)
            if not minister:
                continue

            system_prompt = (
                "你现在扮演明朝崇祯时期的朝臣。皇帝召见你进行廷议。请根据你的身份、派系立场以及当前的大明局势，"
                "给皇帝提出你的策略建议，并指出潜在风险。\n"
                "你必须严格返回合法的 JSON 对象，不要输出 markdown code block 和其他废话。\n\n"
                "需要的 JSON 结构如下：\n"
                "{\n"
                '  "stance": "立场简述，如 主战/主和/赈灾优先/严刑峻法",\n'
                '  "recommended_policies": ["建议的政策类型1", "建议的政策类型2"],\n'
                '  "warning_tags": ["风险警告1", "风险警告2"],\n'
                '  "content": "你对皇帝的进言原话，语气要符合你的身份，文言与白话结合，指出问题并给出主张"\n'
                "}"
            )
            
            user_prompt = (
                f"{state_summary}\n"
                f"你的身份信息：\n"
                f"- 姓名: {minister.get('name', '未知')}\n"
                f"- 官职: {minister.get('role', '未知')}\n"
                f"- 派系: {minister.get('faction', '未知')}\n"
                f"- 性格与偏好: {', '.join(minister.get('personality', []))}\n\n"
                "皇帝此时向你问策，请开始进言："
            )

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            try:
                response_text = await llm_service.chat(messages, json_mode=True)
                # Cleanup if model still includes markdown
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                    
                data = json.loads(response_text)
                results.append({
                    "minister_id": mid,
                    "minister_name": minister["name"],
                    "stance": data.get("stance", "静观其变"),
                    "recommended_policies": data.get("recommended_policies", []),
                    "warning_tags": data.get("warning_tags", []),
                    "content": data.get("content", "臣愚钝，请陛下乾纲独断。")
                })
            except Exception as e:
                print(f"LLM parsing error for minister {mid}: {e}")
                results.append({
                    "minister_id": mid,
                    "minister_name": minister["name"],
                    "stance": "保守",
                    "recommended_policies": [],
                    "warning_tags": ["系统故障", "解析异常"],
                    "content": "臣连日风寒，未能深思，请陛下恕罪。 [系统提示: LLM生成异常]"
                })

        return results
