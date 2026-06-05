import json
from app.services.llm_service import llm_service

class NarrativeGenerator:
    async def generate_narrative(self, edict_text: str, policies: list, calc_results: list, triggered_events: list, world_state: dict) -> dict:
        prompt = f"""
你是一个《历史模拟器：崇祯》的叙事生成引擎。请根据玩家的诏书、执行结果和触发的事件，生成一段充满明末历史感（半文言文）的回合战报反馈。

玩家诏书: "{edict_text}"
解析出的政策数量: {len(policies)}
计算结果日志: {json.dumps(calc_results, ensure_ascii=False)}
本月爆发事件: {json.dumps([e['title'] for e in triggered_events], ensure_ascii=False)}
当前核心国力: 
国库: {world_state["treasury"]["silver"]} 两
皇帝威望: {world_state["emperor"]["prestige"]}
党争程度: {world_state["national_metrics"]["factional_conflict"]}

请返回纯JSON对象，包含以下字段：
1. "court_report": 字符串，朝堂奏报（百官对诏书执行情况的汇报与推诿，体现执行损耗）。
2. "public_reaction": 字符串，民间反馈（百姓对政策或当前灾情/赋税的反应）。
3. "faction_reaction": 字符串，派系反应（涉及东林党、阉党、边将等的暗中活动或不满）。
4. "summary_effects": 字符串数组，用简明的话列出3-4条最核心的数值变化结果（如 "国库支出二十万两"）。

切记：输出不带任何Markdown包裹（无```json），必须是一个合法的JSON。
"""
        response = await llm_service.chat([{"role": "user", "content": prompt}], json_mode=True)
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            return json.loads(response.strip())
        except Exception as e:
            print(f"Error generating narrative: {e}")
            return {
                "court_report": "天下纷乱，朝野震动，政令难达。",
                "public_reaction": "百姓流离失所，怨声载道。",
                "faction_reaction": "党争不休，互相攻讦。",
                "summary_effects": ["局势进一步恶化"]
            }
