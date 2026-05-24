from typing import TypedDict, List, Optional, Dict, Any

class TraceLog(TypedDict):
    name: str
    status: str
    thought: str

class AgentState(TypedDict):
    run_id: str
    workspace_id: str
    file_id: Optional[str]
    user_query: str
    conversation_history: List[Dict[str, str]]
    sub_queries: List[str]
    task_type: Optional[str]
    retrieved_chunks: List[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]]
    final_answer: Optional[str]
    citations: List[Dict[str, Any]]
    errors: List[str]
    trace_logs: List[TraceLog]
    retries: int
    db: Any
