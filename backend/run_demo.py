import asyncio
import json
import sys
import os
import io

# Force UTF-8 encoding for stdout to prevent Windows console garbling
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add backend directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.game.state import GameStateManager
from app.game.policy_parser import PolicyParser
from app.game.rule_engine import RuleEngine
from app.game.monthly_update import MonthlyUpdateEngine
from app.game.event_engine import EventEngine
from app.game.narrative_generator import NarrativeGenerator

async def main():
    auto_mode = "--auto" in sys.argv
    predefined_edicts = [
        "朕命户部拨银二十万两赈济陕西，并令湖广调粮入陕三万石。",
        "着辽东巡抚速加紧练兵，拨内帑白银十五万两充作军饷。",
        "各地灾情严重，严查贪墨！京师及河南两地严令反腐，若有贪污赈灾款项者，斩立决！"
    ]

    # 1. Initialize state
    state_manager = GameStateManager()
    state_manager.load_initial_state()
    
    # 2. Initialize engines
    policy_parser = PolicyParser()
    rule_engine = RuleEngine(state_manager)
    monthly_update_engine = MonthlyUpdateEngine(state_manager)
    event_engine = EventEngine(state_manager)
    narrative_generator = NarrativeGenerator()
    
    print("=== 历史模拟器：崇祯 MVP 后端文字 Demo ===")
    print(f"初始时间: {state_manager.world_state['date']['year']}年 {state_manager.world_state['date']['month']}月")
    print(f"初始国库: {state_manager.world_state['treasury']['silver']} 两")
    print("==========================================\n")
    
    turns = 3
    for i in range(turns):
        print(f"\n--- 第 {i+1} 回合开始 ({state_manager.world_state['date']['year']}年 {state_manager.world_state['date']['month']}月) ---")
        
        # 玩家输入诏书
        if auto_mode:
            edict_text = predefined_edicts[i]
            print(f"陛下，请输入本月诏书内容: {edict_text}")
        else:
            edict_text = input("\n陛下，请输入本月诏书内容: ")
            if not edict_text.strip():
                edict_text = predefined_edicts[i]
                print(f"默认诏书: {edict_text}")
            
        # 3. Parse Edict
        print("\n[系统] 正在呼叫大模型解析诏书...")
        policies = await policy_parser.parse_edict(edict_text)
        print(f"[系统] 解析出的结构化政策: {json.dumps(policies, ensure_ascii=False, indent=2)}")
        
        # 4. Rule Engine applies policies
        print("\n[系统] 规则引擎正在计算政策的数值影响...")
        calc_results = rule_engine.apply_policies(policies)
        
        # 5. Monthly Update
        print("[系统] 正在进行月度自然流转 (消耗国库，灾情蔓延)...")
        monthly_updates = monthly_update_engine.process_month()
        
        # 6. Check Events
        print("[系统] 正在评估是否触发动态事件...")
        triggered_events = event_engine.evaluate_events()
        if triggered_events:
            print(f"[系统] !!! 触发历史/动态事件: {[e['title'] for e in triggered_events]} !!!")
            
        # 7. Generate Narrative
        print("\n[系统] 正在呼叫大模型根据数值变化生成文言文奏报...")
        narrative = await narrative_generator.generate_narrative(
            edict_text, policies, calc_results, triggered_events, state_manager.world_state
        )
        
        print("\n================ 本月朝局奏报 ================")
        print(f"【百官奏闻】: {narrative.get('court_report', '')}")
        print(f"【民间反响】: {narrative.get('public_reaction', '')}")
        print(f"【派系暗潮】: {narrative.get('faction_reaction', '')}")
        print("【核心影响】:")
        for effect in narrative.get('summary_effects', []):
            print(f" - {effect}")
        print("==============================================")
            
        print(f"\n[回合结算] 国库白银: {state_manager.world_state['treasury']['silver']} 两 | 皇帝威望: {state_manager.world_state['emperor']['prestige']} | 党争程度: {state_manager.world_state['national_metrics']['factional_conflict']}")
        
if __name__ == "__main__":
    asyncio.run(main())
