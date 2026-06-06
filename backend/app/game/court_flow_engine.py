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
            
            # 【威望修正体系】
            if emperor_prestige > 80:
                prestige_mult_exec = 1.2
                prestige_mult_delay = 0.8
            elif emperor_prestige >= 40:
                prestige_mult_exec = 1.0
                prestige_mult_delay = 1.0
            else:
                prestige_mult_exec = 0.4
                prestige_mult_delay = 1.8
                # 威望低下时，文官更依附派系，敌意翻倍
                avg_hostility = min(100, avg_hostility * 2)

            is_zhongzhi = policy.get("is_zhongzhi", False)
            enforcement_flag = policy.get("enforcement_flag", False)
            active_states = world.get("active_states", [])
            
            if is_zhongzhi:
                # Update counter
                world["emperor"]["zhongzhi_count_this_turn"] = world["emperor"].get("zhongzhi_count_this_turn", 0) + 1
                
            # 【中旨抗药性】
            if "中旨抗药性" in active_states and not is_zhongzhi:
                results.append({
                    "policy": policy,
                    "lead_institutions": [inst["name"] for inst in institutions],
                    "stages": ["内阁票拟审批", "通政司罢工", "原地死锁"],
                    "final_status": "blocked",
                    "delay_days": 99,
                    "execution_rate": 0,
                    "corruption_loss": 0,
                    "distortion_level": 100,
                    "political_backlash": 0,
                    "notes": "【中旨抗药性】触发！百官伏阙请愿，常规政令全面死锁，无法下达！"
                })
                continue
            
            civil_trust_drop = False
            public_burden_shift = False

            if is_zhongzhi:
                if enforcement_flag:
                    # 维度三：厂卫强压
                    execution_rate = 80
                    corruption_loss = 0
                    delay_days = 0
                    political_backlash = 90
                    distortion_level = 0
                    civil_trust_drop = True
                    stages = ["绕过外朝 (发中旨)", "厂卫空降 (暴力督办)", "地方见血落地"]
                    notes = "缇骑四出，先斩后奏，政令瞬间落地！(天下文官寒蝉效应触发，忠诚度暴跌)"
                else:
                    # 维度一、二：文官软抵抗与威望乘区
                    base_delay = 2 # 中旨免除中央程序，基础耗时极短
                    friction_delay = ((100 - avg_efficiency) * 0.3 + avg_hostility * 0.5)
                    delay_days = int(base_delay + friction_delay * prestige_mult_delay)
                    
                    base_exec = (avg_efficiency * 0.6) + (avg_loyalty * 0.4)
                    execution_rate = clamp(base_exec * prestige_mult_exec, 5, 95)
                    
                    corruption_loss = avg_corruption * 0.5
                    distortion_level = avg_corruption * 0.3
                    political_backlash = avg_hostility * 0.6
                    
                    if emperor_prestige < 40 and avg_hostility > 40:
                        delay_days = max(delay_days, 60) # 至少拖延2个月
                        execution_rate = min(execution_rate, 25) # 最高25%
                        corruption_loss = min(100, corruption_loss + 40)
                        distortion_level = 90
                        public_burden_shift = True
                        stages = ["绕过外朝 (发中旨)", "地方消极怠工 (软抵抗)", "流于形式 (政策变异)"]
                        notes = f"皇帝威望扫地(乘数{prestige_mult_exec})，中旨下达后地方阳奉阴违，时延被恶意拖至 {delay_days} 天！胥吏借机敲诈勒索，民怨沸腾！"
                    else:
                        stages = ["绕过外朝 (发中旨)", "地方奉诏落地"]
                        notes = f"中旨越过外朝直达地方(威望修正{prestige_mult_exec})，时延约 {delay_days} 天，引发外朝部分非议。"
            else:
                # 常规内阁流程
                base_delay = 5
                friction_delay = ((100 - avg_efficiency) * 0.2 + avg_hostility * 0.3)
                if has_secret_police:
                    friction_delay = max(0, friction_delay - 15)
                delay_days = int(base_delay + friction_delay * prestige_mult_delay)
                delay_days = clamp(delay_days, 1, 99)

                base_exec = (avg_efficiency * 0.5) + (avg_loyalty * 0.3) + (bureaucracy * 0.2)
                if has_secret_police:
                    base_exec += 15
                exec_penalty = (avg_corruption * 0.3) + (avg_hostility * 0.2)
                
                execution_rate = (base_exec - exec_penalty) * prestige_mult_exec
                execution_rate = clamp(execution_rate, 5, 95)
                
                corruption_loss = avg_corruption * 0.6
                if has_secret_police:
                    corruption_loss *= 0.5
                corruption_loss = clamp(corruption_loss, 0, 80)
                
                # 【层层剥皮】
                if "层层剥皮" in active_states and ptype in ["disaster_relief", "grain_transfer"]:
                    corruption_loss = 80
                    notes_prefix = "【层层剥皮】触发，"
                else:
                    notes_prefix = ""
                
                # 【门户之见】
                target_faction = policy.get("target_faction")
                if "门户之见" in active_states and target_faction:
                    delay_days = 99
                    execution_rate = min(execution_rate, 20)
                    notes_prefix += "【门户之见】发作，"
                
                political_backlash = avg_hostility * 0.4
                if has_secret_police:
                    political_backlash += 30
                political_backlash = clamp(political_backlash, 0, 100)
                
                distortion_level = (avg_corruption * 0.4) + ((100 - avg_loyalty) * 0.4)
                distortion_level = clamp(distortion_level, 0, 100)

                stages = ["内阁票拟审批", "六部核实下发", "地方落地执行"]
                if has_secret_police:
                    stages.insert(1, "司礼监批红/督办")
                notes = f"{notes_prefix}常规政令流转 (威望乘区: 速度x{prestige_mult_delay}, 效能x{prestige_mult_exec})，历经 {delay_days} 天落地。"

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
                "civil_trust_drop": civil_trust_drop,
                "public_burden_shift": public_burden_shift,
                "notes": notes
            })

        return results
