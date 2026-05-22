from typing import Dict, Any
from uuid import UUID
from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.services.retrieval_service import retrieval_service
from app.services.rag_service import rag_service
from app.services.llm_service import llm_service
from loguru import logger

# Nodes
async def router_node(state: AgentState) -> AgentState:
    logger.info("Agent: Routing and Planning")
    query = state["user_query"]
    
    prompt = f"""You are a planner for InsightGraph Agent. Analyze the query: "{query}"
    Decide:
    1. Search Mode: 'local' (for specific facts), 'global' (for summaries/themes), or 'hybrid'.
    2. Task Type: 'simple_qa', 'comparison', or 'complex_analysis'.
    
    Return JSON: {{"search_mode": "...", "task_type": "..."}}"""
    
    try:
        response = await llm_service.chat([{"role": "user", "content": prompt}])
        # Extract JSON (simplified)
        import json
        plan = json.loads(response[response.find("{"):response.rfind("}")+1])
        return {**state, "task_type": plan["task_type"], "errors": [plan["search_mode"]]} # Using errors list as a temporary state carrier
    except:
        return {**state, "task_type": "simple_qa"}

async def retrieval_node(state: AgentState) -> AgentState:
    # In a real implementation, we'd use the search_mode from state
    logger.info(f"Agent: Performing Retrieval for {state['user_query']}")
    # This node would call retrieval_service with the correct mode
    return state

async def verifier_node(state: AgentState) -> AgentState:
    logger.info("Agent: Verifying evidence sufficiency")
    # Simulation: if it's the first run, we might want more data
    needs_retry = len(state.get("retrieved_chunks", [])) < 3
    
    return {
        **state, 
        "verification_result": {
            "is_sufficient": not needs_retry,
            "reason": "Need more diverse sources" if needs_retry else "Evidence looks good"
        }
    }

async def writer_node(state: AgentState) -> AgentState:
    logger.info("Agent: Generating final answer")
    return {**state, "final_answer": "Final synthesized answer with research-backed improvements."}

def build_agent_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("router", router_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("verifier", verifier_node)
    workflow.add_node("writer", writer_node)
    
    workflow.add_edge(START, "router")
    workflow.add_edge("router", "retrieval")
    workflow.add_edge("retrieval", "verifier")
    
    # Conditional edge for the verification loop
    workflow.add_conditional_edges(
        "verifier",
        lambda x: "retrieval" if not x["verification_result"]["is_sufficient"] else "writer",
        {
            "retrieval": "retrieval",
            "writer": "writer"
        }
    )
    
    workflow.add_edge("writer", END)
    
    return workflow.compile()

agent_executor = build_agent_graph()
