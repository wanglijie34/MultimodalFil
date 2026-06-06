import copy

def clamp(value, min_val=0, max_val=100):
    return max(min_val, min(max_val, value))

def average(values):
    return sum(values) / len(values) if values else 0

class RuleEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

    def calculate_execution_rate(self, prestige, bureaucracy, faction_resistance, local_support, corruption, difficulty):
        # Deprecated: Now handled by CourtFlowEngine. Retained as fallback.
        score = prestige * 0.25 + bureaucracy * 0.25 + local_support * 0.2
        penalty = faction_resistance * 0.15 + corruption * 0.1 + difficulty * 0.2
        return max(5, min(95, score - penalty + 40))

    def apply_policies(self, policies: list[dict], flow_results: list[dict] = None) -> list[dict]:
        world = self.state_manager.world_state
        results = []
        
        for i, policy in enumerate(policies):
            ptype = policy.get("policy_type")
            result = {"policy": policy, "effects": {}}
            flow_result = flow_results[i] if flow_results and i < len(flow_results) else {}
            
            if "political_backlash" in flow_result:
                bl = flow_result["political_backlash"]
                world["national_metrics"]["factional_conflict"] = clamp(world["national_metrics"]["factional_conflict"] + bl * 0.1)
                world["national_metrics"]["bureaucratic_efficiency"] = clamp(world["national_metrics"]["bureaucratic_efficiency"] - bl * 0.05)
                world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] - bl * 0.02)
                
            if flow_result.get("civil_trust_drop"):
                if "civil_trust" not in world["emperor"]:
                    world["emperor"]["civil_trust"] = 50
                world["emperor"]["civil_trust"] = clamp(world["emperor"]["civil_trust"] - 15)
                world["national_metrics"]["bureaucratic_efficiency"] = clamp(world["national_metrics"]["bureaucratic_efficiency"] - 20)

            if flow_result.get("public_burden_shift"):
                targets = policy.get("target_regions", [])
                for tid in targets:
                    region = self.state_manager.get_region(tid)
                    if region:
                        region["public_support"] = clamp(region["public_support"] - 20)
                        region["rebel_risk"] = clamp(region["rebel_risk"] + 25)

            
            if ptype == "disaster_relief":
                result = self._apply_disaster_relief(world, policy, flow_result)
            elif ptype == "grain_transfer":
                result = self._apply_grain_transfer(world, policy, flow_result)
            elif ptype == "tax_adjustment":
                result = self._apply_tax_adjustment(world, policy, flow_result)
            elif ptype == "military_supply":
                result = self._apply_military_supply(world, policy, flow_result)
            elif ptype == "anti_corruption":
                result = self._apply_anti_corruption(world, policy, flow_result)
            elif ptype == "faction_purge":
                result = self._apply_faction_purge(world, policy, flow_result)
            else:
                result["message"] = f"Unknown policy type: {ptype}"
                
            results.append(result)
            
        return results

    def _apply_disaster_relief(self, world, policy, flow_result):
        budget = policy.get("budget_silver", 0)
        if budget > world["treasury"]["silver"]:
            budget = world["treasury"]["silver"]
            
        world["treasury"]["silver"] -= budget
        
        targets = policy.get("target_regions", [])
        if not targets:
            return {"policy": policy, "effects": {"error": "No target regions specified"}}
            
        budget_per_region = budget / len(targets)
        regional_effects = []
        
        for region_id in targets:
            region = self.state_manager.get_region(region_id)
            if not region: continue
            
            exec_rate = flow_result.get("execution_rate", 50)
            corr_loss = flow_result.get("corruption_loss", region["corruption"])
            
            effective_budget = budget_per_region * (exec_rate / 100.0) * ((100 - corr_loss) / 100.0)
            
            famine_reduction = (effective_budget / 5000) * 2
            support_gain = (effective_budget / 5000) * 1.5
            
            region["famine_level"] = clamp(region["famine_level"] - famine_reduction)
            region["public_support"] = clamp(region["public_support"] + support_gain)
            region["rebel_risk"] = clamp(region["rebel_risk"] - support_gain * 0.8)
            
            regional_effects.append({
                "region": region["name"],
                "execution_rate": exec_rate,
                "famine_level_change": -famine_reduction,
                "public_support_change": support_gain,
                "budget_spent": budget_per_region,
                "effective_budget": effective_budget
            })
            
        return {"policy": policy, "treasury_delta": -budget, "regional_effects": regional_effects}

    def _apply_grain_transfer(self, world, policy, flow_result):
        # Implementation of grain transfer
        amount = policy.get("grain_amount", 0)
        sources = policy.get("source_regions", [])
        targets = policy.get("target_regions", [])
        
        if not sources or not targets:
            return {"policy": policy, "effects": {"error": "Source or target missing"}}
            
        amount_per_source = amount / len(sources)
        amount_per_target = amount / len(targets)
        
        effects = []
        actual_total = 0
        
        for sid in sources:
            s_region = self.state_manager.get_region(sid)
            if s_region and s_region["grain_storage"] > 0:
                taken = min(amount_per_source, s_region["grain_storage"])
                s_region["grain_storage"] -= taken
                s_region["public_support"] = clamp(s_region["public_support"] - (taken/10000))
                actual_total += taken
                effects.append({"region": s_region["name"], "grain_storage_change": -taken})
                
        # Transport loss + corruption
        corr_loss = flow_result.get("corruption_loss", 20)
        actual_total = actual_total * (1 - (corr_loss / 100.0)) * 0.7  # 30% base transport loss + corruption
        
        for tid in targets:
            t_region = self.state_manager.get_region(tid)
            if t_region:
                received = actual_total / len(targets)
                t_region["grain_storage"] += received
                t_region["famine_level"] = clamp(t_region["famine_level"] - (received/5000))
                effects.append({"region": t_region["name"], "grain_storage_change": received, "famine_level_change": -(received/5000)})
                
        return {"policy": policy, "regional_effects": effects}

    def _apply_tax_adjustment(self, world, policy, flow_result):
        targets = policy.get("target_regions", [])
        delta = policy.get("tax_delta", 0)
        effects = []
        
        for tid in targets:
            region = self.state_manager.get_region(tid)
            if region:
                exec_rate = flow_result.get("execution_rate", 50)
                region["tax_burden"] = clamp(region["tax_burden"] + delta)
                actual_income = (delta * 500) * (exec_rate / 100.0)
                region["monthly_tax_income"] += actual_income
                region["public_support"] = clamp(region["public_support"] - (delta * 0.5))
                if delta > 0:
                    region["rebel_risk"] = clamp(region["rebel_risk"] + delta)
                effects.append({
                    "region": region["name"],
                    "tax_burden_change": delta,
                    "public_support_change": -(delta * 0.5)
                })
        return {"policy": policy, "regional_effects": effects}

    def _apply_military_supply(self, world, policy, flow_result):
        budget = policy.get("budget_silver", 0)
        if budget > world["treasury"]["silver"]:
            budget = world["treasury"]["silver"]
            
        world["treasury"]["silver"] -= budget
        targets = policy.get("target_regions", [])
        budget_per_region = budget / max(1, len(targets))
        
        effects = []
        for tid in targets:
            region = self.state_manager.get_region(tid)
            if region:
                exec_rate = flow_result.get("execution_rate", 50)
                corr_loss = flow_result.get("corruption_loss", region["corruption"])
                effective_budget = budget_per_region * (exec_rate / 100.0) * ((100 - corr_loss) / 100.0)
                
                region["military_presence"] = clamp(region["military_presence"] + (effective_budget / 10000))
                region["defense_level"] = clamp(region["defense_level"] + (effective_budget / 8000))
                if tid == "liaodong":
                    world["national_metrics"]["manchu_pressure"] = clamp(world["national_metrics"]["manchu_pressure"] - (effective_budget / 15000))
                effects.append({
                    "region": region["name"],
                    "military_presence_change": effective_budget / 10000
                })
                
        return {"policy": policy, "treasury_delta": -budget, "regional_effects": effects}

    def _apply_anti_corruption(self, world, policy, flow_result):
        targets = policy.get("target_regions", [])
        strictness = policy.get("strictness", 50)
        effects = []
        
        for tid in targets:
            region = self.state_manager.get_region(tid)
            if region:
                exec_rate = flow_result.get("execution_rate", 50)
                
                corr_red = (strictness / 20) * (exec_rate / 100)
                region["corruption"] = clamp(region["corruption"] - corr_red)
                
                # Push back
                world["national_metrics"]["factional_conflict"] = clamp(world["national_metrics"]["factional_conflict"] + (strictness/25))
                effects.append({
                    "region": region["name"],
                    "corruption_change": -corr_red
                })
                
        world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] + (strictness/20))
        return {"policy": policy, "regional_effects": effects}

    def _apply_faction_purge(self, world, policy, flow_result):
        target = policy.get("target_faction")
        strictness = policy.get("strictness", 70)
        
        faction = self.state_manager.get_faction(target)
        if not faction:
            return {"policy": policy, "error": "Faction not found"}
            
        exec_rate = flow_result.get("execution_rate", 50)
        power_loss = strictness * 0.35 * (exec_rate / 100.0)
        faction["influence"] = clamp(faction["influence"] - power_loss)
        faction["hostility"] = clamp(faction["hostility"] + (strictness * 0.45))
        
        world["national_metrics"]["factional_conflict"] = clamp(world["national_metrics"]["factional_conflict"] + strictness * 0.2)
        world["national_metrics"]["bureaucratic_efficiency"] = clamp(world["national_metrics"]["bureaucratic_efficiency"] - strictness * 0.08)
        
        return {
            "policy": policy,
            "effects": {
                "target_faction": faction["name"],
                "influence_change": -power_loss
            }
        }
