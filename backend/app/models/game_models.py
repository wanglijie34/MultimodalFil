# -*- coding: utf-8 -*-
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AdviseRequest(BaseModel):
    minister_ids: List[str]

class ConsultationResult(BaseModel):
    minister_id: str
    minister_name: str
    stance: str
    recommended_policies: List[str]
    warning_tags: List[str]
    content: str

class EdictRequest(BaseModel):
    edict_text: str

class ParseEdictResponse(BaseModel):
    parsed_policy: List[Dict[str, Any]]

class ExecuteEdictRequest(BaseModel):
    edict_text: str
    parsed_policy: List[Dict[str, Any]]

class SimulationResult(BaseModel):
    parsed_policy: List[Dict[str, Any]] = Field(default_factory=list)
    court_flow_results: List[Dict[str, Any]] = Field(default_factory=list)
    calculated_effects: List[Dict[str, Any]] = Field(default_factory=list)
    triggered_events: List[Dict[str, Any]] = Field(default_factory=list)
    narrative: Dict[str, Any] = Field(default_factory=dict)
    new_world_state: Dict[str, Any] = Field(default_factory=dict)
    regions: List[Dict[str, Any]] = Field(default_factory=list)
    factions: List[Dict[str, Any]] = Field(default_factory=list)
    institutions: List[Dict[str, Any]] = Field(default_factory=list)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    minister_id: str
    user_message: str
    history: List[ChatMessage] = Field(default_factory=list)

class ChatResponse(BaseModel):
    reply: str

class AppointRequest(BaseModel):
    minister_id: str
    target_role: str
    target_department: str = ""

class DismissRequest(BaseModel):
    minister_id: str

class SaveGameRequest(BaseModel):
    save_name: str

class LoadGameRequest(BaseModel):
    save_name: str

class RecruitRequest(BaseModel):
    cost: int = 100000 # Default cost in silver
    quality_bias: str = "normal"
    is_military_biased: bool = False

class AcceptCandidateRequest(BaseModel):
    candidate_ids: List[str]
