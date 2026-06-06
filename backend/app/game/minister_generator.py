import os
import random
import json
import uuid
import aiohttp
import asyncio
from typing import List, Dict, Any

# Name generation parts
SURNAMES = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗", "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧", "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕", "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎", "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜", "范", "方", "石", "姚", "谭", "廖", "邹", "熊", "金", "陆", "郝", "孔", "白", "崔", "康", "毛", "邱", "秦", "江", "史", "顾", "侯", "邵", "孟", "龙", "万", "段", "雷", "钱", "汤", "尹", "黎", "易", "常", "武", "乔", "贺", "赖", "龚", "文"]
GIVEN_NAMES_CHARS = ["中", "文", "武", "明", "国", "安", "平", "仁", "义", "礼", "智", "信", "忠", "孝", "建", "华", "正", "道", "德", "志", "勇", "诚", "大", "天", "恩", "光", "耀", "成", "功", "宏", "伟", "世", "永", "昌", "盛", "广", "发", "兴", "隆", "祥", "瑞", "丰", "泽", "浩", "海", "清", "源", "泉", "山", "岳", "林", "木", "森", "春", "夏", "秋", "冬", "风", "云", "雷", "电", "雨", "雪", "霜", "日", "月", "星", "辰", "金", "银", "铜", "铁", "玉", "石", "宝", "珍", "龙", "凤", "虎", "豹", "鹤", "鹏", "鲲", "鸿", "远", "近", "高", "低", "长", "短", "方", "圆"]

FACTIONS = ["jiangnan", "beifang", "frontier_army", "eunuch"]

PERSONALITY_TRAITS = [
    "刚直", "圆滑", "贪婪", "清廉", "忠义", "懦弱", "勇猛", "智谋", "鲁莽", 
    "沉稳", "浮躁", "宽厚", "刻薄", "迂腐", "变通", "保守", "激进", "重义", "轻生",
    "重利", "重名", "孤傲", "随和", "机警", "迟钝", "勤勉", "懒散", "严谨", "粗疏"
]

def generate_random_name() -> str:
    surname = random.choice(SURNAMES)
    length = random.choice([1, 2, 2]) # Bias towards 2-character given names
    given_name = "".join(random.sample(GIVEN_NAMES_CHARS, length))
    return f"{surname}{given_name}"

def generate_random_stats(quality: str = "normal") -> Dict[str, Any]:
    # quality: "low", "normal", "high", "legendary"
    if quality == "low":
        mean, std = 40, 15
    elif quality == "normal":
        mean, std = 60, 15
    elif quality == "high":
        mean, std = 75, 10
    else: # legendary
        mean, std = 90, 5
        
    def get_val():
        val = int(random.gauss(mean, std))
        return max(0, min(100, val))
        
    return {
        "loyalty_to_emperor": get_val(),
        "personal_power": get_val(),
        "competence": get_val(),
        "corruption": int(random.gauss(50, 20)) % 100, # Corruption varies regardless of quality
        "risk_tolerance": get_val()
    }

async def generate_bio_from_llm(name: str, faction: str, traits: List[str], identity: str) -> tuple[str, str, str]:
    """Returns (hometown, biography, role) using DeepSeek API"""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("WARNING: DEEPSEEK_API_KEY not found. Using placeholder for generated minister.")
        return "未知府县", f"{name}，大明新进官员，行事{traits[0]}。", "在野"
        
    prompt = f"""
你是一个精通明朝晚期历史的史学家，现在正在为游戏《崇祯沙盘》生成虚构官员的生平。
请为一位新生成的候选官员生成其【户籍地(籍贯)】、【生平简介】和【身份职务】。

官员信息：
姓名：{name}
身份类型：{identity} （太监/特务 或 边将武官 或 文官）
所属派系：{faction} （江南清流集团/北方官僚/边军集团/阉党）
性格特征：{', '.join(traits)}

要求：
1. 籍贯：必须符合派系。如果是江南清流集团，籍贯必在南直隶、浙江、江西、福建、广东、广西、湖广等南方省份；如果是北方官僚，籍贯必在北直隶、山东、山西、陕西、河南等地；如果是边军集团，籍贯必在九边（辽东、宣府、大同、宁夏、甘肃、延绥、蓟州、山西、固原）；阉党籍贯随机。只需输出如“南直隶苏州府”、“辽东广宁卫”等格式。
2. 身份职务：根据他的“身份类型”生成一个符合明末历史的低级官职或头衔，例如“辽东千总”、“东厂理刑百户”、“落第秀才”等，字数在10字以内。
3. 生平简介：基于明末崇祯年间的时代背景，字数在50-80字之间。结合他的派系、身份和性格特征，写出一点个人特色。
4. 必须严格按照以下JSON格式返回，不要包含其他解释性文字，不要有Markdown代码块格式：
{{
  "hometown": "省份+府县",
  "role": "身份职务",
  "biography": "生平简介内容"
}}
"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                },
                timeout=15
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    content = result['choices'][0]['message']['content']
                    parsed = json.loads(content)
                    return parsed.get("hometown", "未知"), parsed.get("biography", f"{name}生平不详。"), parsed.get("role", "在野")
                else:
                    print(f"DeepSeek API Error: {response.status}")
    except Exception as e:
        print(f"DeepSeek generation failed: {e}")
        
    return "天下某地", f"{name}乃是凭自身才具脱颖而出之人。其为人{traits[0]}，此番若能得用，必将大展宏图。", "在野"

async def generate_candidates(count: int, quality_bias: str = "normal", is_military_biased: bool = False, event_type: str = "recruit") -> List[Dict[str, Any]]:
    """Generates a list of new candidate ministers"""
    candidates = []
    
    for _ in range(count):
        name = generate_random_name()
        
        # Decide identity and faction
        if event_type == "recruit":
            # 求贤必出特务或边将
            identity = random.choice(["太监/特务", "边将武官"])
            if identity == "太监/特务":
                faction = "eunuch"
            else:
                # 边将武官也可以有任何派系
                faction = random.choice(["jiangnan", "beifang", "frontier_army", "eunuch"])
        elif is_military_biased:
            identity = "边将武官"
            faction = random.choice(["jiangnan", "beifang", "frontier_army", "eunuch"])
        else:
            identity = "文官"
            faction = random.choice(FACTIONS)
            
        traits = random.sample(PERSONALITY_TRAITS, k=random.randint(1, 3))
        stats = generate_random_stats(quality_bias)
        
        # Fetch bio from LLM
        faction_label = {
            "jiangnan": "江南清流集团",
            "beifang": "北方官僚",
            "frontier_army": "边军集团",
            "eunuch": "阉党"
        }.get(faction, faction)
        hometown, bio, role = await generate_bio_from_llm(name, faction_label, traits, identity)
        
        minister_dict = {
            "minister_id": f"gen_{uuid.uuid4().hex[:8]}",
            "name": name,
            "role": role,
            "status": "candidate", # Special status for pending review
            "faction": faction,
            "loyalty_to_emperor": stats["loyalty_to_emperor"],
            "personal_power": stats["personal_power"] // 2, # Starts with low power
            "competence": stats["competence"],
            "corruption": stats["corruption"],
            "risk_tolerance": stats["risk_tolerance"],
            "personality": traits,
            "policy_bias": {},
            "speaking_style": "臣恳请陛下圣裁。",
            "department": "",
            "hometown": hometown,
            "biography": bio
        }
        candidates.append(minister_dict)
        
    return candidates
