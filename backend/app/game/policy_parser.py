import json
from app.services.llm_service import llm_service

class PolicyParser:
    async def parse_edict(self, edict_text: str) -> list[dict]:
        """
        Parses a natural language edict into a list of structured policies.
        """
        prompt = f"""
你是一个大明王朝的内阁文书解析器。请将皇帝的口谕/诏书解析为结构化的政策列表。

【极度重要的原则：严禁脑补】
绝对不要臆想、编造皇帝没有明确指出的数据！
如果诏书中没有提到具体数额（如拨款多少两、发粮多少石）、没有提到具体地点（如去哪个省）、没有提到具体机构，那么对应的字段必须省略（不要在JSON中输出该字段），或者填 null/空数组。绝对不要替皇帝做主填入默认的数字或地点！如果整个诏书只是空泛的口号（如“赶紧赈灾”），由于地点和金额均缺失，解析出的字段应为空。

当前支持的政策类型 (policy_type) 有：
- disaster_relief: 赈灾 (字段: target_regions(列表), budget_silver(整数), grain_amount(整数), tax_exemption_months(整数), strictness(1-100))
- grain_transfer: 调粮 (字段: source_regions(列表), target_regions(列表), grain_amount(整数))
- tax_adjustment: 调整赋税 (字段: target_regions(列表), tax_delta(整数，正为增负为减), duration_months(整数))
- military_supply: 发放军饷/物资 (字段: target_regions(列表), budget_silver(整数), grain_amount(整数), recruitment_level(1-100))
- anti_corruption: 整顿吏治/反腐 (字段: target_regions(列表), target_institutions(列表), strictness(1-100))
- faction_purge: 清洗派系 (字段: target_faction(字符串), strictness(1-100))

可能的区域ID (target_regions / source_regions):
capital(京师), liaodong(辽东), shanhaiguan(山海关), shaanxi(陕西), shanxi(山西), henan(河南), shandong(山东), zhili(直隶), jiangnan(江南), huguang(湖广), sichuan(四川), yungui(云贵)

可能的机构ID (target_institutions):
dongchang(东厂), jinyiwei(锦衣卫), neige(内阁), hubu(户部), bingbu(兵部), libu(吏部), xingbu(刑部), gongbu(工部), kedao(科道)

可能的派系ID (target_faction):
donglin(东林党), eunuch(阉党), frontier_army(边军集团), revenue_bureaucrats(户部财政官僚), local_gentry(地方士绅)

皇帝诏书：
"{edict_text}"

请返回纯JSON数组格式，不带markdown标签，不带其他说明文字。例如：
[
  {{
    "policy_type": "disaster_relief",
    "target_regions": ["shaanxi"],
    "budget_silver": 200000
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
