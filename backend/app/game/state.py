import json
import os
from typing import Dict, List, Any

class GameStateManager:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to the data directory in the current module
            self.data_dir = os.path.join(os.path.dirname(__file__), "data")
        else:
            self.data_dir = data_dir
            
        self.world_state: Dict[str, Any] = {}
        self.regions: List[Dict[str, Any]] = []
        self.factions: List[Dict[str, Any]] = []
        self.ministers: List[Dict[str, Any]] = []
        self.events: List[Dict[str, Any]] = []
        self.institutions: List[Dict[str, Any]] = []

    def load_initial_state(self):
        self.world_state = self._load_json("initial_world.json")
        self.regions = self._load_json("initial_regions.json")
        self.factions = self._load_json("initial_factions.json")
        self.ministers = self._load_json("initial_ministers.json")
        self.events = self._load_json("initial_events.json")
        self.institutions = self._load_json("initial_institutions.json")

    def _load_json(self, filename: str) -> Any:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_game(self, save_name: str) -> bool:
        save_dir = os.path.join(os.path.dirname(__file__), "saves", save_name)
        os.makedirs(save_dir, exist_ok=True)
        
        def save_part(filename, data):
            filepath = os.path.join(save_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        save_part("world_state.json", self.world_state)
        save_part("regions.json", self.regions)
        save_part("factions.json", self.factions)
        save_part("ministers.json", self.ministers)
        save_part("events.json", self.events)
        save_part("institutions.json", self.institutions)
        return True

    def load_game(self, save_name: str) -> bool:
        save_dir = os.path.join(os.path.dirname(__file__), "saves", save_name)
        if not os.path.exists(save_dir):
            return False
            
        def load_part(filename, default):
            filepath = os.path.join(save_dir, filename)
            if not os.path.exists(filepath): return default
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
                
        self.world_state = load_part("world_state.json", {})
        self.regions = load_part("regions.json", [])
        self.factions = load_part("factions.json", [])
        self.ministers = load_part("ministers.json", [])
        self.events = load_part("events.json", [])
        self.institutions = load_part("institutions.json", [])
        return True

    def get_saves(self) -> List[str]:
        save_dir = os.path.join(os.path.dirname(__file__), "saves")
        if not os.path.exists(save_dir):
            return []
        saves = []
        for d in os.listdir(save_dir):
            if os.path.isdir(os.path.join(save_dir, d)):
                saves.append(d)
        return saves

    def get_region(self, region_id: str) -> Dict[str, Any]:
        for r in self.regions:
            if r["region_id"] == region_id:
                return r
        return None

    def get_faction(self, faction_id: str) -> Dict[str, Any]:
        for f in self.factions:
            if f["faction_id"] == faction_id:
                return f
        return None

    def get_minister(self, minister_id: str) -> Dict[str, Any]:
        for m in self.ministers:
            if m["minister_id"] == minister_id:
                return m
        return None

    def get_institution(self, institution_id: str) -> Dict[str, Any]:
        for i in self.institutions:
            if i["institution_id"] == institution_id:
                return i
        return None
