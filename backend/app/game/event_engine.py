from app.game.rule_engine import clamp

class EventEngine:
    def __init__(self, state_manager):
        self.state_manager = state_manager

    def evaluate_events(self) -> list[dict]:
        triggered = []
        world = self.state_manager.world_state
        regions = self.state_manager.regions
        factions = self.state_manager.factions
        
        for event in self.state_manager.events:
            if self._check_trigger(event["trigger"], world, regions, factions):
                self._apply_event_effects(event["effects"], event["trigger"], world, regions, factions)
                triggered.append(event)
                
        return triggered

    def _check_trigger(self, trigger, world, regions, factions) -> bool:
        if "region_id" in trigger:
            region = next((r for r in regions if r["region_id"] == trigger["region_id"]), None)
            if not region: return False
            for k, v in trigger.items():
                if k == "region_id": continue
                if k.endswith("_gte") and region.get(k.replace("_gte", ""), 0) < v: return False
                if k.endswith("_lte") and region.get(k.replace("_lte", ""), 0) > v: return False
        elif "faction_id" in trigger:
            faction = next((f for f in factions if f["faction_id"] == trigger["faction_id"]), None)
            if not faction: return False
            for k, v in trigger.items():
                if k == "faction_id": continue
                if k.endswith("_gte") and faction.get(k.replace("_gte", ""), 0) < v: return False
                if k.endswith("_lte") and faction.get(k.replace("_lte", ""), 0) > v: return False
        else:
            # Global
            for k, v in trigger.items():
                val = world["national_metrics"].get(k.replace("_gte", "").replace("_lte", ""))
                if val is None:
                    # check world treasury etc
                    if k == "treasury_silver_lte": val = world["treasury"]["silver"]
                    elif k == "prestige_lte": val = world["emperor"]["prestige"]
                
                if val is not None:
                    if k.endswith("_gte") and val < v: return False
                    if k.endswith("_lte") and val > v: return False
                    
        return True

    def _apply_event_effects(self, effects, trigger, world, regions, factions):
        if "region_id" in trigger:
            region = next((r for r in regions if r["region_id"] == trigger["region_id"]), None)
            if region:
                for k, v in effects.items():
                    if k in region:
                        region[k] = clamp(region[k] + v) if k not in ["population", "tax_base", "monthly_tax_income"] else max(0, region[k] + v)
        elif "faction_id" in trigger:
            faction = next((f for f in factions if f["faction_id"] == trigger["faction_id"]), None)
            if faction:
                for k, v in effects.items():
                    if k in faction:
                        faction[k] = clamp(faction[k] + v)
                    elif k.startswith("faction_"):
                        key = k.replace("faction_", "")
                        if key in faction: faction[key] = clamp(faction[key] + v)
        
        # Apply global effects
        for k, v in effects.items():
            if k in world["national_metrics"]:
                world["national_metrics"][k] = clamp(world["national_metrics"][k] + v)
            elif k == "prestige":
                world["emperor"]["prestige"] = clamp(world["emperor"]["prestige"] + v)
