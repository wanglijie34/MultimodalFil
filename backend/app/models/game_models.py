# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import List, Optional

class GameState(BaseModel):
    year: int = 1627
    turn: int = 1
    treasury: int = 20  # out of 100
    stability: int = 30  # out of 100
    famine: int = 80     # out of 100 (high is bad)
    threat: int = 70     # out of 100 (high is bad, e.g., Houjin threat)
    events: List[str] = ["陕西大旱，饥民遍野", "后金在辽东虎视眈眈", "阉党魏忠贤权倾朝野，国库空虚"]

class AdviseRequest(BaseModel):
    state: GameState
    minister: str

class EdictRequest(BaseModel):
    state: GameState
    edict: str

class SimulationResult(BaseModel):
    new_state: GameState
    narrative: str
    impact_summary: List[str]
