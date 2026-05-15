from typing import TypedDict, List, Optional, Dict, Any

class AgentState(TypedDict):
    run_id: str
    workspace_id: str
    user_query: str
    task_type: Optional[str]
    retrieved_chunks: List[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]]
    final_answer: Optional[str]
    citations: List[Dict[str, Any]]
    errors: List[str]
