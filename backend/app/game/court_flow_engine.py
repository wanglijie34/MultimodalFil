import copy

def clamp(value, min_val=0, max_val=100):
    return max(min_val, min(max_val, value))

class CourtFlowEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

        # Default fallback institutions
        self.default_institutions = ["cabinet", "ministry_personnel"]

        # Policy type to institution mapping
        self.policy_routing = {
            "disaster_relief": ["ministry_revenue", "ministry_works", "censorate"],
            "grain_transfer": ["ministry_revenue", "ministry_war"],
            "tax_adjustment": ["ministry_revenue", "cabinet", "six_bureaus_censors"],
            "military_supply": ["ministry_war", "chief_military_commission", "ministry_revenue"],
            "anti_corruption": ["censorate", "ministry_justice", "jinyiwei"],
            "faction_purge": ["grand_secretariat_eunuch", "eastern_depot", "ministry_justice"],
            "appoint_minister": ["ministry_personnel", "cabinet"],
            "remove_minister": ["censorate", "ministry_personnel"]
        }

    def process_policies(self, policies: list[dict]) -> list[dict]:
        results = []
        world = self.state_manager.world_state

        for policy in policies:
            ptype = policy.get("policy_type")
            lead_inst_ids = self.policy_routing.get(ptype, self.default_institutions)
            
            # Fetch institution data
            institutions = []
            for inst_id in lead_inst_ids:
                inst = self.state_manager.get_institution(inst_id)
                if inst:
                    institutions.append(inst)
            
            if not institutions:
                # If for some reason we have no institutions, provide 100% execution
                results.append({
                    "policy": policy,
                    "lead_institutions": [],
                    "stages": ["skipped"],
                    "final_status": "pass",
                    "delay_days": 0,
                    "execution_rate": 100,
                    "corruption_loss": 0,
                    "distortion_level": 0,
                    "political_backlash": 0,
                    "notes": "No valid institutions found. Bypassed flow."
                })
                continue

            # Calculate metrics based on involved institutions
            avg_efficiency = sum(inst["efficiency"] for inst in institutions) / len(institutions)
            avg_corruption = sum(inst["corruption"] for inst in institutions) / len(institutions)
            avg_loyalty = sum(inst["loyalty"] for inst in institutions) / len(institutions)
            avg_hostility = sum(inst["hostility"] for inst in institutions) / len(institutions)

            # Check for Eunuch/Secret Police involvement
            has_secret_police = any(inst["type"] == "secret_police" for inst in institutions)
            
            # Base variables
            emperor_prestige = world["emperor"]["prestige"]
            bureaucracy = world["national_metrics"]["bureaucratic_efficiency"]
            
            # 1. Calculate Execution Rate
            # 皇帝威望、机构效率为主导，腐败、敌意扣分
            exec_score = (emperor_prestige * 0.3) + (avg_efficiency * 0.3) + (avg_loyalty * 0.2) + (bureaucracy * 0.2)
            exec_penalty = (avg_corruption * 0.3) + (avg_hostility * 0.2)
            
            # 厂卫高压可以强行提高执行率，但会加剧反弹
            if has_secret_police:
                exec_score += 15
                
            execution_rate = exec_score - exec_penalty
            execution_rate = clamp(execution_rate, 5, 95)
            
            # 2. Calculate Corruption Loss (Percentage of funds/grain lost)
            corruption_loss = avg_corruption * 0.6
            if has_secret_police:
                corruption_loss *= 0.5 # 厂卫可以震慑贪腐，但也可能中饱私囊，这里假设震慑作用更大
            corruption_loss = clamp(corruption_loss, 0, 80)
            
            # 3. Calculate Delay Days
            # 效率越低、敌意越高，拖延越久
            delay_days = int((100 - avg_efficiency) * 0.2 + avg_hostility * 0.3)
            if has_secret_police:
                delay_days = max(1, delay_days - 10)
            delay_days = clamp(delay_days, 1, 60)
            
            # 4. Calculate Political Backlash
            # 厂卫、高敌意部门牵头，会引发政治反弹
            political_backlash = avg_hostility * 0.4
            if has_secret_police:
                political_backlash += 30
            political_backlash = clamp(political_backlash, 0, 100)
            
            # 5. Calculate Distortion Level (政策变形程度)
            distortion_level = (avg_corruption * 0.4) + ((100 - avg_loyalty) * 0.4)
            distortion_level = clamp(distortion_level, 0, 100)

            stages = ["cabinet_review", "ministry_execution"]
            if has_secret_police:
                stages.insert(1, "eunuch_approval")
                
            results.append({
                "policy": policy,
                "lead_institutions": [inst["name"] for inst in institutions],
                "stages": stages,
                "final_status": "pass",
                "delay_days": delay_days,
                "execution_rate": execution_rate,
                "corruption_loss": corruption_loss,
                "distortion_level": distortion_level,
                "political_backlash": political_backlash,
                "notes": f"经过 {', '.join([inst['name'] for inst in institutions])} 的处理。"
            })

        return results
