from app.game.rule_engine import clamp, average

class MonthlyUpdateEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

    def process_month(self) -> dict:
        world = self.state_manager.world_state
        regions = self.state_manager.regions
        
        updates = {"treasury": {}, "regions": {}}
        
        # Advance Date
        month = world["date"]["month"]
        year = world["date"]["year"]
        month += 1
        if month > 12:
            month = 1
            year += 1
        world["date"]["month"] = month
        world["date"]["year"] = year
        world["turn"] += 1
        
        # Treasury Processing
        total_income = sum([r.get("monthly_tax_income", 0) for r in regions])
        world["treasury"]["monthly_income"] = total_income
        
        world["treasury"]["silver"] += world["treasury"]["monthly_income"]
        world["treasury"]["silver"] -= world["treasury"]["monthly_expense"]

        if world["treasury"]["silver"] < 0:
            world["treasury"]["debt"] += abs(world["treasury"]["silver"])
            world["treasury"]["silver"] = 0
            world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] - 2)
            world["national_metrics"]["bureaucratic_efficiency"] = clamp(world["national_metrics"]["bureaucratic_efficiency"] - 1)
            updates["treasury"]["warning"] = "国库亏空，增加债务，百官懈怠！"

        updates["treasury"]["silver"] = world["treasury"]["silver"]
            
        for region in regions:
            famine_increase = region["disaster_level"] * 0.03
            region["famine_level"] = clamp(region["famine_level"] + famine_increase)
            
            support_loss = region["famine_level"] * 0.02 + region["tax_burden"] * 0.01
            region["public_support"] = clamp(region["public_support"] - support_loss)
            
            rebel_gain = (
                region["famine_level"] * 0.03
                + region["tax_burden"] * 0.02
                + (100 - region["public_order"]) * 0.02
                - region["military_presence"] * 0.015
            )
            region["rebel_risk"] = clamp(region["rebel_risk"] + rebel_gain)
            
            if region["rebel_risk"] > 60:
                region["public_order"] = clamp(region["public_order"] - 1)
                
            updates["regions"][region["name"]] = {
                "famine": region["famine_level"],
                "rebel_risk": region["rebel_risk"],
                "public_support": region["public_support"]
            }
            
        # Aggregate National Metrics
        world["national_metrics"]["public_support"] = average([r["public_support"] for r in regions])
        world["national_metrics"]["rebel_pressure"] = average([r["rebel_risk"] for r in regions])
        world["national_metrics"]["disaster_pressure"] = average([r["disaster_level"] for r in regions])
        
        return updates
