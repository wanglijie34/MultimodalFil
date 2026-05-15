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
    logger.info("Agent: Routing query")
    query = state["user_query"]
    
    prompt = f"""Classify the following user query into one of these categories:
    - 'simple_qa': A direct question that can be answered with a few facts.
    - 'document_search': A request to find specific documents or information across many documents.
    - 'comparison': A request to compare different aspects or viewpoints.
    
    Query: {query}
    Category (return only the category name):"""
    
    task_type = await llm_service.chat([{"role": "user", "content": prompt}])
    task_type = task_type.strip().lower()
    if task_type not in ["simple_qa", "document_search", "comparison"]:
        task_type = "simple_qa"
        
    return {**state, "task_type": task_type}

async def retrieval_node(state: AgentState) -> AgentState:
    logger.info(f"Agent: Retrieving for task {state['task_type']}")
    # Note: We'd need a way to pass DB session here, 
    # but for LangGraph we might need to use a service that handles its own session 
    # or pass a factory. For MVP, we'll assume a global-ish session or use a helper.
    # To keep it clean, we'll assume the caller provides what's needed or we use a sync-over-async trick.
    # Actually, we'll just import rag_service and retrieval_service which are ready.
    
    # We'll use a placeholder for db for now or assume retrieval_service can be called.
    # This is tricky because of the async session.
    # We'll skip the actual DB call here and use a service that can be called with a session.
    return state

async def writer_node(state: AgentState) -> AgentState:
    logger.info("Agent: Generating final answer")
    # Placeholder for actual RAG logic
    return {**state, "final_answer": "Final answer from Agent."}

def build_agent_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("router", router_node)
    workflow.add_node("retrieval", retrieval_node)
    workflow.add_node("writer", writer_node)
    
    workflow.add_edge(START, "router")
    workflow.add_edge("router", "retrieval")
    workflow.add_edge("retrieval", "writer")
    workflow.add_edge("writer", END)
    
    return workflow.compile()

agent_executor = build_agent_graph()
