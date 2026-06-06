import os
import json
import asyncio
import aiohttp
from typing import List, Dict, Any

# ==========================================
# 1. Historical Data Definitions
# ==========================================

# 现有的基础官员（保留他们的核心数值设定，交给 API 补充 hometown 和 biography）
existing_ministers = [
    # (The existing list will be loaded from the current JSON to preserve their manual stats)
]

# 需要补充的朝堂高级实缺官员（补全 UI 上的空缺）
high_tier_historical = [
    {"name": "周延儒", "role": "内阁大臣", "department": "内阁", "faction": "revenue_bureaucrats", "personality": ["圆滑", "贪权", "善辩"]},
    {"name": "薛国观", "role": "内阁大臣", "department": "内阁", "faction": "revenue_bureaucrats", "personality": ["刻薄", "急功近利", "敛财"]},
    {"name": "郑三俊", "role": "吏部尚书", "department": "吏部", "faction": "donglin", "personality": ["清正", "迂腐", "重法理"]},
    {"name": "徐光启", "role": "礼部尚书", "department": "礼部", "faction": "donglin", "personality": ["务实", "精通西学", "忧国"]},
    {"name": "王在晋", "role": "兵部尚书", "department": "兵部", "faction": "revenue_bureaucrats", "personality": ["保守", "稳健", "文臣带兵"]},
    {"name": "乔允升", "role": "刑部尚书", "department": "刑部", "faction": "donglin", "personality": ["宽厚", "清廉", "恤刑"]},
    {"name": "南居益", "role": "工部尚书", "department": "工部", "faction": "donglin", "personality": ["实干", "忠直", "擅造船炮"]},
    
    # 科道言官
    {"name": "曹于汴", "role": "左都御史", "department": "都察院左右都御史", "faction": "donglin", "personality": ["刚直", "嫉恶如仇"]},
    {"name": "房可壮", "role": "右都御史", "department": "都察院左右都御史", "faction": "donglin", "personality": ["清流", "死谏"]},
    {"name": "王应熊", "role": "通政使", "department": "通政司使", "faction": "revenue_bureaucrats", "personality": ["圆融", "附和"]},
    {"name": "吴麟征", "role": "吏科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["忠义", "直言"]},
    {"name": "刘宗周", "role": "户科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["大儒", "偏执", "高道德"]},
    {"name": "倪元璐", "role": "礼科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["才子", "忠烈", "尚气节"]},
    {"name": "左光斗", "role": "兵科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["铁骨", "抗阉"]},
    {"name": "黄尊素", "role": "刑科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["智囊", "沉稳"]},
    {"name": "魏大中", "role": "工科给事中", "department": "六科给事中", "faction": "donglin", "personality": ["激烈", "不畏死"]},
    
    # 十三道御史 (13个)
    {"name": "杨涟", "role": "浙江道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["极刚", "领袖气场"]},
    {"name": "毛羽健", "role": "江西道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["锐利", "谏言"]},
    {"name": "侯恂", "role": "福建道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["识才", "结党"]},
    {"name": "游士任", "role": "四川道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["强硬", "擅弹劾"]},
    {"name": "李应升", "role": "陕西道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["不畏死", "忠义"]},
    {"name": "张弘道", "role": "云南道御史", "department": "十三道监察御史", "faction": "revenue_bureaucrats", "personality": ["圆滑", "观望"]},
    {"name": "史记枢", "role": "河南道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["刚直", "廉洁"]},
    {"name": "周宗建", "role": "广西道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["敢言", "殉难"]},
    {"name": "李邦华", "role": "广东道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["精干", "知兵"]},
    {"name": "刘之纶", "role": "山西道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["慷慨", "谈兵"]},
    {"name": "许誉卿", "role": "山东道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["固执", "清流"]},
    {"name": "熊明遇", "role": "湖广道御史", "department": "十三道监察御史", "faction": "revenue_bureaucrats", "personality": ["圆融", "附和"]},
    {"name": "姜曰广", "role": "贵州道御史", "department": "十三道监察御史", "faction": "donglin", "personality": ["名臣", "守正"]},
    
    # 封疆大吏
    {"name": "陈奇瑜", "role": "陕西督师", "department": "督师", "faction": "revenue_bureaucrats", "personality": ["轻敌", "有才无命"]},
    {"name": "卢象升", "role": "宣大总督", "department": "总督", "faction": "donglin", "personality": ["忠烈", "武举出身", "亲陷阵"]},
    {"name": "郑崇俭", "role": "陕西巡抚", "department": "巡抚", "faction": "revenue_bureaucrats", "personality": ["平庸", "随大流"]},
    {"name": "满桂", "role": "大同总兵", "department": "总兵", "faction": "frontier_army", "personality": ["粗犷", "死战", "蒙古裔"]},
    {"name": "赵率教", "role": "山海关总兵", "department": "总兵", "faction": "frontier_army", "personality": ["骁勇", "轻进"]},
    {"name": "祖大寿", "role": "辽东总兵", "department": "总兵", "faction": "frontier_army", "personality": ["军阀", "观望", "重家族"]},
    {"name": "曹文诏", "role": "山西总兵", "department": "总兵", "faction": "frontier_army", "personality": ["猛将", "屠夫", "嗜杀"]},
    {"name": "贺人龙", "role": "陕西总兵", "department": "总兵", "faction": "frontier_army", "personality": ["畏战", "骄横", "称贺疯子"]},
    {"name": "尤世威", "role": "延绥总兵", "department": "总兵", "faction": "frontier_army", "personality": ["骁将", "忠勇", "善防守"]},
    
    # 厂卫
    {"name": "骆养性", "role": "锦衣卫指挥使", "department": "锦衣卫", "faction": "eunuch", "personality": ["圆滑", "自保", "敛财"]},
    {"name": "庞天寿", "role": "司礼监秉笔", "department": "司礼监", "faction": "eunuch", "personality": ["西学太监", "忠心"]},
]

# 需要补充的中低品阶官员（全部进入 reserve 候补名单，等待玩家发掘）
mid_low_tier_historical = [
    {"name": "海瑞", "role": "在野", "faction": "donglin", "personality": ["极清廉", "偏执", "认死理"]}, # Although strictly Jiajing/Wanli, can be fun to have "Hai Rui type" or just use him as a legendary spawn. Let's use Ming late figures:
    {"name": "陈子龙", "role": "在野", "faction": "donglin", "personality": ["才华横溢", "复社领袖", "经济之学"]},
    {"name": "夏完淳", "role": "在野", "faction": "donglin", "personality": ["少年天才", "忠烈", "激昂"]},
    {"name": "张岱", "role": "在野", "faction": "donglin", "personality": ["名士", "避世", "奢华"]},
    {"name": "归有光", "role": "在野", "faction": "donglin", "personality": ["文学大家", "仕途不顺"]},
    {"name": "瞿式耜", "role": "在野", "faction": "donglin", "personality": ["坚韧", "忠贞", "善守"]},
    {"name": "沐天波", "role": "在野", "faction": "frontier_army", "personality": ["世镇云南", "忠直", "武勇"]},
    {"name": "郑芝龙", "role": "在野", "faction": "frontier_army", "personality": ["海盗出身", "极度投机", "巨富"]},
    {"name": "李定国", "role": "在野", "faction": "frontier_army", "personality": ["战神", "忠义双全", "流寇出身"]},
    {"name": "宋应星", "role": "在野", "faction": "revenue_bureaucrats", "personality": ["奇工巧匠", "务实", "科学探索"]},
    {"name": "方以智", "role": "在野", "faction": "donglin", "personality": ["百科全书", "大儒", "博学"]},
]

# ==========================================
# 2. DeepSeek API Integration
# ==========================================

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

async def generate_bio(session, minister):
    if not DEEPSEEK_API_KEY:
        print("WARNING: DEEPSEEK_API_KEY not found. Using placeholder.")
        minister["hometown"] = "未知"
        minister["biography"] = f"{minister['name']}，大明官员。性格{','.join(minister.get('personality', []))}。"
        return minister

    prompt = f"""
你是一个精通明朝晚期历史的史学家。请为游戏《崇祯沙盘》中的以下历史人物生成其【户籍地(籍贯)】与一段【生平简介】。

人物姓名: {minister['name']}
派系: {minister['faction']}
性格标签: {','.join(minister.get('personality', []))}

要求：
1. 户籍地请用明代行政区划（如“南直隶苏州府昆山县”、“浙江承宣布政使司绍兴府”）。
2. 生平简介在100字左右，必须结合其真实历史背景、派系和性格标签。要写出特色，避免千人一面。
3. 请以严格的 JSON 格式返回，包含 'hometown' 和 'biography' 两个字符串字段，不要有其他前缀或后缀。
"""
    try:
        async with session.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={
                "model": "deepseek-chat", # or deepseek-reasoner
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"}
            }
        ) as response:
            result = await response.json()
            content = result['choices'][0]['message']['content']
            parsed = json.loads(content)
            minister["hometown"] = parsed.get("hometown", "未知")
            minister["biography"] = parsed.get("biography", "")
            print(f"Generated bio for {minister['name']}")
    except Exception as e:
        print(f"Failed to generate for {minister['name']}: {e}")
        minister["hometown"] = "未知"
        minister["biography"] = "生平不详。"
        
    return minister

async def main():
    # 1. Load existing ministers
    base_dir = os.path.dirname(os.path.dirname(__file__))
    data_file = os.path.join(base_dir, "data", "initial_ministers.json")
    
    if os.path.exists(data_file):
        with open(data_file, 'r', encoding='utf-8') as f:
            all_ministers = json.load(f)
    else:
        all_ministers = []

    # 2. Append missing ones
    existing_names = {m["name"] for m in all_ministers}
    
    # Helper to create basic stats
    import random
    def create_stats(m, status):
        base = {
            "minister_id": m["name"], # Simplification
            "name": m["name"],
            "role": m.get("role", "在野"),
            "status": status,
            "faction": m["faction"],
            "personality": m["personality"],
            "loyalty_to_emperor": random.randint(40, 95),
            "personal_power": random.randint(20, 80),
            "competence": random.randint(50, 95),
            "corruption": random.randint(5, 80),
            "risk_tolerance": random.randint(30, 90),
            "policy_bias": {}, # Simplified
            "speaking_style": "...",
        }
        if "department" in m:
            base["department"] = m["department"]
        return base

    for m in high_tier_historical:
        if m["name"] not in existing_names:
            all_ministers.append(create_stats(m, "active"))
            
    for m in mid_low_tier_historical:
        if m["name"] not in existing_names:
            all_ministers.append(create_stats(m, "reserve"))

    # 3. Generate missing bios using DeepSeek
    async with aiohttp.ClientSession() as session:
        tasks = []
        for minister in all_ministers:
            if "biography" not in minister or "hometown" not in minister:
                tasks.append(generate_bio(session, minister))
        
        if tasks:
            await asyncio.gather(*tasks)

    # 4. Save back
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(all_ministers, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(all_ministers)} ministers.")

if __name__ == "__main__":
    asyncio.run(main())
