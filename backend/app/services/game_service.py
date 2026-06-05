# -*- coding: utf-8 -*-
import json
from loguru import logger
from app.services.llm_service import llm_service
from app.models.game_models import GameState, SimulationResult

class GameService:
    def get_minister_persona(self, minister: str) -> str:
        personas = {
            "wei_zhongxian": "你是魏忠贤，明朝末年权倾朝野的司礼监秉笔太监。你贪婪、跋扈，但手段毒辣，擅长搜刮民脂民膏和打压东林党。你给皇上的建议总是倾向于镇压、收重税、维护你自己的权力。",
            "yuan_chonghuan": "你是袁崇焕，大明蓟辽督师。你性格刚烈、自负，主张“五年平辽”。你的建议总是围绕增加辽饷、加强军备、警惕后金，有时会显得不顾朝廷财政困难。",
            "xu_guangqi": "你是徐光启，内阁大学士，热衷于西学与农业科技。你忧国忧民，主张引进西洋火器、推广新作物（如番薯）以缓解饥荒。你的建议总是理性、长远，但往往见效慢。",
            "hong_chengchou": "你是洪承畴，陕西三边总督。你主张用铁腕手段残酷镇压农民起义（“剿杀”），认为流寇不可招降。你急需军粮和兵力。"
        }
        return personas.get(minister, "你是大明王朝的臣子，基于你对明末局势的了解，向皇帝提出建议。")

    async def advise(self, state: GameState, minister: str) -> str:
        persona = self.get_minister_persona(minister)
        prompt = f"""
{persona}

当前大明天下局势如下：
年份：{state.year} (崇祯{state.year - 1627}年)
国库：{state.treasury}/100 (低代表亏空)
稳定：{state.stability}/100 (低代表党争与动乱)
饥荒：{state.famine}/100 (高代表灾情严重)
外患：{state.threat}/100 (高代表后金威胁大)
近期事件：{", ".join(state.events)}

陛下（玩家）正在召见你。请用文言文结合白话的风格，向皇帝陈述你对当前局势的看法，并给出一个具体的建议。字数控制在150字左右，体现出你的立场。
"""
        response = await llm_service.chat([{"role": "user", "content": prompt}])
        return response

    async def simulate_edict(self, state: GameState, edict: str) -> SimulationResult:
        prompt = f"""
你是《历史模拟器：崇祯》的底层世界推演引擎。这是一个只算代价、不分对错的残酷系统。
当前大明局势如下：
年份：{state.year} (崇祯{state.year - 1627}年)
国库：{state.treasury}/100
稳定：{state.stability}/100
饥荒：{state.famine}/100
外患：{state.threat}/100
近期事件：{", ".join(state.events)}

皇帝（玩家）刚刚颁布了如下诏书/决策：
“{edict}”

请推演这道诏书颁布后的蝴蝶效应。以JSON格式返回，包含以下字段：
1. `treasury_delta`: 整数，对国库的影响（例如 -10 或 +5）
2. `stability_delta`: 整数，对稳定的影响
3. `famine_delta`: 整数，对饥荒的影响（负数表示减轻饥荒）
4. `threat_delta`: 整数，对外患的影响
5. `narrative`: 字符串，约100字，生动描述诏书执行后的实际情况（可能有意外后果或执行被贪污阻挠等明末特色反应）。
6. `impact_summary`: 字符串数组，列出1-3条具体影响（例如 ["东林党不满，朝堂争吵加剧", "辽饷勉强凑齐，但百姓怨声载道"]）
7. `new_events`: 字符串数组，由于时间推移或决策导致的1-2个新事件（替换掉之前的事件）。

返回纯JSON：
"""
        response = await llm_service.chat([{"role": "user", "content": prompt}], json_mode=True)
        
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            data = json.loads(response.strip())
            
            # Bound the new stats between 0 and 100
            new_treasury = max(0, min(100, state.treasury + int(data.get("treasury_delta", 0))))
            new_stability = max(0, min(100, state.stability + int(data.get("stability_delta", 0))))
            new_famine = max(0, min(100, state.famine + int(data.get("famine_delta", 0))))
            new_threat = max(0, min(100, state.threat + int(data.get("threat_delta", 0))))
            
            new_state = GameState(
                year=state.year + 1, # Advancing year
                turn=state.turn + 1,
                treasury=new_treasury,
                stability=new_stability,
                famine=new_famine,
                threat=new_threat,
                events=data.get("new_events", [])
            )
            
            return SimulationResult(
                new_state=new_state,
                narrative=data.get("narrative", "天下局势混沌不清，此事石沉大海..."),
                impact_summary=data.get("impact_summary", [])
            )
        except Exception as e:
            logger.error(f"Failed to parse LLM simulation: {e}\nResponse: {response}")
            # Fallback
            new_state = state.model_copy(update={"year": state.year + 1, "turn": state.turn + 1})
            return SimulationResult(
                new_state=new_state,
                narrative="天灾人祸交织，圣意难达基层，百官敷衍了事，局势未见明显改观。",
                impact_summary=["政令被地方官吏阻挠"]
            )

game_service = GameService()
