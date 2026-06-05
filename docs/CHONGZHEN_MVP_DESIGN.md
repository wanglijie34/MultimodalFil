# 《历史模拟器：崇祯》MVP 设计文档

## 1. MVP 核心目标

玩家扮演崇祯帝，自 **1627 年 10 月** 开始执政。  
游戏按 **月回合制** 推进，每回合代表 **1 个月**。

每回合核心流程：

1. 系统展示当前局势
2. 玩家查看地图与各区域状态
3. 玩家召见 1-2 位大臣
4. 大臣基于自身立场、性格、派系生成建议
5. 玩家以自然语言撰写诏书
6. 系统将诏书解析为结构化政策 JSON
7. 规则引擎计算政策效果
8. 更新世界状态
9. 大模型生成奏报、民间反馈、朝堂反应与局势叙事
10. 进入下一个月

本作的核心不是“找最优解”，而是让玩家在财政、军备、民心、党争、天灾和边患之间持续做权衡。

---

## 2. MVP 范围定义

### 2.1 时间范围

MVP 时间范围固定为：

- 起点：**1627 年 10 月**
- 终点：**1630 年 12 月**

总计：

- **39 个回合**
- 每回合 = **1 个月**

MVP 不涉及：

- 明朝全时段两百余年完整历史
- 清军入关
- 南明阶段

### 2.2 地图范围

MVP 不追求完整全国所有府县的深度模拟，优先覆盖晚明危机的关键区域。  
先做 **12 个核心区域**：

1. 京师
2. 辽东
3. 山海关
4. 陕西
5. 山西
6. 河南
7. 山东
8. 直隶
9. 江南
10. 湖广
11. 四川
12. 云贵

这些区域足以支撑明末核心危机：

- 陕西大旱与流民问题
- 辽东后金军事压力
- 财政对江南的依赖
- 京师政治斗争
- 流民从西北向中原扩散
- 河南、山西、陕西一带动乱蔓延

---

## 3. MVP 技术架构

推荐架构：

```text
Frontend
  ->
Backend API
  ->
Game State Database
  ->
LLM Orchestrator
  ->
Policy Parser
  ->
Rule Engine
  ->
Narrative Generator
```

### 3.1 推荐技术栈

- 前端：React / Next.js
- 后端：FastAPI
- 数据库：PostgreSQL
  - 早期开发可先用 SQLite
- LLM：Qwen API 或本地 Qwen
- 状态存储：JSON + 数据库表
- 规则引擎：Python
- 地图：ECharts / SVG / Leaflet

### 3.2 前端 MVP 布局建议

MVP 阶段可先做一个 Web 主界面：

- 左侧：地图与区域数据
- 中间：当前奏报、事件、诏书输入
- 右侧：大臣建议、朝堂状态、全局指标

---

## 4. 核心数据设计

MVP 数据分为 8 类：

1. 全局国家状态
2. 区域状态
3. 朝廷派系状态
4. 大臣 Agent
5. 政策类型
6. 玩家诏书
7. 回合结果
8. 历史事件 / 动态事件

---

## 5. World State 设计

### 5.1 全局国家状态 `world_state`

这是每回合最重要的总状态。

```json
{
  "turn": 1,
  "date": {
    "year": 1627,
    "month": 10
  },
  "emperor": {
    "name": "崇祯",
    "prestige": 60,
    "legitimacy": 75,
    "stress": 25
  },
  "treasury": {
    "silver": 1200000,
    "monthly_income": 180000,
    "monthly_expense": 230000,
    "debt": 0
  },
  "national_metrics": {
    "public_support": 45,
    "bureaucratic_efficiency": 48,
    "military_readiness": 42,
    "corruption": 68,
    "factional_conflict": 72,
    "disaster_pressure": 65,
    "rebel_pressure": 35,
    "manchu_pressure": 70
  },
  "policy_flags": {
    "wei_zhongxian_purged": false,
    "liao_tax_increased": true,
    "large_scale_relief_active": false,
    "military_reform_active": false
  }
}
```

### 5.2 字段说明

| 字段 | 范围 | 作用 |
|---|---:|---|
| prestige | 0-100 | 皇帝威望，影响诏书执行率 |
| legitimacy | 0-100 | 统治正当性，过低会增加官僚抵抗 |
| stress | 0-100 | 皇帝压力，可影响决策惩罚与叙事 |
| silver | 整数 | 国库白银 |
| public_support | 0-100 | 全国民心 |
| bureaucratic_efficiency | 0-100 | 官僚执行效率 |
| military_readiness | 0-100 | 全国军备水平 |
| corruption | 0-100 | 腐败程度，越高越差 |
| factional_conflict | 0-100 | 党争强度，越高越差 |
| disaster_pressure | 0-100 | 全国灾害压力 |
| rebel_pressure | 0-100 | 总体叛乱压力 |
| manchu_pressure | 0-100 | 后金 / 满洲威胁压力 |

---

## 6. 区域状态设计

### 6.1 Region State

每个区域保存一份状态数据。

```json
{
  "region_id": "shaanxi",
  "name": "陕西",
  "type": "inland",
  "population": 4500000,
  "tax_base": 55000,
  "grain_storage": 30000,
  "public_order": 38,
  "public_support": 32,
  "disaster_level": 85,
  "famine_level": 78,
  "rebel_risk": 62,
  "military_presence": 25,
  "defense_level": 20,
  "corruption": 72,
  "local_elite_support": 35,
  "tax_burden": 75,
  "relief_need": 90000,
  "monthly_tax_income": 25000,
  "monthly_grain_output": 12000,
  "tags": ["drought", "famine", "high_rebel_risk"]
}
```

### 6.2 MVP 初始区域数据

```json
[
  {
    "region_id": "capital",
    "name": "京师",
    "population": 1000000,
    "tax_base": 30000,
    "grain_storage": 80000,
    "public_order": 65,
    "public_support": 50,
    "disaster_level": 20,
    "famine_level": 25,
    "rebel_risk": 20,
    "military_presence": 70,
    "defense_level": 75,
    "corruption": 70,
    "local_elite_support": 55,
    "tax_burden": 60,
    "monthly_tax_income": 20000,
    "monthly_grain_output": 10000,
    "relief_need": 10000,
    "tags": ["capital", "political_center"]
  },
  {
    "region_id": "liaodong",
    "name": "辽东",
    "population": 800000,
    "tax_base": 15000,
    "grain_storage": 25000,
    "public_order": 45,
    "public_support": 40,
    "disaster_level": 35,
    "famine_level": 40,
    "rebel_risk": 25,
    "military_presence": 85,
    "defense_level": 60,
    "corruption": 60,
    "local_elite_support": 45,
    "tax_burden": 70,
    "monthly_tax_income": 10000,
    "monthly_grain_output": 8000,
    "relief_need": 25000,
    "tags": ["frontier", "manchu_threat"]
  },
  {
    "region_id": "shanhaiguan",
    "name": "山海关",
    "population": 300000,
    "tax_base": 10000,
    "grain_storage": 40000,
    "public_order": 60,
    "public_support": 45,
    "disaster_level": 25,
    "famine_level": 30,
    "rebel_risk": 18,
    "military_presence": 90,
    "defense_level": 80,
    "corruption": 55,
    "local_elite_support": 50,
    "tax_burden": 65,
    "monthly_tax_income": 8000,
    "monthly_grain_output": 6000,
    "relief_need": 8000,
    "tags": ["fortress", "frontier"]
  },
  {
    "region_id": "shaanxi",
    "name": "陕西",
    "population": 4500000,
    "tax_base": 55000,
    "grain_storage": 30000,
    "public_order": 38,
    "public_support": 32,
    "disaster_level": 85,
    "famine_level": 78,
    "rebel_risk": 62,
    "military_presence": 25,
    "defense_level": 20,
    "corruption": 72,
    "local_elite_support": 35,
    "tax_burden": 75,
    "monthly_tax_income": 25000,
    "monthly_grain_output": 12000,
    "relief_need": 90000,
    "tags": ["drought", "famine", "high_rebel_risk"]
  },
  {
    "region_id": "shanxi",
    "name": "山西",
    "population": 3000000,
    "tax_base": 45000,
    "grain_storage": 50000,
    "public_order": 50,
    "public_support": 40,
    "disaster_level": 60,
    "famine_level": 55,
    "rebel_risk": 45,
    "military_presence": 35,
    "defense_level": 35,
    "corruption": 65,
    "local_elite_support": 42,
    "tax_burden": 70,
    "monthly_tax_income": 22000,
    "monthly_grain_output": 18000,
    "relief_need": 50000,
    "tags": ["drought_risk", "rebel_spread_risk"]
  },
  {
    "region_id": "henan",
    "name": "河南",
    "population": 5200000,
    "tax_base": 65000,
    "grain_storage": 60000,
    "public_order": 48,
    "public_support": 38,
    "disaster_level": 58,
    "famine_level": 52,
    "rebel_risk": 48,
    "military_presence": 30,
    "defense_level": 30,
    "corruption": 68,
    "local_elite_support": 40,
    "tax_burden": 72,
    "monthly_tax_income": 30000,
    "monthly_grain_output": 25000,
    "relief_need": 55000,
    "tags": ["central_plain", "rebel_spread_risk"]
  },
  {
    "region_id": "shandong",
    "name": "山东",
    "population": 4000000,
    "tax_base": 60000,
    "grain_storage": 70000,
    "public_order": 55,
    "public_support": 45,
    "disaster_level": 45,
    "famine_level": 42,
    "rebel_risk": 35,
    "military_presence": 40,
    "defense_level": 40,
    "corruption": 62,
    "local_elite_support": 45,
    "tax_burden": 68,
    "monthly_tax_income": 28000,
    "monthly_grain_output": 30000,
    "relief_need": 35000,
    "tags": ["grain_region"]
  },
  {
    "region_id": "zhili",
    "name": "直隶",
    "population": 3500000,
    "tax_base": 55000,
    "grain_storage": 65000,
    "public_order": 58,
    "public_support": 46,
    "disaster_level": 40,
    "famine_level": 38,
    "rebel_risk": 30,
    "military_presence": 50,
    "defense_level": 45,
    "corruption": 66,
    "local_elite_support": 48,
    "tax_burden": 65,
    "monthly_tax_income": 26000,
    "monthly_grain_output": 26000,
    "relief_need": 28000,
    "tags": ["near_capital"]
  },
  {
    "region_id": "jiangnan",
    "name": "江南",
    "population": 8500000,
    "tax_base": 180000,
    "grain_storage": 180000,
    "public_order": 68,
    "public_support": 55,
    "disaster_level": 25,
    "famine_level": 20,
    "rebel_risk": 18,
    "military_presence": 30,
    "defense_level": 35,
    "corruption": 58,
    "local_elite_support": 60,
    "tax_burden": 55,
    "monthly_tax_income": 75000,
    "monthly_grain_output": 70000,
    "relief_need": 15000,
    "tags": ["rich_region", "tax_core"]
  },
  {
    "region_id": "huguang",
    "name": "湖广",
    "population": 6000000,
    "tax_base": 90000,
    "grain_storage": 160000,
    "public_order": 62,
    "public_support": 52,
    "disaster_level": 30,
    "famine_level": 25,
    "rebel_risk": 25,
    "military_presence": 35,
    "defense_level": 35,
    "corruption": 55,
    "local_elite_support": 55,
    "tax_burden": 50,
    "monthly_tax_income": 42000,
    "monthly_grain_output": 80000,
    "relief_need": 18000,
    "tags": ["grain_core"]
  },
  {
    "region_id": "sichuan",
    "name": "四川",
    "population": 3500000,
    "tax_base": 45000,
    "grain_storage": 90000,
    "public_order": 60,
    "public_support": 50,
    "disaster_level": 35,
    "famine_level": 30,
    "rebel_risk": 28,
    "military_presence": 35,
    "defense_level": 40,
    "corruption": 60,
    "local_elite_support": 50,
    "tax_burden": 50,
    "monthly_tax_income": 20000,
    "monthly_grain_output": 45000,
    "relief_need": 20000,
    "tags": ["interior"]
  },
  {
    "region_id": "yungui",
    "name": "云贵",
    "population": 1800000,
    "tax_base": 25000,
    "grain_storage": 35000,
    "public_order": 52,
    "public_support": 42,
    "disaster_level": 45,
    "famine_level": 40,
    "rebel_risk": 40,
    "military_presence": 45,
    "defense_level": 45,
    "corruption": 65,
    "local_elite_support": 35,
    "tax_burden": 58,
    "monthly_tax_income": 12000,
    "monthly_grain_output": 18000,
    "relief_need": 25000,
    "tags": ["frontier", "local_chieftain"]
  }
]
```

---

## 7. 派系设计

MVP 先做 5 个派系：

1. 东林党
2. 阉党
3. 边军集团
4. 户部财政官僚
5. 地方士绅

### 7.1 派系状态 `faction_state`

```json
[
  {
    "faction_id": "donglin",
    "name": "东林党",
    "influence": 55,
    "loyalty": 48,
    "hostility": 35,
    "policy_preferences": {
      "anti_eunuch": 0.9,
      "tax_increase": -0.5,
      "relief": 0.6,
      "military_spending": 0.2,
      "centralization": 0.3
    }
  },
  {
    "faction_id": "eunuch",
    "name": "阉党",
    "influence": 70,
    "loyalty": 35,
    "hostility": 45,
    "policy_preferences": {
      "anti_eunuch": -1.0,
      "tax_increase": 0.3,
      "relief": -0.1,
      "military_spending": 0.2,
      "centralization": 0.8
    }
  },
  {
    "faction_id": "frontier_army",
    "name": "边军集团",
    "influence": 45,
    "loyalty": 50,
    "hostility": 30,
    "policy_preferences": {
      "anti_eunuch": 0.1,
      "tax_increase": 0.3,
      "relief": -0.2,
      "military_spending": 1.0,
      "centralization": 0.2
    }
  },
  {
    "faction_id": "revenue_bureaucrats",
    "name": "户部财政官僚",
    "influence": 50,
    "loyalty": 45,
    "hostility": 25,
    "policy_preferences": {
      "anti_eunuch": 0.2,
      "tax_increase": 0.8,
      "relief": -0.3,
      "military_spending": -0.4,
      "centralization": 0.4
    }
  },
  {
    "faction_id": "local_gentry",
    "name": "地方士绅",
    "influence": 65,
    "loyalty": 40,
    "hostility": 35,
    "policy_preferences": {
      "anti_eunuch": 0.4,
      "tax_increase": -0.8,
      "relief": 0.2,
      "military_spending": -0.2,
      "centralization": -0.6
    }
  }
]
```

### 7.2 字段说明

| 字段 | 说明 |
|---|---|
| influence | 派系影响力 |
| loyalty | 对皇帝的支持 |
| hostility | 对当前政局的不满 |
| policy_preferences | 对不同政策的偏好 |

### 7.3 派系影响公式

```text
政策执行效果 = 皇帝威望 + 官僚效率 - 派系阻力 - 腐败惩罚
```

---

## 8. 大臣 Agent 设计

MVP 先做 8 位大臣：

1. 魏忠贤
2. 袁崇焕
3. 孙承宗
4. 温体仁
5. 钱谦益
6. 李标
7. 毕自严
8. 王承恩

MVP 阶段不追求完整史学还原，但要求每位大臣具备：

- 稳定性格
- 清晰派系
- 明确政策偏好
- 独特发言风格

### 8.1 `minister_agent`

```json
[
  {
    "minister_id": "wei_zhongxian",
    "name": "魏忠贤",
    "role": "司礼监秉笔太监",
    "faction": "eunuch",
    "status": "active",
    "loyalty_to_emperor": 30,
    "personal_power": 85,
    "competence": 55,
    "corruption": 90,
    "risk_tolerance": 70,
    "personality": ["阴鸷", "权力欲强", "擅长控制官僚"],
    "policy_bias": {
      "anti_eunuch": -1.0,
      "tax_increase": 0.4,
      "military_spending": 0.2,
      "relief": -0.2,
      "purge": 0.8,
      "centralization": 0.9
    },
    "speaking_style": "威胁式、恭顺表面、强调朝廷控制"
  },
  {
    "minister_id": "yuan_chonghuan",
    "name": "袁崇焕",
    "role": "辽东将领",
    "faction": "frontier_army",
    "status": "active",
    "loyalty_to_emperor": 65,
    "personal_power": 55,
    "competence": 82,
    "corruption": 25,
    "risk_tolerance": 75,
    "personality": ["强硬", "自信", "重视边防"],
    "policy_bias": {
      "anti_eunuch": 0.1,
      "tax_increase": 0.3,
      "military_spending": 1.0,
      "relief": -0.2,
      "purge": 0.1,
      "centralization": 0.3
    },
    "speaking_style": "直接、军事化、强调辽东不可失"
  },
  {
    "minister_id": "sun_chengzong",
    "name": "孙承宗",
    "role": "老臣 / 边防战略家",
    "faction": "donglin",
    "status": "active",
    "loyalty_to_emperor": 70,
    "personal_power": 50,
    "competence": 88,
    "corruption": 15,
    "risk_tolerance": 50,
    "personality": ["稳健", "老成", "重视制度"],
    "policy_bias": {
      "anti_eunuch": 0.6,
      "tax_increase": 0.1,
      "military_spending": 0.8,
      "relief": 0.3,
      "purge": -0.2,
      "centralization": 0.5
    },
    "speaking_style": "沉稳、长远、重视制度成本"
  },
  {
    "minister_id": "wen_tiren",
    "name": "温体仁",
    "role": "文官",
    "faction": "revenue_bureaucrats",
    "status": "active",
    "loyalty_to_emperor": 55,
    "personal_power": 45,
    "competence": 68,
    "corruption": 45,
    "risk_tolerance": 60,
    "personality": ["圆滑", "权谋", "善于迎合"],
    "policy_bias": {
      "anti_eunuch": 0.2,
      "tax_increase": 0.5,
      "military_spending": -0.1,
      "relief": -0.1,
      "purge": 0.4,
      "centralization": 0.6
    },
    "speaking_style": "谨慎、官样文章、善于推责"
  },
  {
    "minister_id": "qian_qianyi",
    "name": "钱谦益",
    "role": "东林文臣",
    "faction": "donglin",
    "status": "active",
    "loyalty_to_emperor": 50,
    "personal_power": 45,
    "competence": 65,
    "corruption": 30,
    "risk_tolerance": 35,
    "personality": ["清议", "重名节", "党争倾向"],
    "policy_bias": {
      "anti_eunuch": 0.9,
      "tax_increase": -0.4,
      "military_spending": 0.1,
      "relief": 0.5,
      "purge": 0.5,
      "centralization": 0.1
    },
    "speaking_style": "道德化、引用礼制、强调清流"
  },
  {
    "minister_id": "li_biao",
    "name": "李标",
    "role": "内阁大臣",
    "faction": "donglin",
    "status": "active",
    "loyalty_to_emperor": 60,
    "personal_power": 40,
    "competence": 70,
    "corruption": 25,
    "risk_tolerance": 40,
    "personality": ["谨慎", "温和", "重视朝局稳定"],
    "policy_bias": {
      "anti_eunuch": 0.6,
      "tax_increase": -0.1,
      "military_spending": 0.2,
      "relief": 0.4,
      "purge": -0.1,
      "centralization": 0.3
    },
    "speaking_style": "中庸、委婉、强调不可过急"
  },
  {
    "minister_id": "bi_ziyan",
    "name": "毕自严",
    "role": "户部官员",
    "faction": "revenue_bureaucrats",
    "status": "active",
    "loyalty_to_emperor": 58,
    "personal_power": 42,
    "competence": 80,
    "corruption": 20,
    "risk_tolerance": 45,
    "personality": ["务实", "财政理性", "重视收支"],
    "policy_bias": {
      "anti_eunuch": 0.2,
      "tax_increase": 0.7,
      "military_spending": -0.2,
      "relief": -0.2,
      "purge": 0.0,
      "centralization": 0.5
    },
    "speaking_style": "数字化、现实主义、强调国库承受力"
  },
  {
    "minister_id": "wang_chengen",
    "name": "王承恩",
    "role": "内侍",
    "faction": "eunuch",
    "status": "active",
    "loyalty_to_emperor": 90,
    "personal_power": 25,
    "competence": 55,
    "corruption": 20,
    "risk_tolerance": 45,
    "personality": ["忠诚", "谨慎", "近侍视角"],
    "policy_bias": {
      "anti_eunuch": 0.1,
      "tax_increase": 0.1,
      "military_spending": 0.1,
      "relief": 0.3,
      "purge": -0.2,
      "centralization": 0.4
    },
    "speaking_style": "恭谨、忧惧、提醒皇帝人心"
  }
]
```

---

## 9. 政策解析设计

玩家输入自然语言诏书后，系统应解析为结构化政策。

### 9.1 示例：赈灾政策

```json
{
  "policy_type": "disaster_relief",
  "target_regions": ["shaanxi"],
  "budget_silver": 200000,
  "grain_amount": 30000,
  "tax_exemption_months": 3,
  "strictness": 60
}
```

### 9.2 示例：边防加饷

```json
{
  "policy_type": "military_supply",
  "target_regions": ["liaodong", "shanhaiguan"],
  "budget_silver": 150000,
  "grain_amount": 20000,
  "recruitment_level": 40
}
```

### 9.3 示例：增税

```json
{
  "policy_type": "tax_adjustment",
  "target_regions": ["jiangnan", "huguang"],
  "tax_delta": 10,
  "duration_months": 6
}
```

### 9.4 示例：反腐整饬

```json
{
  "policy_type": "anti_corruption",
  "target_regions": ["capital", "henan"],
  "strictness": 80
}
```

### 9.5 示例：清洗派系

```json
{
  "policy_type": "faction_purge",
  "target_faction": "eunuch",
  "strictness": 90
}
```

---

## 10. 规则引擎设计

LLM 不直接决定核心数值，核心数值由规则引擎计算。  
LLM 负责：

- 政策解析
- 叙事生成
- 大臣建议表达
- 奏报与舆情文本

### 10.1 通用执行率公式

```python
def calculate_execution_rate(prestige, bureaucracy, faction_resistance, local_support, corruption, difficulty):
    score = prestige * 0.25 + bureaucracy * 0.25 + local_support * 0.2
    penalty = faction_resistance * 0.15 + corruption * 0.1 + difficulty * 0.2
    return max(5, min(95, score - penalty + 40))
```

---

## 11. 典型政策计算逻辑

### 11.1 赈灾 `disaster_relief`

效果方向：

- 降低饥荒
- 提升民心
- 降低叛乱风险
- 消耗国库
- 腐败高时会被截留

### 11.2 调粮 `grain_transfer`

效果方向：

- 目标区饥荒下降
- 源区粮仓减少
- 长距离运输有损耗
- 可缓解特定区域危机

### 11.3 增税 `tax_adjustment`

效果方向：

- 提高短期财政收入
- 提高税负
- 降低民心
- 提升叛乱压力
- 地方士绅与东林可能反弹

### 11.4 军饷与边防 `military_supply`

效果方向：

- 提升军备
- 降低辽东欠饷危机
- 国库压力上升
- 可能引发“赈灾还是军费”的资源冲突

### 11.5 反腐 `anti_corruption`

示例：

```python
def apply_anti_corruption(world, region, strictness):
    execution = calculate_execution_rate(
        world["emperor"]["prestige"],
        world["national_metrics"]["bureaucratic_efficiency"],
        45,
        region["local_elite_support"],
        region["corruption"],
        12
    )

    corruption_reduction = strictness / 20 * execution / 100
    conflict_gain = strictness / 25

    region["corruption"] = clamp(region["corruption"] - corruption_reduction)
    world["national_metrics"]["factional_conflict"] = clamp(
        world["national_metrics"]["factional_conflict"] + conflict_gain
    )

    if strictness > 80:
        world["national_metrics"]["bureaucratic_efficiency"] = clamp(
            world["national_metrics"]["bureaucratic_efficiency"] - 3
        )

    world["emperor"]["prestige"] = clamp(
        world["emperor"]["prestige"] + corruption_reduction * 0.4
    )

    return {
        "execution_rate": execution,
        "effects": {
            "corruption": -corruption_reduction,
            "factional_conflict": conflict_gain
        }
    }
```

### 11.6 清洗派系 `faction_purge`

示例：

```python
def apply_faction_purge(world, factions, policy):
    target = policy.get("target_faction")
    strictness = policy.get("strictness") or 70

    target_faction = factions[target]

    power_loss = strictness * 0.35
    hostility_gain = strictness * 0.45

    target_faction["influence"] = clamp(target_faction["influence"] - power_loss)
    target_faction["hostility"] = clamp(target_faction["hostility"] + hostility_gain)

    world["national_metrics"]["factional_conflict"] = clamp(
        world["national_metrics"]["factional_conflict"] + strictness * 0.2
    )

    world["national_metrics"]["bureaucratic_efficiency"] = clamp(
        world["national_metrics"]["bureaucratic_efficiency"] - strictness * 0.08
    )

    if target == "eunuch":
        factions["donglin"]["loyalty"] = clamp(factions["donglin"]["loyalty"] + 10)
        world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] + 5)

    if strictness > 85:
        world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] - 3)
        world["national_metrics"]["bureaucratic_efficiency"] = clamp(
            world["national_metrics"]["bureaucratic_efficiency"] - 5
        )

    return {
        "effects": {
            "target_faction_influence": -power_loss,
            "target_faction_hostility": hostility_gain,
            "factional_conflict": strictness * 0.2
        }
    }
```

---

## 12. 月度自然变化系统

除政策结果外，每回合还要进行自然世界推进。

```python
def monthly_update(world, regions):
    # 财政收支
    world["treasury"]["silver"] += world["treasury"]["monthly_income"]
    world["treasury"]["silver"] -= world["treasury"]["monthly_expense"]

    # 如国库为负
    if world["treasury"]["silver"] < 0:
        world["treasury"]["debt"] += abs(world["treasury"]["silver"])
        world["treasury"]["silver"] = 0
        world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] - 2)
        world["national_metrics"]["bureaucratic_efficiency"] = clamp(
            world["national_metrics"]["bureaucratic_efficiency"] - 1
        )

    for region in regions:
        # 灾情推动饥荒
        famine_increase = region["disaster_level"] * 0.03
        region["famine_level"] = clamp(region["famine_level"] + famine_increase)

        # 饥荒和税负推动民心下降
        support_loss = region["famine_level"] * 0.02 + region["tax_burden"] * 0.01
        region["public_support"] = clamp(region["public_support"] - support_loss)

        # 叛乱风险增长
        rebel_gain = (
            region["famine_level"] * 0.03
            + region["tax_burden"] * 0.02
            + (100 - region["public_order"]) * 0.02
            - region["military_presence"] * 0.015
        )
        region["rebel_risk"] = clamp(region["rebel_risk"] + rebel_gain)

        # 治安下降
        if region["rebel_risk"] > 60:
            region["public_order"] = clamp(region["public_order"] - 1)

    # 全国指标聚合
    world["national_metrics"]["public_support"] = average(
        [r["public_support"] for r in regions]
    )
    world["national_metrics"]["rebel_pressure"] = average(
        [r["rebel_risk"] for r in regions]
    )
    world["national_metrics"]["disaster_pressure"] = average(
        [r["disaster_level"] for r in regions]
    )
```

---

## 13. 事件触发系统

MVP 不做大事件树，而采用条件触发。

### 13.1 事件结构

```json
{
  "event_id": "shaanxi_revolt_warning",
  "title": "陕西流民聚众",
  "trigger": {
    "region_id": "shaanxi",
    "rebel_risk_gte": 70,
    "famine_level_gte": 65
  },
  "effects": {
    "public_order": -8,
    "military_presence": -3,
    "public_support": -5
  },
  "message": "陕西饥民聚众抢粮，地方官弹压不力，已见流民入山。"
}
```

### 13.2 MVP 事件列表

先做 10 个事件：

1. 陕西流民聚众
2. 陕西民变爆发
3. 辽东军饷拖欠
4. 后金袭扰辽东
5. 京师言官风潮
6. 阉党反扑
7. 东林内讧
8. 江南抗税
9. 粮价暴涨
10. 国库空虚

### 13.3 示例事件

```json
[
  {
    "event_id": "shaanxi_revolt_warning",
    "title": "陕西流民聚众",
    "trigger": {
      "region_id": "shaanxi",
      "rebel_risk_gte": 70,
      "famine_level_gte": 65
    },
    "effects": {
      "public_order": -8,
      "public_support": -5
    },
    "message": "陕西饥民聚众抢粮，地方官弹压不力。"
  },
  {
    "event_id": "shaanxi_revolt",
    "title": "陕西民变爆发",
    "trigger": {
      "region_id": "shaanxi",
      "rebel_risk_gte": 85,
      "public_order_lte": 30
    },
    "effects": {
      "public_order": -15,
      "monthly_tax_income": -10000,
      "military_presence": -5
    },
    "message": "陕西民变已成燎原之势，官军疲敝，地方州县告急。"
  },
  {
    "event_id": "liaodong_salary_arrears",
    "title": "辽东军饷拖欠",
    "trigger": {
      "region_id": "liaodong",
      "military_presence_gte": 70,
      "treasury_silver_lte": 300000
    },
    "effects": {
      "military_presence": -5,
      "defense_level": -5,
      "manchu_pressure": 5
    },
    "message": "辽东军饷久拖，边军怨言四起。"
  },
  {
    "event_id": "eunuch_counterattack",
    "title": "阉党反扑",
    "trigger": {
      "faction_id": "eunuch",
      "hostility_gte": 75,
      "influence_gte": 40
    },
    "effects": {
      "factional_conflict": 8,
      "bureaucratic_efficiency": -5,
      "prestige": -3
    },
    "message": "阉党余势未尽，暗中串联言官与内廷。"
  }
]
```

---

## 14. 大臣建议生成设计

玩家每回合可召见 1-2 位大臣。

### 14.1 输入给 LLM 的结构

```json
{
  "date": "1627年10月",
  "world_summary": {
    "treasury_silver": 1200000,
    "public_support": 45,
    "rebel_pressure": 35,
    "manchu_pressure": 70,
    "factional_conflict": 72
  },
  "region_highlights": [
    {
      "name": "陕西",
      "famine_level": 78,
      "rebel_risk": 62
    },
    {
      "name": "辽东",
      "manchu_threat": 70,
      "defense_level": 60
    }
  ],
  "minister": {
    "name": "毕自严",
    "role": "户部官员",
    "personality": ["务实", "财政理性"],
    "policy_bias": {
      "tax_increase": 0.7,
      "relief": -0.2,
      "military_spending": -0.2
    },
    "speaking_style": "数字化、现实主义、强调国库承受力"
  }
}
```

### 14.2 输出结构

```json
{
  "minister": "毕自严",
  "stance": "谨慎支持有限赈灾，但反对大规模免税",
  "advice": "陛下，陕西不可不救，然国库支绌。臣以为可拨银十万两，另令湖广调粮入陕，但不可尽免辽饷，否则辽东军饷又将无着。",
  "recommended_policies": [
    {
      "policy_type": "disaster_relief",
      "target_regions": ["shaanxi"],
      "budget_silver": 100000
    },
    {
      "policy_type": "grain_transfer",
      "source_regions": ["huguang"],
      "target_regions": ["shaanxi"],
      "grain_amount": 20000
    }
  ],
  "hidden_motivation": "避免财政崩溃，保护户部政策话语权"
}
```

说明：

- 前端默认不显示 `hidden_motivation`
- 开发调试时可保留

---

## 15. 奏报与叙事生成设计

规则引擎算完数值后，由 LLM 生成文字反馈。

### 15.1 输入结构

```json
{
  "player_edict": "朕命户部拨银二十万两赈济陕西...",
  "structured_policies": [],
  "calculated_effects": [
    {
      "region": "陕西",
      "execution_rate": 22.45,
      "effects": {
        "public_support": 3.2,
        "famine_level": -1.5,
        "rebel_risk": -3.1,
        "corruption": -3
      }
    }
  ],
  "new_world_state_summary": {
    "treasury_silver": 1000000,
    "shaanxi_public_support": 35,
    "shaanxi_rebel_risk": 59,
    "factional_conflict": 74
  }
}
```

### 15.2 输出结构

```json
{
  "court_report": "户部已奉旨拨银二十万两，然地方转运迟滞，陕西巡抚奏称赈济初见成效，但州县多有侵扣。",
  "public_reaction": "陕西百姓闻朝廷赈济，稍有安定，但粮价仍高，流民未散。",
  "faction_reaction": "户部官员私下忧虑国库日绌，边军将领则不满辽饷暂缓。",
  "summary_effects": [
    "国库减少二十万两",
    "陕西民心小幅上升",
    "陕西叛乱风险下降",
    "朝堂党争略有加剧"
  ]
}
```

---

## 16. 数据库表设计

MVP 可使用 PostgreSQL。

### 16.1 games

```sql
CREATE TABLE games (
    id UUID PRIMARY KEY,
    player_id UUID,
    title TEXT NOT NULL,
    current_turn INT NOT NULL DEFAULT 1,
    current_year INT NOT NULL,
    current_month INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 16.2 world_states

建议每回合保存一个完整快照，方便回滚与复盘。

```sql
CREATE TABLE world_states (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    turn INT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    state_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 16.3 edicts

```sql
CREATE TABLE edicts (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    turn INT NOT NULL,
    raw_text TEXT NOT NULL,
    parsed_policy_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 16.4 turn_results

```sql
CREATE TABLE turn_results (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    turn INT NOT NULL,
    calculated_effects_json JSONB NOT NULL,
    triggered_events_json JSONB,
    narrative_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 16.5 ministers

```sql
CREATE TABLE ministers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    faction TEXT,
    base_profile_json JSONB NOT NULL
);
```

### 16.6 minister_states

大臣状态应随游戏变化，例如失势、被贬、升官、死亡、遭弹劾等。

```sql
CREATE TABLE minister_states (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id),
    turn INT NOT NULL,
    minister_id TEXT REFERENCES ministers(id),
    state_json JSONB NOT NULL
);
```

---

## 17. API 设计

### 17.1 创建新游戏

```http
POST /api/games
```

返回：

```json
{
  "game_id": "uuid",
  "current_turn": 1,
  "world_state": {}
}
```

### 17.2 获取当前状态

```http
GET /api/games/{game_id}/state
```

返回：

```json
{
  "turn": 1,
  "date": {
    "year": 1627,
    "month": 10
  },
  "world_state": {},
  "regions": [],
  "factions": [],
  "available_ministers": []
}
```

### 17.3 召见大臣

```http
POST /api/games/{game_id}/consult
```

请求：

```json
{
  "minister_ids": ["bi_ziyan", "yuan_chonghuan"]
}
```

返回：

```json
{
  "consultations": [
    {
      "minister": "毕自严",
      "advice": "...",
      "recommended_policies": []
    },
    {
      "minister": "袁崇焕",
      "advice": "...",
      "recommended_policies": []
    }
  ]
}
```

### 17.4 提交诏书并推进回合

```http
POST /api/games/{game_id}/edict
```

请求：

```json
{
  "edict_text": "朕命户部拨银二十万两赈济陕西..."
}
```

返回：

```json
{
  "parsed_policy": {},
  "calculated_effects": {},
  "triggered_events": [],
  "narrative": {},
  "new_world_state": {}
}
```

---

## 18. 前端页面与组件设计

MVP 先做 5 个主要界面能力。

### 18.1 主界面

- 顶部：当前年月、国库、威望、民心、辽东压力、叛乱压力
- 左侧：区域地图
- 中间：奏报 / 事件 / 诏书输入框
- 右侧：大臣列表 / 派系状态

### 18.2 地图视图

MVP 可先使用 SVG、ECharts 或现有地图组件，不强求复杂 GIS 深度交互。

地图模式：

1. 标准地图
2. 灾情地图
3. 民心地图
4. 叛乱风险地图
5. 税负地图
6. 军事地图

表达方式：

- 主要通过颜色变化实现
- 不同模式映射不同数值区间

示例：

- 灾情 0-30：浅色
- 灾情 31-60：中色
- 灾情 61-100：深色

### 18.3 区域详情面板

点击陕西示例：

```text
陕西
灾情：85
饥荒：78
民心：32
叛乱风险：62
税负：75
腐败：72
驻军：25
粮仓：30000
赈灾需求：90000
```

### 18.4 大臣建议面板

示例：

```text
毕自严：
“陕西不可不救，然国库支绌……”

袁崇焕：
“辽东一线不可断饷，否则宁锦防线危殆。”
```

### 18.5 诏书输入框

玩家输入：

```text
朕命……
```

按钮：

```text
颁布诏书
```

系统反馈：

- 解析结果
- 执行结果
- 奏报
- 地图变化

---

## 19. 开发步骤安排

## Phase 1：纯后端文字 Demo

目标：

- 不做前端
- 用命令行跑完整回合

需要完成：

1. 初始化 `world_state.json`
2. 初始化 `regions.json`
3. 初始化 `factions.json`
4. 初始化 `ministers.json`
5. 编写 `policy_parser.py`
6. 编写 `rule_engine.py`
7. 编写 `monthly_update.py`
8. 编写 `event_engine.py`
9. 编写 `narrative_generator.py`
10. 用 CLI 输入诏书并输出结果

目录结构建议：

```text
chongzhen_mvp/
  backend/
    app/
      main.py
      game/
        state.py
        rule_engine.py
        policy_parser.py
        event_engine.py
        monthly_update.py
        narrative_generator.py
      data/
        initial_world.json
        initial_regions.json
        initial_factions.json
        ministers.json
        events.json
```

完成标准：

- 玩家输入一句诏书
- 系统能解析
- 系统能计算
- 系统能更新状态
- 系统能输出奏报

## Phase 2：FastAPI 服务化

目标：

- 把文字 Demo 变成 API

需要完成：

1. 创建 FastAPI 项目
2. 实现 `/games`
3. 实现 `/state`
4. 实现 `/consult`
5. 实现 `/edict`
6. 接入 SQLite / PostgreSQL
7. 保存每回合快照

完成标准：

- 可通过 Postman 完成一整局游戏流程

## Phase 3：前端 MVP

目标：

- 做一个可玩的网页版本

需要完成：

1. React / Next.js 初始化
2. 首页创建新游戏
3. 主界面展示全局状态
4. 区域卡片显示地图数据
5. 大臣建议按钮
6. 诏书输入框
7. 回合结果展示
8. 简单颜色地图

完成标准：

- 玩家可以在浏览器中玩 10 个回合

## Phase 4：AI Agent 强化

目标：

- 让大臣更像独立人物

需要完成：

1. 每个大臣拥有 memory
2. 大臣记住玩家上一回合政策
3. 大臣支持或反对玩家
4. 派系关系影响发言
5. 大臣会提出个人诉求，如升官、弹劾、推责等

新增数据：

```json
{
  "minister_memory": [
    {
      "turn": 3,
      "event": "皇帝削弱阉党",
      "attitude_change": {
        "wei_zhongxian": -20,
        "qian_qianyi": 10
      }
    }
  ]
}
```

## Phase 5：地图与可视化强化

目标：

- 让玩家通过地图理解局势

需要完成：

1. SVG 或现有区域地图
2. 区域颜色随指标变化
3. 鼠标悬停显示 tooltip
4. 点击显示详情
5. 支持灾情 / 民心 / 叛乱 / 税负 / 军事切换

---

## 20. MVP 成功标准

不要用“内容多不多”判断成功，而用以下标准判断：

1. 玩家自然语言诏书能被稳定解析
2. 每条政策都有明确代价
3. 世界状态会连续变化
4. 大臣建议会受到派系和性格影响
5. 玩家能感到取舍，而不是单纯寻找最优解
6. 每回合结果可解释、可复盘
