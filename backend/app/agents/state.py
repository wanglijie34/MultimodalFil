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
    required_aspects: List[str]
    task_type: Optional[str]
    document_chunks: Dict[str, List[Dict[str, Any]]]
    graph_chunks: Dict[str, List[Dict[str, Any]]]
    retrieved_chunks: Dict[str, List[Dict[str, Any]]]
    research_plan: Optional[Dict[str, Any]]
    graph_findings: List[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]]
    coverage_report: Optional[Dict[str, str]]
    final_answer: Optional[str]
    citations: Dict[str, List[Dict[str, Any]]]
    errors: List[str]
    trace_logs: List[TraceLog]
    retries: int
    db: Any
