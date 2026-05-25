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
from app.services.concept_service import concept_service

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

Categorize the user's query into one of these task types:
- entity_attribute_lookup (e.g., "What is Wanli's real name?", "When did Zhang Juzheng die?", "Who is the CEO of OpenAI?")
- definition_list (e.g., "What are the three major campaigns?", "List the design patterns")
- entity_profile (e.g., "Who is Zhang Juzheng?", "What is Apple Inc?")
- timeline_event (e.g., "When did the battle happen?", "History of the Ming dynasty")
- compare (e.g., "Difference between A and B")
- cause_effect (e.g., "Why did the dynasty fall?")
- multi_aspect_explanation (Any complex query requiring background, methods, impacts)
- simple (Direct factual QA)

Return EXACTLY valid JSON with this shape:
{{
  "task_type": "definition_list",
  "sub_queries": ["query1", "query2"],
  "research_focus": ["focus 1", "focus 2"],
  "required_aspects": ["aspect1", "aspect2"]
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
        required_aspects = plan.get("required_aspects", [])
        
        # Concept Enrichment for collective types and entity attribute lookups
        if task_type in ["definition_list", "compare", "entity_attribute_lookup"]:
            concept_info = await concept_service.parse_concept(query)
            
            if task_type == "entity_attribute_lookup":
                # For entity attribute lookup, we use aliases and canonical concepts as aspects
                # And we set sub_queries to the target attributes if provided, else keep as is.
                entity_aspects = [concept_info.get("canonical_concept")] + concept_info.get("aliases", [])
                entity_aspects = [a for a in entity_aspects if a and a != query]
                if entity_aspects:
                    required_aspects = required_aspects + entity_aspects
                if concept_info.get("target_attributes"):
                    sub_queries = concept_info.get("target_attributes")
            else:
                if concept_info.get("members"):
                    required_aspects = concept_info["members"]
                elif concept_info.get("related_entities"):
                    required_aspects = required_aspects + concept_info["related_entities"]
            
            # Ensure unique aspects
            required_aspects = list(dict.fromkeys([a for a in required_aspects if a]))
            if not required_aspects:
                required_aspects = ["general"]

        thought = (
            f"Planned {len(sub_queries)} search paths for a {task_type} query with aspects {required_aspects}: "
            + ", ".join(sub_queries)
        )
    except Exception as exc:
        thought = f"Planning fell back to the raw query because parsing failed: {exc}"
        required_aspects = ["general"]

    return {
        **state,
        "task_type": task_type,
        "sub_queries": sub_queries,
        "required_aspects": required_aspects,
        "research_plan": {
            "task_type": task_type,
            "sub_queries": sub_queries,
            "research_focus": research_focus,
            "required_aspects": required_aspects,
        },
        "trace_logs": append_trace(state, "Planner", "completed", thought),
    }

async def document_researcher_node(state: AgentState) -> AgentState:
    db = state.get("db")
    file_id = UUID(state["file_id"]) if state.get("file_id") and state["file_id"] != "all" else None
    retries = state.get("retries", 0)

    all_chunks = state.get("document_chunks") or {}
    if isinstance(all_chunks, list):
        all_chunks = {"general": all_chunks}
    sub_queries = state.get("sub_queries", [state["user_query"]])
    required_aspects = state.get("required_aspects") or ["general"]
    
    search_queries = sub_queries if retries == 0 else [sub_queries[-1]]

    vector_hits = 0
    keyword_hits = 0
    summary_hits = 0
    
    for aspect in required_aspects:
        if aspect not in all_chunks:
            all_chunks[aspect] = []
            
        for sub_query in search_queries:
            aspect_query = f"{sub_query} {aspect}" if aspect != "general" else sub_query
            
            async def run_vector_agent(q):
                return await retrieval_service.vector_search(q, top_k=RESEARCH_TOP_K, file_id=file_id)
            async def run_keyword_agent(q):
                return await retrieval_service.keyword_search(db, retrieval_service._extract_search_terms(q), top_k=RESEARCH_TOP_K, file_id=file_id)
            async def run_summary_agent(q):
                return await retrieval_service.summary_search(db, retrieval_service._extract_search_terms(q), top_k=RESEARCH_TOP_K, file_id=file_id)

            vector_results, keyword_chunks, summary_chunks = await asyncio.gather(
                run_vector_agent(aspect_query),
                run_keyword_agent(aspect_query),
                run_summary_agent(aspect_query),
            )
            
            merged_chunks = retrieval_service.merge_results(
                vector_results=vector_results,
                keyword_chunks=keyword_chunks,
                summary_chunks=summary_chunks,
                search_terms=retrieval_service._extract_search_terms(aspect_query),
                query=aspect_query,
                query_profile=describe_query_profile(aspect_query),
                top_k=RESEARCH_TOP_K,
            )
                
            vector_hits += len(vector_results)
            keyword_hits += len(keyword_chunks)
            summary_hits += len(summary_chunks)
            all_chunks[aspect].extend(merged_chunks)

    final_chunks = {}
    for aspect, chunks in all_chunks.items():
        final_chunks[aspect] = deduplicate_chunks(chunks)

    retrieved_chunks = {}
    citations = {}
    graph_chunks = state.get("graph_chunks") or {}
    if isinstance(graph_chunks, list):
        graph_chunks = {"general": graph_chunks}
    
    for aspect in final_chunks:
        retrieved_chunks[aspect] = deduplicate_chunks(final_chunks[aspect] + graph_chunks.get(aspect, []))
        citations[aspect] = retrieved_chunks[aspect]
        
    for aspect in graph_chunks:
        if aspect not in retrieved_chunks:
            retrieved_chunks[aspect] = deduplicate_chunks(graph_chunks[aspect])
            citations[aspect] = retrieved_chunks[aspect]

    total_chunks = sum(len(c) for c in final_chunks.values())
    fusion_thought = f"Evidence fusion kept {total_chunks} unique chunks across {len(final_chunks)} aspect(s)."
    
    trace_logs = append_trace(state, "Vector Researcher", "completed", f"Vector agent searched with aspects and found candidates.")
    trace_logs = trace_logs + [{"name": "Evidence Fusion", "status": "completed", "thought": fusion_thought}]

    return {
        **state,
        "document_chunks": final_chunks,
        "retrieved_chunks": retrieved_chunks,
        "citations": citations,
        "trace_logs": trace_logs,
    }


async def graph_researcher_node(state: AgentState) -> AgentState:
    db = state.get("db")
    file_id = UUID(state["file_id"]) if state.get("file_id") and state["file_id"] != "all" else None
    retries = state.get("retries", 0)

    document_chunks = state.get("document_chunks") or {}
    graph_chunks = state.get("graph_chunks") or {}
    if isinstance(document_chunks, list):
        document_chunks = {"general": document_chunks}
    if isinstance(graph_chunks, list):
        graph_chunks = {"general": graph_chunks}
        
    graph_findings = list(state.get("graph_findings", []))

    sub_queries = state.get("sub_queries", [state["user_query"]])
    required_aspects = state.get("required_aspects") or ["general"]
    search_queries = sub_queries if retries == 0 else [sub_queries[-1]]
    
    linked_chunk_ids: List[str] = []

    for aspect in required_aspects:
        if aspect not in graph_chunks:
            graph_chunks[aspect] = []
            
        for sub_query in search_queries:
            aspect_query = f"{sub_query} {aspect}" if aspect != "general" else sub_query
            graph_results = await graph_service.search_graph(aspect_query, file_id, db)
            if graph_results:
                graph_findings.extend(graph_results)
                for result in graph_results:
                    if result.get("chunk_id"):
                        linked_chunk_ids.append(str(result["chunk_id"]))

    doc_chunk_ids = []
    for chunks in document_chunks.values():
        doc_chunk_ids.extend([str(c.get("chunk_id")) for c in chunks if c.get("chunk_id")])
        
    doc_and_graph_chunk_ids = [c for c in doc_chunk_ids if c != "graph-context"] + linked_chunk_ids

    graph_context = await graph_service.get_entity_context(sorted(set(doc_and_graph_chunk_ids)))
    if graph_context:
        for aspect in required_aspects:
            graph_chunks[aspect].append(
                {
                    "chunk_id": "graph-context",
                    "file_id": "Knowledge Graph",
                    "page_number": "-",
                    "content": graph_context,
                }
            )

    final_graph_chunks = {}
    retrieved_chunks = {}
    citations = {}
    
    for aspect in required_aspects:
        final_graph_chunks[aspect] = deduplicate_chunks(graph_chunks.get(aspect, []))
        combined = deduplicate_chunks(document_chunks.get(aspect, []) + final_graph_chunks[aspect])
        retrieved_chunks[aspect] = combined
        citations[aspect] = combined

    thought = f"Expanded evidence with graph context for {len(required_aspects)} aspect(s)."

    return {
        **state,
        "graph_chunks": final_graph_chunks,
        "graph_findings": graph_findings,
        "retrieved_chunks": retrieved_chunks,
        "citations": citations,
        "trace_logs": append_trace(state, "Graph Researcher", "completed", thought),
    }

async def critic_node(state: AgentState) -> AgentState:
    chunks_dict = state.get("retrieved_chunks", {})
    if isinstance(chunks_dict, list):
        chunks_dict = {"general": chunks_dict}
        
    all_chunks = []
    for aspect_chunks in chunks_dict.values():
        all_chunks.extend(aspect_chunks)
        
    query = state["user_query"]
    retries = state.get("retries", 0)

    if not all_chunks:
        is_sufficient = False
        missing_info = "No relevant context found."
    else:
        context_parts = []
        for index, chunk in enumerate(all_chunks[:10]):
            context_parts.append(f"[{index + 1}]: {chunk['content']}")
        context_str = "\\n".join(context_parts)
        prompt = f"""You are the critic agent in a multi-agent RAG workflow.
User Query: "{query}"

Retrieved Context:
{context_str}

Decide whether the team has enough evidence to answer the user well.
Be flexible about terminology. If the context contains the concrete facts behind an abstract query, it is sufficient.
Allow for STRONGLY INFERABLE facts from entity resolution. For example, if the query asks for "A's real name" and the text says "B, also known as A...", you may deduce that B is the real name. Do not say evidence is missing if it can be logically inferred from entity aliases.

Return EXACTLY valid JSON:
{{
  "is_sufficient": true or false,
  "missing_info": "what is still missing",
  "follow_up_query": "one better search query when evidence is insufficient",
  "diagnostics": "Retrieval failed vs Missing in corpus",
  "coverage_report": "- Aspect: status"
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
            is_sufficient = len(all_chunks) > 0
            missing_info = ""
            follow_up_query = ""

    if not all_chunks:
        follow_up_query = state["user_query"]

    if not is_sufficient and retries < 2:
        if not follow_up_query:
            new_query_prompt = f"""The user asked: "{query}"
The current evidence is not sufficient. Missing information: {missing_info}

Generate ONE concrete alternative search query for books or notes.
Return ONLY the query string."""
            try:
                follow_up_query = await llm_service.chat([{"role": "user", "content": new_query_prompt}])
                follow_up_query = follow_up_query.strip(' "\'')
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
    chunks_by_aspect = state.get("retrieved_chunks") or {}
    coverage_report = state.get("coverage_report") or "No coverage report generated."
    query = state["user_query"]
    history_text = format_history(state.get("conversation_history", []))

    context_parts = []
    citations = []
    global_index = 0

    for aspect, chunks in chunks_by_aspect.items():
        if chunks:
            context_parts.append(f"\n=== Evidence for Aspect: {aspect} ===")
            for chunk in chunks:
                citations.append(chunk)
                context_parts.append(
                    f"Source [{global_index + 1}] (File: {chunk['file_id']}, Page: {chunk.get('page_number', '-') }):\n{chunk['content']}"
                )
                global_index += 1

    context_str = "\n".join(context_parts)

    system_prompt = (
        "You are the synthesis agent for InsightGraph Agent.\n"
        "Answer the user's question based ONLY on the provided context.\n"
        "You must structure your answer clearly and fluidly.\n"
        "CRITICAL INSTRUCTION: Do NOT include internal coverage reports, statuses (e.g., 'Status: Missing'), or diagnostics in your output.\n"
        "Allow for STRONGLY INFERABLE facts from entity resolution. For example, if the query asks for 'A's real name' and the text says 'B, also known as A...', you may deduce that B is the real name and answer directly.\n"
        "If evidence is lacking for some aspects, you may naturally mention 'The provided context does not contain information about X' as a brief sentence.\n"
        "Always cite your sources using [Source X] format.\n"
    )

    user_prompt = f"Conversation History:\n{history_text or 'None'}\n\nContext:\n{context_str}\n\nQuestion: {query}"

    try:
        response = await llm_service.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        thought = f"Synthesized answer using {len(citations)} sources."
    except Exception as exc:
        response = f"Failed to generate answer: {exc}"
        thought = "Synthesis failed."

    return {
        **state,
        "final_answer": response,
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
