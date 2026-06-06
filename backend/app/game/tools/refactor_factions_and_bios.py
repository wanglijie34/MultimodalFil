import json
import os
import asyncio
import aiohttp

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "initial_ministers.json")
API_KEY = os.environ.get("DEEPSEEK_API_KEY")

SOUTHERN_PROVINCES = ["南直隶", "浙江", "江西", "福建", "广东", "广西", "湖广", "应天", "云南", "贵州"]
NORTHERN_PROVINCES = ["北直隶", "山东", "山西", "陕西", "河南", "四川", "辽东", "顺天", "宁夏", "甘肃"]

def get_base_faction(m):
    role = m.get("role", "")
    dept = m.get("department", "")
    faction = m.get("faction", "")
    
    # Check Eunuch
    if any(k in role for k in ["太监", "司礼监", "东厂", "厂卫", "秉笔"]) or \
       any(k in dept for k in ["司礼监", "东厂", "锦衣卫"]):
        return "eunuch"
    
    # Check Military
    if any(k in role for k in ["总兵", "边将", "参将", "提督", "督师", "游击", "把总", "千总", "武官", "都督", "卫", "将军", "校尉"]) or \
       faction == "frontier_army":
        return "frontier_army"
        
    return "civil"

def determine_civil_faction(hometown: str):
    if not hometown or hometown == "未知" or hometown == "未知府县":
        # Default fallback
        return "beifang"
    
    for p in SOUTHERN_PROVINCES:
        if p in hometown:
            return "jiangnan"
            
    for p in NORTHERN_PROVINCES:
        if p in hometown:
            return "beifang"
            
    # Default fallback for unmapped
    return "beifang"

async def fetch_bio(session, name, traits):
    prompt = f"""
你是一个精通明朝晚期历史的史学家。请为明末崇祯年间的官员【{name}】生成生平和籍贯。
性格特征：{', '.join(traits) if traits else '普通官员'}
要求：
1. 籍贯：必须是明代区划（如“南直隶苏州府”、“浙江绍兴府”或“北直隶顺天府”）。
2. 生平：50-80字，结合他的性格特征，写出一点个人特色（科举经历或政绩等）。
3. 严格输出JSON，不要有Markdown格式：
{{
  "hometown": "省份+府县",
  "biography": "生平简介内容"
}}
"""
    try:
        async with session.post(
            "https://api.deepseek.com/v4/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7
            },
            timeout=15
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                content = data['choices'][0]['message']['content'].strip()
                if content.startswith("```json"): content = content[7:]
                if content.endswith("```"): content = content[:-3]
                parsed = json.loads(content)
                return parsed.get("hometown", "未知"), parsed.get("biography", "生平不详。")
            else:
                return "未知", "生平不详。"
    except Exception as e:
        print(f"Error fetching {name}: {e}")
        return "未知", "生平不详。"

async def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        ministers = json.load(f)
        
    # 1. Delete specific rebels
    to_delete = ["张献忠", "李自成", "高迎祥"]
    ministers = [m for m in ministers if m["name"] not in to_delete]
    
    # 2. Find missing bios and fetch
    missing = []
    for m in ministers:
        if m.get("biography") == "生平不详。" or m.get("hometown") == "未知" or not m.get("hometown"):
            missing.append(m)
            
    if missing and API_KEY:
        print(f"Fetching bios for {len(missing)} ministers...")
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_bio(session, m["name"], m.get("personality", [])) for m in missing]
            results = await asyncio.gather(*tasks)
            
            for m, (ht, bio) in zip(missing, results):
                if ht and ht != "未知":
                    m["hometown"] = ht
                if bio and bio != "生平不详。":
                    m["biography"] = bio
                    
    # 3. Assign new factions
    for m in ministers:
        base = get_base_faction(m)
        if base in ["eunuch", "frontier_army"]:
            m["faction"] = base
        else:
            # civil
            m["faction"] = determine_civil_faction(m.get("hometown", ""))

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(ministers, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(ministers)} ministers.")

if __name__ == "__main__":
    asyncio.run(main())
