import asyncio
import os
import sys

# Add backend dir to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.game.state import GameStateManager
from app.game.policy_parser import PolicyParser
from app.game.rule_engine import RuleEngine
from app.game.monthly_update import MonthlyUpdateEngine
from app.game.event_engine import EventEngine
from app.game.narrative_generator import NarrativeGenerator

async def main():
    print("="*60)
    print("      《历史模拟器：崇祯》 - MVP 文字后点演示")
    print("="*60)
    
    state_manager = GameStateManager()
    state_manager.load_initial_state()
    
    parser = PolicyParser()
    rule_engine = RuleEngine(state_manager)
    updater = MonthlyUpdateEngine(state_manager)
    event_engine = EventEngine(state_manager)
    narrator = NarrativeGenerator()
    
    for _ in range(3):
        world = state_manager.world_state
        print(f"\n【第 {world['turn']} 回合】 {world['date']['year']}年 {world['date']['month']}月")
        print(f"皇帝：{world['emperor']['name']} | 威望：{world['emperor']['prestige']} | 压力：{world['emperor']['stress']}")
        print(f"国库：{world['treasury']['silver']}两 | 收入：{world['treasury']['monthly_income']}两 | 支出：{world['treasury']['monthly_expense']}两")
        print(f"全国指标 => 民心:{world['national_metrics']['public_support']:.1f} | 叛乱:{world['national_metrics']['rebel_pressure']:.1f} | 灾荒:{world['national_metrics']['disaster_pressure']:.1f} | 辽东压力:{world['national_metrics']['manchu_pressure']:.1f} | 党争:{world['national_metrics']['factional_conflict']:.1f}")
        print("-"*60)
        
        edict = input("陛下，请下诏：\n> ")
        if not edict.strip():
            print("皇帝默然不语，退朝。")
            edict = "无为而治"
            
        print("\n[系统] 正在解析诏书...")
        policies = await parser.parse_edict(edict)
        print(f"解析到 {len(policies)} 项政策: {policies}")
        
        print("\n[系统] 正在计算政策执行结果...")
        calc_results = rule_engine.apply_policies(policies)
        for r in calc_results:
            print(f" - {r}")
            
        print("\n[系统] 正在进行月度自然演进...")
        month_updates = updater.process_month()
        
        print("\n[系统] 正在判定动态历史事件...")
        triggered_events = event_engine.evaluate_events()
        for e in triggered_events:
            print(f"   !!! 突发事件: 【{e['title']}】 {e['message']}")
            
        print("\n[系统] 正在生成本月朝堂战报与反馈叙事...")
        narrative = await narrator.generate_narrative(edict, policies, calc_results, triggered_events, state_manager.world_state)
        
        print("\n" + "="*60)
        print("                 本 月 邸 报")
        print("="*60)
        print(f"【朝堂奏报】: {narrative.get('court_report', '')}")
        print(f"【民间反响】: {narrative.get('public_reaction', '')}")
        print(f"【派系动静】: {narrative.get('faction_reaction', '')}")
        print("【核心影响】:")
        for effect in narrative.get('summary_effects', []):
            print(f"  * {effect}")
        print("="*60)
        
        input("\n按回车进入下一月...")

if __name__ == "__main__":
    asyncio.run(main())
