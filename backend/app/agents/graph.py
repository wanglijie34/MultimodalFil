import asyncio
import json
from typing import Dict, List
from uuid import UUID

from langgraph.graph import END, START, StateGraph
from loguru import logger

from app.agents.state import AgentState, TraceLog
from app.services.file_profile_service import describe_query_profile
from app.services.graph_service import graph_service
from app.services.llm_service import llm_service
from app.services.retrieval_service import retrieval_service

RESEARCH_TOP_K = 8


def append_trace(state: AgentState, name: str, status: str, thought: str) -> List[TraceLog]:
    logs = state.get("trace_logs", [])
    return logs + [{"name": name, "status": status, "thought": thought}]


def format_history(conversation_history: List[Dict[str, str]]) -> str:
    return "\n".join(
        f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-6:]
    )


def deduplicate_chunks(chunks: List[Dict[str, object]]) -> List[Dict[str, object]]:
    unique: Dict[str, Dict[str, object]] = {}
    for chunk in chunks:
        chunk_id = str(chunk.get("chunk_id") or "")
        if chunk_id and chunk_id not in unique:
            unique[chunk_id] = chunk
    return list(unique.values())


async def planner_node(state: AgentState) -> AgentState:
    query = state["user_query"]
    conversation_history = state.get("conversation_history", [])
    history_text = format_history(conversation_history)
    prompt = f"""You are the planning agent in a multi-agent RAG system.
The user asks: "{query}"

Recent conversation history:
{history_text or "None"}

Break the task into a compact retrieval plan. Expand abstract terms into concrete people, events, places, or technical keywords that are more likely to appear in source documents.

Return EXACTLY valid JSON with this shape:
{{
  "task_type": "simple" or "complex",
  "sub_queries": ["query1", "query2"],
  "research_focus": ["focus 1", "focus 2"]
}}"""

    task_type = "simple"
    sub_queries = [query]
    research_focus = [query]
    thought = ""

    try:
        response = await llm_service.chat([{"role": "user", "content": prompt}])
        json_str = response[response.find("{") : response.rfind("}") + 1]
        plan = json.loads(json_str)
        task_type = plan.get("task_type", "simple")
        sub_queries = plan.get("sub_queries") or [query]
        research_focus = plan.get("research_focus") or sub_queries[:]
        thought = (
            f"Planned {len(sub_queries)} search paths for a {task_type} query: "
            + ", ".join(sub_queries)
        )
    except Exception as exc:
        thought = f"Planning fell back to the raw query because parsing failed: {exc}"

    return {
        **state,
        "task_type": task_type,
        "sub_queries": sub_queries,
        "research_plan": {
            "task_type": task_type,
            "sub_queries": sub_queries,
            "research_focus": research_focus,
        },
        "trace_logs": append_trace(state, "Planner", "completed", thought),
    }


async def document_researcher_node(state: AgentState) -> AgentState:
    db = state.get("db")
    file_id = UUID(state["file_id"]) if state.get("file_id") and state["file_id"] != "all" else None
    retries = state.get("retries", 0)

    all_chunks = list(state.get("document_chunks", []))
    sub_queries = state.get("sub_queries", [state["user_query"]])
    search_queries = sub_queries if retries == 0 else [sub_queries[-1]]

    async def run_vector_agent(sub_query: str):
        return await retrieval_service.vector_search(sub_query, top_k=RESEARCH_TOP_K, file_id=file_id)

    async def run_keyword_agent(sub_query: str):
        search_terms = retrieval_service._extract_search_terms(sub_query)
        return await retrieval_service.keyword_search(db, search_terms, top_k=RESEARCH_TOP_K, file_id=file_id)

    async def run_summary_agent(sub_query: str):
        search_terms = retrieval_service._extract_search_terms(sub_query)
        return await retrieval_service.summary_search(db, search_terms, top_k=RESEARCH_TOP_K, file_id=file_id)

    vector_hits = 0
    keyword_hits = 0
    summary_hits = 0
    for sub_query in search_queries:
        vector_results, keyword_chunks, summary_chunks = await asyncio.gather(
            run_vector_agent(sub_query),
            run_keyword_agent(sub_query),
            run_summary_agent(sub_query),
        )
        search_terms = retrieval_service._extract_search_terms(sub_query)
        merged_chunks = retrieval_service.merge_results(
            vector_results=vector_results,
            keyword_chunks=keyword_chunks,
            summary_chunks=summary_chunks,
            search_terms=search_terms,
            query=sub_query,
            query_profile=describe_query_profile(sub_query),
            top_k=RESEARCH_TOP_K,
        )
        vector_hits += len(vector_results)
        keyword_hits += len(keyword_chunks)
        summary_hits += len(summary_chunks)
        all_chunks.extend(merged_chunks)

    final_chunks = deduplicate_chunks(all_chunks)
    vector_thought = f"Vector agent searched {len(search_queries)} query path(s) and returned {vector_hits} candidates."
    keyword_thought = f"Keyword agent matched {keyword_hits} content chunks across exact and term-based lookups."
    summary_thought = f"Summary agent surfaced {summary_hits} high-level summary chunks for long-range context."
    fusion_thought = (
        f"Evidence fusion kept {len(final_chunks)} unique document blocks"
        f" after parallel retrieval and reranking."
    )
    trace_logs = append_trace(state, "Vector Researcher", "completed", vector_thought)
    trace_logs = trace_logs + [{"name": "Keyword Researcher", "status": "completed", "thought": keyword_thought}]
    trace_logs = trace_logs + [{"name": "Summary Researcher", "status": "completed", "thought": summary_thought}]
    trace_logs = trace_logs + [{"name": "Evidence Fusion", "status": "completed", "thought": fusion_thought}]

    return {
        **state,
        "document_chunks": final_chunks,
        "retrieved_chunks": deduplicate_chunks(final_chunks + state.get("graph_chunks", [])),
        "citations": deduplicate_chunks(final_chunks + state.get("graph_chunks", [])),
        "trace_logs": trace_logs,
    }


async def graph_researcher_node(state: AgentState) -> AgentState:
    db = state.get("db")
    file_id = UUID(state["file_id"]) if state.get("file_id") and state["file_id"] != "all" else None
    retries = state.get("retries", 0)

    document_chunks = list(state.get("document_chunks", []))
    graph_chunks = [chunk for chunk in state.get("graph_chunks", []) if chunk.get("chunk_id") != "graph-context"]
    graph_findings = list(state.get("graph_findings", []))

    sub_queries = state.get("sub_queries", [state["user_query"]])
    search_queries = sub_queries if retries == 0 else [sub_queries[-1]]
    linked_chunk_ids: List[str] = []

    for sub_query in search_queries:
        graph_results = await graph_service.search_graph(sub_query, file_id, db)
        if graph_results:
            graph_findings.extend(graph_results)
            for result in graph_results:
                if result.get("chunk_id"):
                    linked_chunk_ids.append(str(result["chunk_id"]))

    doc_and_graph_chunk_ids = [
        str(chunk.get("chunk_id"))
        for chunk in document_chunks
        if chunk.get("chunk_id") and chunk.get("chunk_id") != "graph-context"
    ] + linked_chunk_ids

    graph_context = await graph_service.get_entity_context(sorted(set(doc_and_graph_chunk_ids)))
    if graph_context:
        graph_chunks.append(
            {
                "chunk_id": "graph-context",
                "file_id": "Knowledge Graph",
                "page_number": "-",
                "content": graph_context,
            }
        )

    final_graph_chunks = deduplicate_chunks(graph_chunks)
    combined_chunks = deduplicate_chunks(document_chunks + final_graph_chunks)
    thought = (
        f"Expanded evidence with {len(graph_findings)} graph hits"
        f" and {1 if graph_context else 0} graph context block."
    )

    return {
        **state,
        "graph_chunks": final_graph_chunks,
        "graph_findings": graph_findings,
        "retrieved_chunks": combined_chunks,
        "citations": combined_chunks,
        "trace_logs": append_trace(state, "Graph Researcher", "completed", thought),
    }


async def critic_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    query = state["user_query"]
    retries = state.get("retries", 0)

    if not chunks:
        is_sufficient = False
        missing_info = "No relevant context found."
    else:
        context_parts = []
        for index, chunk in enumerate(chunks[:10]):
            context_parts.append(f"[{index + 1}]: {chunk['content']}")
        context_str = "\n".join(context_parts)
        prompt = f"""You are the critic agent in a multi-agent RAG workflow.
User Query: "{query}"

Retrieved Context:
{context_str}

Decide whether the team has enough evidence to answer the user well.
Be flexible about terminology. If the context contains the concrete facts behind an abstract query, it is sufficient.

Return EXACTLY valid JSON:
{{
  "is_sufficient": true or false,
  "missing_info": "what is still missing",
  "follow_up_query": "one better search query when evidence is insufficient"
}}"""

        try:
            response = await llm_service.chat([{"role": "user", "content": prompt}])
            json_str = response[response.find("{") : response.rfind("}") + 1]
            result = json.loads(json_str)
            is_sufficient = bool(result.get("is_sufficient", False))
            missing_info = result.get("missing_info", "")
            follow_up_query = (result.get("follow_up_query") or "").strip()
        except Exception as exc:
            logger.error(f"Critic failed to parse JSON: {exc}")
            is_sufficient = len(chunks) > 0
            missing_info = ""
            follow_up_query = ""

    if not chunks:
        follow_up_query = state["user_query"]

    if not is_sufficient and retries < 2:
        if not follow_up_query:
            new_query_prompt = f"""The user asked: "{query}"
The current evidence is not sufficient. Missing information: {missing_info}

Generate ONE concrete alternative search query for books or notes.
Return ONLY the query string."""
            try:
                follow_up_query = await llm_service.chat([{"role": "user", "content": new_query_prompt}])
                follow_up_query = follow_up_query.strip('"\' ')
            except Exception:
                follow_up_query = f"{query} {missing_info}".strip()

        sub_queries = state.get("sub_queries", []) + [follow_up_query]
        thought = f"Evidence incomplete. Missing: {missing_info}. New search: {follow_up_query}"
        return {
            **state,
            "sub_queries": sub_queries,
            "retries": retries + 1,
            "verification_result": {
                "is_sufficient": False,
                "missing_info": missing_info,
                "follow_up_query": follow_up_query,
            },
            "trace_logs": append_trace(state, "Critic", "retry", thought),
        }

    thought = "Evidence is sufficient." if is_sufficient else "Retry limit reached; proceeding with best effort."
    return {
        **state,
        "retries": retries + 1,
        "verification_result": {"is_sufficient": True},
        "trace_logs": append_trace(state, "Critic", "completed", thought),
    }


async def writer_node(state: AgentState) -> AgentState:
    chunks = state.get("retrieved_chunks", [])
    query = state["user_query"]
    conversation_history = state.get("conversation_history", [])

    context_parts = []
    for index, chunk in enumerate(chunks):
        context_parts.append(
            f"Source [{index + 1}] (File: {chunk['file_id']}, Page: {chunk['page_number']}):\n{chunk['content']}"
        )

    context_str = "\n\n".join(context_parts)
    history_text = format_history(conversation_history)
    system_prompt = (
        "You are the synthesis agent for InsightGraph Agent. "
        "Answer the user's question based ONLY on the provided context. "
        "You may connect abstract user wording to concrete facts found in context, but do not invent missing facts. "
        "If the context is not enough, say you do not know. "
        "Always cite your sources using [Source X] format."
    )
    user_prompt = f"Conversation History:\n{history_text or 'None'}\n\nContext:\n{context_str}\n\nQuestion: {query}"

    try:
        answer = await llm_service.chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        thought = "Synthesized the final answer from document and graph evidence."
    except Exception as exc:
        answer = "Error generating response."
        thought = f"Failed to generate answer: {exc}"

    return {
        **state,
        "final_answer": answer,
        "trace_logs": append_trace(state, "Writer", "completed", thought),
    }


def build_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("planner", planner_node)
    workflow.add_node("document_researcher", document_researcher_node)
    workflow.add_node("graph_researcher", graph_researcher_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("writer", writer_node)

    workflow.add_edge(START, "planner")
    workflow.add_edge("planner", "document_researcher")
    workflow.add_edge("document_researcher", "graph_researcher")
    workflow.add_edge("graph_researcher", "critic")

    workflow.add_conditional_edges(
        "critic",
        lambda state: "document_researcher"
        if not state.get("verification_result", {}).get("is_sufficient", True)
        else "writer",
        {
            "document_researcher": "document_researcher",
            "writer": "writer",
        },
    )

    workflow.add_edge("writer", END)
    return workflow.compile()


agent_executor = build_agent_graph()
