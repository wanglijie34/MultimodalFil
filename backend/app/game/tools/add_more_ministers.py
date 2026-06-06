import os
import json
import asyncio
import aiohttp
import uuid
import random

# More historical officials for mid/low tier
more_officials = [
    {"name": "史可法", "role": "西安府推官", "faction": "donglin", "personality": ["愚忠", "尽责", "文臣带兵"]},
    {"name": "左良玉", "role": "辽东边将", "faction": "frontier_army", "personality": ["骄兵悍将", "保存实力", "军阀倾向"]},
    {"name": "高杰", "role": "陕西游击", "faction": "frontier_army", "personality": ["反复无常", "猛将", "残暴"]},
    {"name": "黄得功", "role": "京营游击", "faction": "frontier_army", "personality": ["忠勇", "善战", "嗜酒"]},
    {"name": "刘良佐", "role": "河南参将", "faction": "frontier_army", "personality": ["首鼠两端", "骑兵将领"]},
    {"name": "阎应元", "role": "江阴典史", "faction": "donglin", "personality": ["极度忠烈", "善守城", "小官大义"]},
    {"name": "陈明遇", "role": "江阴县尉", "faction": "donglin", "personality": ["忠肝义胆", "视死如归"]},
    {"name": "张同敞", "role": "兵部主事", "faction": "donglin", "personality": ["刚直", "名臣之后", "死节"]},
    {"name": "杨廷麟", "role": "兵部职方司主事", "faction": "donglin", "personality": ["忠烈", "知兵"]},
    {"name": "祁彪佳", "role": "苏州推官", "faction": "donglin", "personality": ["清正", "殉国", "文士"]},
    {"name": "钱谦益", "role": "在野", "faction": "donglin", "personality": ["文坛领袖", "首鼠两端", "怯懦"]},
    {"name": "吴伟业", "role": "在野", "faction": "donglin", "personality": ["江南才子", "文弱", "摇摆"]},
    {"name": "黄宗羲", "role": "在野", "faction": "donglin", "personality": ["思想家", "坚毅", "大儒"]},
    {"name": "顾炎武", "role": "在野", "faction": "donglin", "personality": ["学者", "经世致用", "倔强"]},
    {"name": "王夫之", "role": "在野", "faction": "donglin", "personality": ["大儒", "隐士", "孤傲"]},
    {"name": "张煌言", "role": "举人", "faction": "donglin", "personality": ["忠臣", "抗清", "百折不挠"]},
    {"name": "郑成功", "role": "南安生员", "faction": "frontier_army", "personality": ["名将", "海主", "忠勇", "极度执着"]},
    {"name": "李海蛟", "role": "山东把总", "faction": "frontier_army", "personality": ["草根", "悍勇"]},
    {"name": "高迎祥", "role": "驿卒", "faction": "revenue_bureaucrats", "personality": ["叛逆", "枭雄", "野心"]},
    {"name": "李自成", "role": "驿卒", "faction": "revenue_bureaucrats", "personality": ["枭雄", "坚韧", "草莽"]},
    {"name": "张献忠", "role": "捕快", "faction": "revenue_bureaucrats", "personality": ["残暴", "狡诈", "流寇"]},
    {"name": "马士英", "role": "凤阳总督", "faction": "revenue_bureaucrats", "personality": ["权臣", "贪婪", "排斥异己"]},
    {"name": "阮大铖", "role": "在野", "faction": "revenue_bureaucrats", "personality": ["才子", "戏曲家", "反复无常"]},
    {"name": "堵胤锡", "role": "湖广知府", "faction": "donglin", "personality": ["统帅", "联合流寇抗清", "大局观"]},
    {"name": "何腾蛟", "role": "湖广巡抚", "faction": "donglin", "personality": ["忠心", "无能", "排内"]},
    {"name": "金声桓", "role": "江西左都督", "faction": "frontier_army", "personality": ["军阀", "反覆"]},
    {"name": "李成栋", "role": "江南提督", "faction": "frontier_army", "personality": ["残暴", "后倒戈抗清"]},
    {"name": "孙可望", "role": "在野", "faction": "frontier_army", "personality": ["枭雄", "野心极大", "内斗"]},
    {"name": "刘文秀", "role": "在野", "faction": "frontier_army", "personality": ["名将", "忠厚", "善战"]},
]

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

async def generate_bio(session, minister):
    if not DEEPSEEK_API_KEY:
        minister["hometown"] = "未知"
        minister["biography"] = f"{minister['name']}，大明官员。性格{','.join(minister.get('personality', []))}。"
        return minister

    prompt = f"""
你是一个精通明朝晚期历史的史学家。请为游戏《崇祯沙盘》中的以下历史人物生成其【户籍地(籍贯)】与一段【生平简介】。

人物姓名: {minister['name']}
派系: {minister['faction']}
性格标签: {','.join(minister.get('personality', []))}
当前职务/身份: {minister.get('role', '在野')}

要求：
1. 户籍地请用明代行政区划（如“南直隶苏州府昆山县”、“陕西承宣布政使司延安府”）。
2. 生平简介在100字左右，必须结合其真实历史背景、职务和性格标签。要写出特色，避免千人一面。
3. 请以严格的 JSON 格式返回，包含 'hometown' 和 'biography' 两个字符串字段，不要有其他前缀或后缀。
"""
    try:
        async with session.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={
                "model": "deepseek-chat",
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
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_file = os.path.join(base_dir, "data", "initial_ministers.json")
    
    with open(data_file, 'r', encoding='utf-8') as f:
        all_ministers = json.load(f)

    existing_names = {m["name"] for m in all_ministers}
    
    def create_stats(m):
        return {
            "minister_id": m["name"],
            "name": m["name"],
            "role": m.get("role", "在野"),
            "status": "reserve",
            "faction": m["faction"],
            "personality": m["personality"],
            "loyalty_to_emperor": random.randint(40, 95),
            "personal_power": random.randint(20, 80),
            "competence": random.randint(50, 95),
            "corruption": random.randint(5, 80),
            "risk_tolerance": random.randint(30, 90),
            "policy_bias": {},
            "speaking_style": "...",
        }

    new_additions = []
    for m in all_ministers:
        if m.get("hometown") == "未知" or m.get("biography") == "生平不详。":
            new_additions.append(m)

    for m in more_officials:
        if m["name"] not in existing_names:
            new_m = create_stats(m)
            all_ministers.append(new_m)
            new_additions.append(new_m)

    async with aiohttp.ClientSession() as session:
        tasks = []
        for minister in new_additions:
            tasks.append(generate_bio(session, minister))
        
        if tasks:
            await asyncio.gather(*tasks)

    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(all_ministers, f, ensure_ascii=False, indent=2)
        
    print(f"Added {len(new_additions)} new reserve officials.")

if __name__ == "__main__":
    asyncio.run(main())
