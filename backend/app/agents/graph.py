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
    conversation_history = state.get("conversation_history", [])
    history_text = "\n".join(
        f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-6:]
    )
    prompt = f"""You are an intelligent query router and expander for a RAG system. The user asks: "{query}"

Recent conversation history:
{history_text or "None"}

Your task is to break down complex queries AND expand abstract concepts using your internal world knowledge. 
If the user asks about a general term, historical event, or abstract concept, DO NOT just repeat it. Use your knowledge to unpack it into the specific sub-events, people, places, or concrete keywords that a document would actually use (e.g., expanding "Industrial Revolution" to "Steam Engine, James Watt, Textile").

Generate 1 to 3 specific sub-queries that are highly optimized for a vector database keyword search.
Output EXACTLY in this JSON format: {{"task_type": "complex" | "simple", "sub_queries": ["query1", "query2"]}}"""
    
    thought = ""
    sub_queries = [query]
    task_type = "simple"
    
    try:
        response = await llm_service.chat([{"role": "user", "content": prompt}])
        json_str = response[response.find("{"):response.rfind("}")+1]
        plan = json.loads(json_str)
        sub_queries = plan.get("sub_queries", [query])
        task_type = plan.get("task_type", "simple")
        thought = f"Analyzed query. Task type: {task_type}. Generated {len(sub_queries)} expanded sub-queries: {', '.join(sub_queries)}"
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
    
    # Accumulate chunks from previous hops
    all_chunks = list(state.get("retrieved_chunks", []))
    chunk_ids = []
    
    retries = state.get("retries", 0)
    # Only search the new sub-queries on retries
    if retries == 0:
        sqs_to_search = state.get("sub_queries", [state["user_query"]])
    else:
        sqs_to_search = [state.get("sub_queries", [])[-1]] if state.get("sub_queries") else [state["user_query"]]
    
    # Execute sub-queries
    for sq in sqs_to_search:
        # 1. Search Vector DB (chunks + summaries)
        chunks = await retrieval_service.search(db, sq, workspace_id, top_k=5, file_id=file_id)
        all_chunks.extend(chunks)
        
        # 2. Extract Graph Entities explicitly from query
        graph_res = await graph_service.search_graph(sq, file_id, db)
        if graph_res:
            for r in graph_res:
                if r.get("chunk_id"):
                    chunk_ids.append(r["chunk_id"])
    
    # Deduplicate chunks
    unique_chunks = {c["chunk_id"]: c for c in all_chunks}.values()
    final_chunks = list(unique_chunks)
    
    chunk_ids.extend([c["chunk_id"] for c in final_chunks if c.get("chunk_id") and c["chunk_id"] != "graph-context"])
    graph_context = await graph_service.get_entity_context(list(set(chunk_ids)))
    
    # Update or append graph context
    final_chunks = [c for c in final_chunks if c["chunk_id"] != "graph-context"]
    if graph_context:
        final_chunks.append({
            "chunk_id": "graph-context",
            "file_id": "Knowledge Graph",
            "page_number": "-",
            "content": graph_context
        })
        
    thought = f"Retrieved total {len(final_chunks)} unique evidence blocks so far."
    return {
        **state,
        "retrieved_chunks": final_chunks,
        "citations": final_chunks,
        "trace_logs": append_trace(state, "Retrieval & Graph", "completed", thought)
    }

async def verifier_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    query = state["user_query"]
    retries = state.get("retries", 0)
    
    if len(chunks) == 0:
        is_sufficient = False
        missing_info = "No relevant context found at all."
    else:
        # LLM evaluates the context
        context_parts = []
        for i, chunk in enumerate(chunks[:10]): # evaluate top 10
            context_parts.append(f"[{i+1}]: {chunk['content']}")
            
        context_str = "\n".join(context_parts)
        prompt = f"""You are evaluating retrieved documents to see if they can answer the user's query.
User Query: "{query}"

Retrieved Context:
{context_str}

Analyze the context. Does it contain sufficient information to fully answer the query?
IMPORTANT: Do NOT be overly strict about exact word matches. Use your internal world knowledge! If the user asks about an abstract term and the text provides concrete details about its underlying facts, components, or sub-events, then the context IS sufficient. 

Respond EXACTLY in JSON format:
{{"is_sufficient": true/false, "missing_info": "what is missing or unclear"}}"""
        
        try:
            response = await llm_service.chat([{"role": "user", "content": prompt}])
            json_str = response[response.find("{"):response.rfind("}")+1]
            result = json.loads(json_str)
            is_sufficient = result.get("is_sufficient", False)
            missing_info = result.get("missing_info", "")
        except Exception as e:
            logger.error(f"Verifier failed to parse JSON: {e}")
            is_sufficient = len(chunks) > 0 # Fallback
            missing_info = ""

    if not is_sufficient and retries < 2:
        # Generate new sub-query
        new_query_prompt = f"""The user asked: "{query}"
The previous search failed to find enough information. Missing info: {missing_info}

Generate ONE specific, alternative search query to find this missing information in a book.
IMPORTANT: Do not just repeat the original terms. Use your broad world knowledge to brainstorm synonyms, related historical figures, specific battle names, or alternative concrete phrasing that the author might have used instead of the abstract term.

Return ONLY the query string, nothing else. Do not use quotes or markdown."""
        try:
            new_query = await llm_service.chat([{"role": "user", "content": new_query_prompt}])
            new_query = new_query.strip('"\' ')
        except:
            new_query = f"{query} {missing_info}"
            
        sub_queries = state.get("sub_queries", []) + [new_query]
        thought = f"Evidence insufficient. Missing: {missing_info}. Generated expanded search: {new_query}"
        
        return {
            **state,
            "sub_queries": sub_queries,
            "retries": retries + 1,
            "verification_result": {"is_sufficient": False, "missing_info": missing_info},
            "trace_logs": append_trace(state, "Verifier", "retry", thought)
        }
    else:
        thought = "Evidence is sufficient." if is_sufficient else "Max retries reached, proceeding with best effort."
        return {
            **state,
            "retries": retries + 1,
            "verification_result": {"is_sufficient": True}, # Force True to exit loop
            "trace_logs": append_trace(state, "Verifier", "completed", thought)
        }

async def writer_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    query = state["user_query"]
    conversation_history = state.get("conversation_history", [])
    
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(f"Source [{i+1}] (File: {chunk['file_id']}, Page: {chunk['page_number']}):\n{chunk['content']}")
        
    context_str = "\n\n".join(context_parts)
    history_text = "\n".join(
        f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-6:]
    )
    
    system_prompt = (
        "You are an AI assistant for InsightGraph Agent. "
        "Answer the user's question based ONLY on the provided context. "
        "HOWEVER, you are allowed to use your internal world knowledge to bridge the gap between abstract terms in the user's query and concrete events/facts in the context. "
        "If the context does not contain the necessary underlying facts, say you don't know. "
        "Always cite your sources using [Source X] format."
    )
    user_prompt = f"Conversation History:\n{history_text or 'None'}\n\nContext:\n{context_str}\n\nQuestion: {query}"
    
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
