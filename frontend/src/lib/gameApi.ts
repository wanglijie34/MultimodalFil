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

const API_BASE = 'http://localhost:8000/api/v1/game';

export async function startGame(): Promise<GameState> {
  const res = await fetch(`${API_BASE}/start`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function advise(state: GameState, minister: string): Promise<{ advice: string }> {
  const res = await fetch(`${API_BASE}/advise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, minister })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function simulateEdict(state: GameState, edict: string): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/edict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, edict })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
