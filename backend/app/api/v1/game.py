from fastapi import APIRouter
from app.models.game_models import GameState, AdviseRequest, EdictRequest, SimulationResult
from app.services.game_service import game_service

router = APIRouter()

@router.post("/start", response_model=GameState)
async def start_game():
    return GameState()

@router.post("/advise")
async def get_advice(request: AdviseRequest):
    advice = await game_service.advise(request.state, request.minister)
    return {"advice": advice}

@router.post("/edict", response_model=SimulationResult)
async def simulate_edict(request: EdictRequest):
    result = await game_service.simulate_edict(request.state, request.edict)
    return result
