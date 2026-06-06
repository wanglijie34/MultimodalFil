import json
from app.services.llm_service import llm_service

class PolicyParser:
    async def parse_edict(self, edict_text: str, active_states: list[str] = None) -> list[dict]:
        """
        Parses a natural language edict into a list of structured policies.
        """
        if active_states is None:
            active_states = []
            
        distortion_prompt = ""
        if "深宫疑云" in active_states:
            distortion_prompt = """
【深宫疑云 / 圣意难测】系统状态已激活：
皇帝目前极度多疑、精神压力极大。在下发诏书时，语言可能充满矛盾和混乱。
作为内阁文书，你在拟写结构化政令时，必须**故意曲解**部分内容（例如：将赈灾数额砍半、把打击目标偷偷换成另一个派系、或者把目标地点写错）。这是机制要求，请务必在返回的JSON中体现出这种“扭曲”，以模拟圣意被曲解！
"""
        prompt = f"""
你是一个大明王朝的内阁文书解析器。请将皇帝的口谕/诏书解析为结构化的政策列表。

【极度重要的原则：严禁脑补】
绝对不要臆想、编造皇帝没有明确指出的数据！
如果诏书中没有提到具体数额（如拨款多少两、发粮多少石）、没有提到具体地点（如去哪个省）、没有提到具体机构，那么对应的字段必须省略（不要在JSON中输出该字段），或者填 null/空数组。绝对不要替皇帝做主填入默认的数字或地点！如果整个诏书只是空泛的口号（如“赶紧赈灾”），由于地点和金额均缺失，解析出的字段应为空。

当前支持的政策类型 (policy_type) 有：
- disaster_relief: 赈灾 (字段: target_regions(列表), budget_silver(整数), grain_amount(整数), tax_exemption_months(整数), strictness(1-100, 严厉程度), target_institutions(列表, 督办/参与机构))
- grain_transfer: 调粮 (字段: source_regions(列表, 调出地/交粮地), target_regions(列表, 目标地/收粮地), grain_amount(整数), strictness(1-100), target_institutions(列表, 督办机构如厂卫))
- tax_adjustment: 调整赋税 (字段: target_regions(列表), tax_delta(整数), duration_months(整数), strictness(1-100), target_institutions(列表))
- military_supply: 发放军饷/物资 (字段: target_regions(列表), budget_silver(整数), grain_amount(整数), recruitment_level(1-100), strictness(1-100), target_institutions(列表))
- anti_corruption: 整顿吏治/反腐 (字段: target_regions(列表), target_institutions(列表), strictness(1-100, 如有剥皮实草等酷刑应填100))
- faction_purge: 清洗派系 (字段: target_faction(字符串), target_institutions(列表), strictness(1-100))

附加核心标记（布尔值）：
- is_zhongzhi: 判断圣旨是否跳过了外朝商议直接硬下，或者用词极度独断（如“朕意已决”、“强令”）。
- enforcement_flag: 判断是否动用了特务暴力强制执行（如诏书提及“锦衣卫”、“派太监”、“特马监军”、“先斩后奏”、“剥皮”等字眼）。

可能的区域ID (target_regions / source_regions):
capital(京师), liaodong(辽东), shanhaiguan(山海关), shaanxi(陕西), shanxi(山西), henan(河南), shandong(山东), zhili(直隶), jiangnan(江南), huguang(湖广), sichuan(四川), yungui(云贵)

可能的机构ID (target_institutions):
dongchang(东厂), jinyiwei(锦衣卫), neige(内阁), hubu(户部), bingbu(兵部), libu(吏部), xingbu(刑部), gongbu(工部), kedao(科道)

可能的派系ID (target_faction):
donglin(东林党), eunuch(阉党), frontier_army(边军集团), revenue_bureaucrats(户部财政官僚), local_gentry(地方士绅)

皇帝诏书：
"{edict_text}"
{distortion_prompt}

请返回纯JSON数组格式，不带markdown标签，不带其他说明文字。例如：
[
  {{
    "policy_type": "disaster_relief",
    "target_regions": ["shaanxi"],
    "budget_silver": 200000,
    "is_zhongzhi": true,
    "enforcement_flag": false
  }}
]
"""
        response = await llm_service.chat([{"role": "user", "content": prompt}], json_mode=True)
        
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            policies = json.loads(response.strip())
            if isinstance(policies, dict) and "policies" in policies:
                return policies["policies"]
            if isinstance(policies, list):
                return policies
            return [policies]
        except Exception as e:
            print(f"Error parsing edict: {e}")
            return []
