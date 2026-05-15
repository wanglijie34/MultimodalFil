from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class AgentState(TypedDict):
    prompt: str
    plan: str
    answer: str


def plan_step(state: AgentState) -> AgentState:
    prompt = state["prompt"]
    return {
        **state,
        "plan": f"Use LangGraph-first orchestration for: {prompt}",
    }


def answer_step(state: AgentState) -> AgentState:
    return {
        **state,
        "answer": (
            "Workflow ready. LangGraph is the primary orchestrator, while "
            "LangChain and LlamaIndex can be attached as helper layers."
        ),
    }


def build_workflow():
    graph = StateGraph(AgentState)
    graph.add_node("plan", plan_step)
    graph.add_node("answer", answer_step)
    graph.add_edge(START, "plan")
    graph.add_edge("plan", "answer")
    graph.add_edge("answer", END)
    return graph.compile()
