from fastapi import APIRouter
from app.models.game_models import AdviseRequest, EdictRequest, SimulationResult
from app.game.state import GameStateManager
from app.game.policy_parser import PolicyParser
from app.game.rule_engine import RuleEngine
from app.game.monthly_update import MonthlyUpdateEngine
from app.game.event_engine import EventEngine
from app.game.narrative_generator import NarrativeGenerator

router = APIRouter()
# Note: For MVP, we use a global state manager for the API
global_state_manager = GameStateManager()
global_state_manager.load_initial_state()

policy_parser = PolicyParser()
rule_engine = RuleEngine(global_state_manager)
monthly_update_engine = MonthlyUpdateEngine(global_state_manager)
event_engine = EventEngine(global_state_manager)
narrative_generator = NarrativeGenerator()

@router.get("/state")
async def get_state():
    return {
        "turn": global_state_manager.world_state.get("turn"),
        "date": global_state_manager.world_state.get("date"),
        "world_state": global_state_manager.world_state,
        "regions": global_state_manager.regions,
        "factions": global_state_manager.factions,
        "available_ministers": global_state_manager.ministers
    }

@router.post("/consult")
async def get_advice(request: AdviseRequest):
    # MVP mock
    return {"consultations": []}

@router.post("/edict", response_model=SimulationResult)
async def simulate_edict(request: EdictRequest):
    edict_text = request.edict_text
    
    # 1. Parse policy
    policies = await policy_parser.parse_edict(edict_text)
    
    # 2. Rule engine
    calc_results = rule_engine.apply_policies(policies)
    
    # 3. Monthly updates
    monthly_update_engine.process_month()
    
    # 4. Events
    triggered_events = event_engine.evaluate_events()
    
    # 5. Narrative
    narrative = await narrative_generator.generate_narrative(
        edict_text, policies, calc_results, triggered_events, global_state_manager.world_state
    )
    
    return SimulationResult(
        parsed_policy=policies,
        calculated_effects=calc_results,
        triggered_events=triggered_events,
        narrative=narrative,
        new_world_state=global_state_manager.world_state
    )
