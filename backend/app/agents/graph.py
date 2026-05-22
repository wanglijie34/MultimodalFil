from typing import Dict, Any, List
from uuid import UUID
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState, TraceLog
from app.services.retrieval_service import retrieval_service
from app.services.graph_service import graph_service
from app.services.llm_service import llm_service
from loguru import logger
import json

def append_trace(state: AgentState, name: str, status: str, thought: str) -> List[TraceLog]:
    logs = state.get("trace_logs", [])
    return logs + [{"name": name, "status": status, "thought": thought}]

async def router_node(state: AgentState) -> AgentState:
    query = state["user_query"]
    prompt = f"""You are a query router. The user asks: "{query}"
Determine if this is a complex/comprehensive query that needs breaking down into sub-queries to search across chapters.
If complex, break it into 2-3 specific sub-queries. Otherwise, return just the original query as a sub-query.
Output JSON format: {{"task_type": "complex" | "simple", "sub_queries": ["query1", "query2"]}}"""
    
    thought = ""
    sub_queries = [query]
    task_type = "simple"
    
    try:
        response = await llm_service.chat([{"role": "user", "content": prompt}])
        json_str = response[response.find("{"):response.rfind("}")+1]
        plan = json.loads(json_str)
        sub_queries = plan.get("sub_queries", [query])
        task_type = plan.get("task_type", "simple")
        thought = f"Analyzed query. Task type: {task_type}. Generated {len(sub_queries)} sub-queries: {', '.join(sub_queries)}"
    except Exception as e:
        thought = f"Router parsing failed, defaulting to simple query. Error: {e}"
        
    return {
        **state,
        "task_type": task_type,
        "sub_queries": sub_queries,
        "trace_logs": append_trace(state, "Router", "completed", thought)
    }

async def retrieval_node(state: AgentState) -> AgentState:
    db = state.get("db")
    workspace_id = UUID(state["workspace_id"])
    file_id = UUID(state["file_id"]) if state.get("file_id") and state["file_id"] != "all" else None
    
    all_chunks = []
    chunk_ids = []
    
    # Execute all sub-queries
    for sq in state.get("sub_queries", [state["user_query"]]):
        # 1. Search Vector DB (chunks + summaries)
        chunks = await retrieval_service.search(db, sq, workspace_id, top_k=5, file_id=file_id)
        all_chunks.extend(chunks)
        
        # 2. Extract Graph Entities explicitly from query
        graph_res = await graph_service.search_graph(sq, db)
        if graph_res:
            for r in graph_res:
                if r.get("chunk_id"):
                    chunk_ids.append(r["chunk_id"])
    
    # Deduplicate chunks
    unique_chunks = {c["chunk_id"]: c for c in all_chunks}.values()
    final_chunks = list(unique_chunks)
    
    chunk_ids.extend([c["chunk_id"] for c in final_chunks])
    graph_context = await graph_service.get_entity_context(list(set(chunk_ids)))
    
    # Append graph context as a special chunk if it exists
    if graph_context:
        final_chunks.append({
            "chunk_id": "graph-context",
            "file_id": "Knowledge Graph",
            "page_number": "-",
            "content": graph_context
        })
        
    thought = f"Retrieved {len(final_chunks)} unique evidence blocks using vector search and graph expansion."
    return {
        **state,
        "retrieved_chunks": final_chunks,
        "citations": final_chunks,
        "trace_logs": append_trace(state, "Retrieval & Graph", "completed", thought)
    }

async def verifier_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    retries = state.get("retries", 0)
    
    is_sufficient = len(chunks) > 0 or retries >= 1
    thought = "Evidence is sufficient to draft an answer." if is_sufficient else "Not enough evidence, need to retry."
    
    return {
        **state,
        "retries": retries + 1,
        "verification_result": {"is_sufficient": is_sufficient},
        "trace_logs": append_trace(state, "Verifier", "completed", thought)
    }

async def writer_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    query = state["user_query"]
    
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(f"Source [{i+1}] (File: {chunk['file_id']}, Page: {chunk['page_number']}):\n{chunk['content']}")
        
    context_str = "\n\n".join(context_parts)
    
    system_prompt = (
        "You are an AI assistant for InsightGraph Agent. "
        "Answer the user's question based ONLY on the provided context. "
        "If you don't know the answer, say you don't know. "
        "Always cite your sources using [Source X] format."
    )
    user_prompt = f"Context:\n{context_str}\n\nQuestion: {query}"
    
    try:
        answer = await llm_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        thought = "Synthesized final answer successfully."
    except Exception as e:
        answer = "Error generating response."
        thought = f"Failed to generate answer: {e}"
        
    return {
        **state,
        "final_answer": answer,
        "trace_logs": append_trace(state, "Writer", "completed", thought)
    }

def build_agent_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("router", router_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("verifier", verifier_node)
    workflow.add_node("writer", writer_node)
    
    workflow.add_edge(START, "router")
    workflow.add_edge("router", "retrieval")
    workflow.add_edge("retrieval", "verifier")
    
    workflow.add_conditional_edges(
        "verifier",
        lambda x: "retrieval" if not x.get("verification_result", {}).get("is_sufficient", True) else "writer",
        {
            "retrieval": "retrieval",
            "writer": "writer"
        }
    )
    
    workflow.add_edge("writer", END)
    
    return workflow.compile()

agent_executor = build_agent_graph()
