import { fetchApi } from './api';

export interface GameState {
  year: number;
  turn: number;
  treasury: number;
  stability: number;
  famine: number;
  threat: number;
  events: string[];
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
  return fetchApi('/game/edict', {
    method: 'POST',
    body: JSON.stringify({ state, edict })
  });
}
