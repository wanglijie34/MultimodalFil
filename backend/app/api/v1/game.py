from fastapi import APIRouter
from app.models.game_models import AdviseRequest, EdictRequest, SimulationResult
from app.game.state import GameStateManager
from app.game.policy_parser import PolicyParser
from app.game.court_flow_engine import CourtFlowEngine
from app.game.consult_engine import ConsultEngine
from app.game.rule_engine import RuleEngine
from app.game.monthly_update import MonthlyUpdateEngine
from app.game.event_engine import EventEngine
from app.game.narrative_generator import NarrativeGenerator
from app.game.chat_engine import ChatEngine
from app.models.game_models import AdviseRequest, EdictRequest, SimulationResult, ChatRequest, ChatResponse

router = APIRouter()
# Note: For MVP, we use a global state manager for the API
global_state_manager = GameStateManager()
global_state_manager.load_initial_state()

policy_parser = PolicyParser()
court_flow_engine = CourtFlowEngine(global_state_manager)
consult_engine = ConsultEngine(global_state_manager)
rule_engine = RuleEngine(global_state_manager)
monthly_update_engine = MonthlyUpdateEngine(global_state_manager)
event_engine = EventEngine(global_state_manager)
narrative_generator = NarrativeGenerator()
chat_engine = ChatEngine(global_state_manager)

@router.post("/start")
async def start_game():
    global_state_manager.load_initial_state()
    return {
        "status": "success",
        "world_state": global_state_manager.world_state,
        "regions": global_state_manager.regions,
        "factions": global_state_manager.factions,
        "institutions": global_state_manager.institutions,
        "available_ministers": global_state_manager.ministers
    }

@router.get("/state")
async def get_state():
    return {
        "turn": global_state_manager.world_state.get("turn"),
        "date": global_state_manager.world_state.get("date"),
        "world_state": global_state_manager.world_state,
        "regions": global_state_manager.regions,
        "factions": global_state_manager.factions,
        "institutions": global_state_manager.institutions,
        "available_ministers": global_state_manager.ministers
    }

@router.post("/consult")
async def get_advice(request: AdviseRequest):
    results = await consult_engine.generate_consultations(request.minister_ids)
    return {"consultations": results}

@router.post("/chat", response_model=ChatResponse)
async def chat_with_minister(request: ChatRequest):
    reply = await chat_engine.chat_with_minister(request)
    return ChatResponse(reply=reply)
from app.models.game_models import AdviseRequest, EdictRequest, SimulationResult, ChatRequest, ChatResponse, AppointRequest, DismissRequest, SaveGameRequest, LoadGameRequest, RecruitRequest, AcceptCandidateRequest
from app.game.minister_generator import generate_candidates

@router.get("/saves")
async def list_saves():
    saves = global_state_manager.get_saves()
    return {"saves": saves}

@router.post("/ministers/recruit")
async def recruit_ministers(request: RecruitRequest):
    # Check if we have enough money
    treasury = global_state_manager.world_state.get("treasury", {})
    silver = treasury.get("silver", 0)
    if silver < request.cost:
        return {"status": "error", "message": "国库空虚，无力承担求贤花销！"}
        
    # Deduct cost
    global_state_manager.world_state["treasury"]["silver"] -= request.cost
    
    # Generate 4 candidates
    candidates = await generate_candidates(4, request.quality_bias, request.is_military_biased)
    
    # Temporarily store them in global state or just return them for the user to pick
    # For simplicity, we just add them to the global pool with status="candidate"
    for c in candidates:
        global_state_manager.ministers.append(c)
        
    return {"status": "success", "candidates": candidates, "treasury": global_state_manager.world_state["treasury"]}

@router.post("/ministers/accept_candidate")
async def accept_candidates(request: AcceptCandidateRequest):
    accepted = []
    # Change status from "candidate" to "reserve" for accepted
    # Remove others from the pool
    remaining_ministers = []
    for m in global_state_manager.ministers:
        if m.get("status") == "candidate":
            if m.get("minister_id") in request.candidate_ids:
                m["status"] = "reserve"
                accepted.append(m)
                remaining_ministers.append(m)
        else:
            remaining_ministers.append(m)
            
    global_state_manager.ministers = remaining_ministers
    return {"status": "success", "accepted": accepted}

@router.post("/save")
async def save_game(request: SaveGameRequest):
    success = global_state_manager.save_game(request.save_name)
    return {"status": "success" if success else "error"}

@router.post("/load")
async def load_game(request: LoadGameRequest):
    success = global_state_manager.load_game(request.save_name)
    return {"status": "success" if success else "error"}

@router.get("/ministers/reserve")
async def get_reserve_ministers():
    reserves = [m for m in global_state_manager.ministers if m.get("status") == "reserve"]
    return {"reserves": reserves}

@router.post("/ministers/appoint")
async def appoint_minister(request: AppointRequest):
    # 1. Dismiss current official in the target role if any (optional based on rules)
    # 2. Set new official's role and status
    for m in global_state_manager.ministers:
        if m.get("role") == request.target_role and m.get("status") == "active":
            m["status"] = "reserve"
            m["role"] = "在野" # Or clear it
    
    appointed = None
    for m in global_state_manager.ministers:
        if m.get("minister_id") == request.minister_id:
            m["status"] = "active"
            m["role"] = request.target_role
            if request.target_department:
                m["department"] = request.target_department
            appointed = m
            break
            
    return {"status": "success", "appointed": appointed}

@router.post("/ministers/dismiss")
async def dismiss_minister(request: DismissRequest):
    dismissed = None
    for m in global_state_manager.ministers:
        if m.get("minister_id") == request.minister_id:
            m["status"] = "reserve"
            m["role"] = "在野"
            dismissed = m
            break
            
    return {"status": "success", "dismissed": dismissed}

@router.post("/edict", response_model=SimulationResult)
async def simulate_edict(request: EdictRequest):
    edict_text = request.edict_text
    
    # 1. Parse policy
    policies = await policy_parser.parse_edict(edict_text)
    
    # 2. Court Flow Engine
    flow_results = court_flow_engine.process_policies(policies)
    
    # 3. Rule engine
    calc_results = rule_engine.apply_policies(policies, flow_results)
    
    # 3. Monthly updates
    monthly_update_engine.process_month()
    
    # 4. Events
    triggered_events = event_engine.evaluate_events()
    
    # 4.5 Scheduled Exams
    if global_state_manager.world_state.get("turn", 0) % 12 == 0:
        candidates = await generate_candidates(3, quality_bias="normal")
        for c in candidates:
            global_state_manager.ministers.append(c)
        triggered_events.append({
            "event_id": "scheduled_exam",
            "title": "岁考放榜",
            "description": "又到了一年一度的科举大考，吏部与礼部送来了一批新晋才俊的候补名册，请陛下过目。"
        })
    
    # 5. Narrative
    narrative = await narrative_generator.generate_narrative(
        edict_text, policies, calc_results, triggered_events, global_state_manager.world_state
    )
    
    return SimulationResult(
        parsed_policy=policies,
        court_flow_results=flow_results,
        calculated_effects=calc_results,
        triggered_events=triggered_events,
        narrative=narrative,
        new_world_state=global_state_manager.world_state,
        regions=global_state_manager.regions,
        factions=global_state_manager.factions,
        institutions=global_state_manager.institutions
    )
