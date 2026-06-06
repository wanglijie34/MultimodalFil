import json
import os
import asyncio
import aiohttp
import random

base_dir = os.path.dirname(os.path.dirname(__file__))
data_file = os.path.join(base_dir, "data", "initial_ministers.json")

def load_data():
    with open(data_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

dead_list = ["杨涟", "左光斗", "魏大中", "黄尊素"]
reserve_list = ["徐光启", "郑三俊", "曹于汴", "刘宗周", "倪元璐", "侯恂", "李邦华", "王应熊", "吴麟征", "游士任", "李应升", "张弘道", "史记枢", "周宗建", "刘之纶", "许誉卿", "熊明遇", "姜曰广"]

new_eunuchs = [
    {"name": "周应秋", "role": "吏部尚书", "department": "吏部", "faction": "eunuch", "personality": ["贪婪", "五虎之一", "十狗首脑"]},
    {"name": "来宗道", "role": "礼部尚书", "department": "礼部", "faction": "eunuch", "personality": ["骑墙", "偏向阉党", "懦弱"]},
    {"name": "崔呈秀", "role": "兵部尚书兼左都御史", "department": "兵部,都察院左右都御史", "faction": "eunuch", "personality": ["五虎之首", "干练", "狠毒"]},
    {"name": "苏茂相", "role": "刑部尚书", "department": "刑部", "faction": "eunuch", "personality": ["爪牙", "陷害清流", "阿谀"]},
    {"name": "薛凤翔", "role": "工部尚书", "department": "工部", "faction": "eunuch", "personality": ["营建生祠", "贪污", "逢迎"]},
    {"name": "房壮丽", "role": "右都御史", "department": "都察院左右都御史", "faction": "eunuch", "personality": ["魏党", "言官", "党同伐异"]},
    {"name": "霍维华", "role": "通政使", "department": "通政司使", "faction": "eunuch", "personality": ["阉党核心", "蒙蔽圣听", "擅权"]},
    {"name": "陈尔翼", "role": "吏科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["封驳", "阉党死忠", "攻击东林"]},
    {"name": "黄宪臣", "role": "户科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["阉党", "阻挠政策", "趋炎附势"]},
    {"name": "李鲁生", "role": "礼科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["阉党", "言辞犀利", "攀附"]},
    {"name": "霍守典", "role": "兵科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["阉党", "阻断军情", "畏战"]},
    {"name": "曹顺", "role": "刑科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["阉党", "枉法", "构陷"]},
    {"name": "李恒茂", "role": "工科给事中", "department": "六科给事中", "faction": "eunuch", "personality": ["阉党", "贪墨", "包庇"]},
    {"name": "梁克从", "role": "浙江道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "狠辣"]},
    {"name": "潘士良", "role": "江西道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "诬告"]},
    {"name": "徐吉", "role": "福建道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "敛财"]},
    {"name": "王绩", "role": "四川道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "残忍"]},
    {"name": "杨维垣", "role": "陕西道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十孩儿", "神枪手", "构陷无度"]},
    {"name": "袁本秀", "role": "云南道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "阿附"]},
    {"name": "李灿", "role": "河南道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "贪鄙"]},
    {"name": "鞠国祯", "role": "广西道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "钻营"]},
    {"name": "石三畏", "role": "广东道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "无耻"]},
    {"name": "卓迈", "role": "山西道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "刻薄"]},
    {"name": "陈朝辅", "role": "山东道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "巧言"]},
    {"name": "陆万龄", "role": "湖广道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["狂热分子", "提议魏忠贤配享孔庙", "无下限"]},
    {"name": "刘徽", "role": "贵州道御史", "department": "十三道监察御史", "faction": "eunuch", "personality": ["十狗", "鹰犬", "见风使舵"]},
]

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

async def generate_bio(session, minister):
    prompt = f"""
你是一个精通明朝晚期历史的史学家。请为游戏《崇祯沙盘》中的以下历史人物生成其【户籍地(籍贯)】与一段【生平简介】。
人物姓名: {minister['name']}
派系: {minister['faction']}
性格标签: {','.join(minister.get('personality', []))}
职位: {minister['role']}

要求：
1. 户籍地请用明代行政区划（如“南直隶苏州府昆山县”、“浙江承宣布政使司绍兴府”）。如果史料不详，可根据其姓氏或生平合理编造一个。
2. 生平简介在80-100字左右，必须结合其真实历史背景、派系和性格标签。要写出作为阉党走狗的邪恶特色，避免千人一面。
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
    ministers = load_data()
    
    # 1. Update status for existing ones
    for m in ministers:
        if m["name"] in dead_list:
            m["status"] = "dead"
            m["department"] = ""
            print(f"Marked {m['name']} as dead.")
        elif m["name"] in reserve_list:
            m["status"] = "reserve"
            m["department"] = ""
            print(f"Moved {m['name']} to reserve.")
            
    # 2. Add or update new eunuchs
    existing_names = {m["name"]: m for m in ministers}
    tasks = []
    
    async with aiohttp.ClientSession() as session:
        for new_e in new_eunuchs:
            m = existing_names.get(new_e["name"])
            if not m:
                m = {
                    "minister_id": new_e["name"],
                    "name": new_e["name"],
                    "loyalty_to_emperor": random.randint(10, 30),
                    "personal_power": random.randint(50, 90),
                    "competence": random.randint(30, 80),
                    "corruption": random.randint(70, 100),
                    "risk_tolerance": random.randint(40, 80),
                    "policy_bias": {},
                    "speaking_style": "...",
                }
                ministers.append(m)
            
            m["role"] = new_e["role"]
            m["department"] = new_e["department"]
            m["faction"] = new_e["faction"]
            m["personality"] = new_e["personality"]
            m["status"] = "active"
            
            if "biography" not in m or m["biography"] == "" or m["biography"] == "生平不详。":
                tasks.append(generate_bio(session, m))
                
        if tasks:
            await asyncio.gather(*tasks)

    save_data(ministers)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
