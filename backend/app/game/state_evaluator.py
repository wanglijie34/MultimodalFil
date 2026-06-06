from typing import List, Dict, Any

class StateEvaluator:
    @staticmethod
    def evaluate_all(game_state_manager) -> List[str]:
        """Runs the buff/debuff evaluation logic and updates active_states"""
        world = game_state_manager.world_state
        regions = game_state_manager.regions
        factions = game_state_manager.factions
        emperor = world.get("emperor", {})
        metrics = world.get("national_metrics", {})
        
        active_states = []
        
        prestige = emperor.get("prestige", 50)
        suspicion = emperor.get("suspicion", 50)
        stress = emperor.get("stress", 50)
        zhongzhi_count = emperor.get("zhongzhi_count_this_turn", 0)
        ignored_memorials = metrics.get("ignored_memorials", 0)
        corruption = metrics.get("corruption", 50)
        faction_conflict = metrics.get("factional_conflict", 50)
        manchu_pressure = metrics.get("manchu_pressure", 50)
        
        # 1. Emperor states
        if prestige > 80:
            active_states.append("雷霆万钧")
        elif prestige < 40:
            active_states.append("政令不出乾清宫")
            
        if zhongzhi_count >= 3:
            active_states.append("中旨抗药性")
            
        if suspicion > 80 or stress >= 100:
            active_states.append("深宫疑云")
            
        # 2. Faction states
        donglin_share = next((f.get("influence", 0) for f in factions if f["faction_id"] == "jiangnan"), 50)
        highest_faction_share = max([f.get("influence", 0) for f in factions] + [0])
        if highest_faction_share >= 60 and prestige < 40:
            active_states.append("门户之见")
            
        if faction_conflict > 80:
            active_states.append("弹劾狂热")
            
        # 3. Treasury states
        jiangnan = game_state_manager.get_region("jiangnan")
        if jiangnan and donglin_share > 50 and jiangnan.get("tax_burden", 0) > 40:
            active_states.append("南财北调阻断")
            jiangnan["tax_efficiency"] = 40 # Drops 60%
        else:
            if jiangnan: jiangnan["tax_efficiency"] = 100
            
        if corruption > 80:
            active_states.append("层层剥皮")
            
        if ignored_memorials > 5:
            active_states.append("积案如山")
            
        # 4. Military/Region states
        if manchu_pressure > 80:
            active_states.append("长城锁死")
            
        liao_tax = world.get("policy_flags", {}).get("liao_tax_increased", False)
        shaanxi = game_state_manager.get_region("shaanxi")
        if shaanxi and shaanxi.get("disaster_level", 0) > 80 and liao_tax:
            active_states.append("流贼狂飙")
            for r in regions:
                if r["region_id"] in ["shaanxi", "shanxi", "henan"]:
                    r["rebel_conversion_rate"] = 2.5
        else:
            for r in regions:
                r["rebel_conversion_rate"] = 1.0

        world["active_states"] = active_states
        return active_states
