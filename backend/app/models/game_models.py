# -*- coding: utf-8 -*-
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AdviseRequest(BaseModel):
    minister_ids: List[str]

class EdictRequest(BaseModel):
    edict_text: str

class SimulationResult(BaseModel):
    parsed_policy: List[Dict[str, Any]] = Field(default_factory=list)
    calculated_effects: List[Dict[str, Any]] = Field(default_factory=list)
    triggered_events: List[Dict[str, Any]] = Field(default_factory=list)
    narrative: Dict[str, Any] = Field(default_factory=dict)
    new_world_state: Dict[str, Any] = Field(default_factory=dict)

