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

    def load_initial_state(self):
        self.world_state = self._load_json("initial_world.json")
        self.regions = self._load_json("initial_regions.json")
        self.factions = self._load_json("initial_factions.json")
        self.ministers = self._load_json("initial_ministers.json")
        self.events = self._load_json("initial_events.json")

    def _load_json(self, filename: str) -> Any:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

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
