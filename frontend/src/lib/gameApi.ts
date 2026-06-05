import { fetchApi } from './api';

export interface GameState {
  year: number;
  turn: number;
  treasury: number;
  stability: number;
  famine: number;
  threat: number;
  events: string[];
  // New stats for the updated header
  grain?: number;
  troops?: number;
  supplies?: number;
  prestige?: number;
}

export interface SimulationResult {
  new_state: GameState;
  narrative: string;
  impact_summary: string[];
}

export async function startGame(): Promise<GameState> {
  return fetchApi('/game/start', { method: 'POST' });
}

export async function advise(state: GameState, minister: string): Promise<{ advice: string }> {
  return fetchApi('/game/advise', {
    method: 'POST',
    body: JSON.stringify({ state, minister })
  });
}

export async function simulateEdict(state: GameState, edict: string): Promise<SimulationResult> {
  const backendRes = await fetchApi('/game/edict', {
    method: 'POST',
    body: JSON.stringify({ edict_text: edict })
  });

  // Map backend's 'new_world_state' and 'narrative' (which is an object) to frontend's expected format
  const ws = backendRes.new_world_state || {};
  const metrics = ws.national_metrics || {};
  
  const mappedState: GameState = {
    ...state,
    turn: ws.turn || state.turn + 1,
    year: ws.date?.year || state.year,
    treasury: ws.treasury?.silver || state.treasury,
    stability: metrics.public_support || state.stability,
    famine: metrics.disaster_pressure || state.famine,
    threat: metrics.manchu_pressure || state.threat,
    events: (backendRes.triggered_events || []).map((e: any) => e.title),
    troops: ws.military?.troops || state.troops || 0,
    supplies: ws.military?.supplies || state.supplies || 0,
    prestige: ws.emperor?.prestige || state.prestige || 0,
    grain: state.grain || 2880000 // default mock for grain as it's regional in MVP
  };

  const narrativeObj = backendRes.narrative || {};
  const text = `${narrativeObj.court_report || ''}\n\n${narrativeObj.public_reaction || ''}\n\n${narrativeObj.faction_reaction || ''}`.trim();

  return {
    new_state: mappedState,
    narrative: text || "圣旨已下，百官奉行。",
    impact_summary: narrativeObj.summary_effects || []
  };
}
