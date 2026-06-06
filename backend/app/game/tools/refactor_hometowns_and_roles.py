import json
import os
import random
import asyncio
import aiohttp

FILE_PATH = r"D:\Develop\MultimodalFile\backend\app\game\data\initial_ministers.json"
API_KEY = os.environ.get("DEEPSEEK_API_KEY")

SOUTH_PROVINCES = ["南直隶", "浙江", "江西", "福建", "广东", "广西", "湖广"]
NORTH_PROVINCES = ["北直隶", "山东", "山西", "陕西", "河南", "四川"]
NINE_BORDERS = ["辽东", "宣府", "大同", "宁夏", "甘肃", "延绥", "蓟州", "固原"]

def is_military_role(role):
    keywords = ["将", "兵", "督", "抚", "总兵", "参将", "游击", "千总", "百户", "锦衣卫", "边将"]
    return any(k in role for k in keywords)

def get_hometown_pool(faction):
    if faction == "jiangnan":
        return SOUTH_PROVINCES
    elif faction == "beifang":
        return NORTH_PROVINCES
    elif faction == "frontier_army":
        return NINE_BORDERS
    return None # eunuch -> random

async def refactor_ministers():
    with open(FILE_PATH, "r", encoding="utf-8") as f:
        ministers = json.load(f)
        
    for m in ministers:
        # 1. Compatibility mechanism: Military generals can be other factions
        if is_military_role(m.get("role", "")):
            # 50% chance to stay frontier_army, 50% to be jiangnan/beifang/eunuch
            if random.random() > 0.5:
                m["faction"] = random.choice(["jiangnan", "beifang", "eunuch"])
            else:
                m["faction"] = "frontier_army"
                
        # 2. Strict Hometown Mapping
        faction = m["faction"]
        pool = get_hometown_pool(faction)
        
        if pool:
            # Check if current hometown matches
            current_ht = m.get("hometown", "")
            matches = any(p in current_ht for p in pool)
            if not matches:
                # Rewrite hometown
                chosen_prov = random.choice(pool)
                m["hometown"] = f"{chosen_prov}某府县"
                
    with open(FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(ministers, f, ensure_ascii=False, indent=2)
        
    print("Successfully refactored hometowns and military factions.")

if __name__ == "__main__":
    asyncio.run(refactor_ministers())
