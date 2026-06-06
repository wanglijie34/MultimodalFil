import { fetchApi } from './api';

export interface Minister {
  minister_id: string;
  name: string;
  status: string;
  role: string;
  faction: string;
  department?: string;
  hometown?: string;
  loyalty_to_emperor: number;
  competence: number;
  corruption: number;
  personal_power: number;
  biography?: string;
  personality?: string[];
  policy_bias?: Record<string, number>;
}
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
  grain_consumption?: number;
  troops?: number;
  supplies?: number;
  prestige?: number;
  debt?: number;
  privy_purse?: number;
  regions?: any[];
}

export interface Institution {
  institution_id: string;
  name: string;
  type: string;
  influence: number;
  efficiency: number;
  corruption: number;
  loyalty: number;
  faction_bias: string;
  hostility: number;
}

export interface Faction {
  faction_id: string;
  name: string;
  influence: number;
  hostility: number;
  cohesion: number;
}

export interface ConsultationResult {
  minister_id: string;
  minister_name: string;
  stance: string;
  recommended_policies: string[];
  warning_tags: string[];
  content: string;
}

export interface CourtFlowResult {
  lead_institutions: string[];
  stages: string[];
  final_status: string;
  delay_days: number;
  execution_rate: number;
  corruption_loss: number;
  distortion_level: number;
  political_backlash: number;
  notes: string;
}

export interface SimulationResult {
  new_state: GameState;
  narrative: string;
  impact_summary: string[];
  court_flow_results: CourtFlowResult[];
  institutions: Institution[];
  factions: Faction[];
  regions: any[];
}

export async function startGame(): Promise<GameState> {
  return fetchApi('/game/start', { method: 'POST' });
}

export async function getGameState(): Promise<{world_state: any, regions: any[], factions: Faction[], institutions: Institution[], available_ministers: any[]}> {
  return fetchApi('/game/state');
}

export async function advise(state: GameState, ministerIds: string[]): Promise<ConsultationResult[]> {
  const res = await fetchApi('/game/consult', {
    method: 'POST',
    body: JSON.stringify({ minister_ids: ministerIds })
  });
  return res.consultations || [];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatWithMinister(ministerId: string, userMessage: string, history: ChatMessage[] = []): Promise<string> {
  const res = await fetchApi('/game/chat', {
    method: 'POST',
    body: JSON.stringify({ minister_id: ministerId, user_message: userMessage, history })
  });
  return res.reply || "臣惶恐，不敢妄言。";
}

export async function getReserveMinisters(): Promise<any[]> {
  const res = await fetchApi('/game/ministers/reserve');
  return res.reserves || [];
}

export async function appointMinister(ministerId: string, targetRole: string, targetDepartment: string = ""): Promise<any> {
  return await fetchApi('/game/ministers/appoint', {
    method: 'POST',
    body: JSON.stringify({ minister_id: ministerId, target_role: targetRole, target_department: targetDepartment })
  });
}

export async function dismissMinister(ministerId: string): Promise<any> {
  return await fetchApi('/game/ministers/dismiss', {
    method: 'POST',
    body: JSON.stringify({ minister_id: ministerId })
  });
}

export async function getSaves(): Promise<string[]> {
  const res = await fetchApi('/game/saves');
  return res.saves || [];
}

export async function saveGame(saveName: string): Promise<boolean> {
  const res = await fetchApi('/game/save', {
    method: 'POST',
    body: JSON.stringify({ save_name: saveName })
  });
  return res.status === 'success';
}

export async function loadGame(saveName: string): Promise<boolean> {
  const res = await fetchApi('/game/load', {
    method: 'POST',
    body: JSON.stringify({ save_name: saveName })
  });
  return res.status === 'success';
}

export async function recruitMinisters(cost: number = 100000): Promise<{status: string, message?: string, candidates?: any[], treasury?: number}> {
  return await fetchApi('/game/ministers/recruit', {
    method: 'POST',
    body: JSON.stringify({ cost })
  });
}

export async function acceptCandidates(candidateIds: string[]): Promise<boolean> {
  const res = await fetchApi('/game/ministers/accept_candidate', {
    method: 'POST',
    body: JSON.stringify({ candidate_ids: candidateIds })
  });
  return res.status === 'success';
}

export async function parseEdict(edict: string): Promise<any[]> {
  const res = await fetchApi('/game/parse_edict', {
    method: 'POST',
    body: JSON.stringify({ edict_text: edict })
  });
  return res.parsed_policy || [];
}

export async function simulateEdict(state: GameState, edict: string, parsedPolicies: any[]): Promise<SimulationResult> {
  const backendRes = await fetchApi('/game/execute_edict', {
    method: 'POST',
    body: JSON.stringify({ edict_text: edict, parsed_policy: parsedPolicies })
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
    debt: ws.treasury?.debt || state.debt || 0,
    privy_purse: ws.treasury?.privy_purse || state.privy_purse || 0,
    grain: ws.treasury?.grain || state.grain || 0,
    grain_consumption: ws.treasury?.grain_consumption || state.grain_consumption || 0,
    regions: backendRes.regions || state.regions || []
  };

  const narrativeObj = backendRes.narrative || {};
  const text = `${narrativeObj.court_report || ''}\n\n${narrativeObj.public_reaction || ''}\n\n${narrativeObj.faction_reaction || ''}`.trim();

  return {
    new_state: mappedState,
    narrative: text || "圣旨已下，百官奉行。",
    impact_summary: narrativeObj.summary_effects || [],
    court_flow_results: backendRes.court_flow_results || [],
    institutions: backendRes.institutions || [],
    factions: backendRes.factions || [],
    regions: backendRes.regions || []
  };
}
