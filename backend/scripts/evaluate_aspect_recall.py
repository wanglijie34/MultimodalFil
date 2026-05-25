import asyncio
import json
import argparse
from typing import List, Dict
from loguru import logger

# Try to import backend modules. This assumes it's run from the backend directory.
try:
    from app.agents.graph import app as agent_app
    from app.core.database import async_session
except ImportError:
    logger.warning("Could not import app modules. Make sure you run this script from the backend directory.")
    agent_app = None
    async_session = None

TEST_DATA = [
    {
        "query": "分析马斯克在特斯拉和SpaceX的成就及他面临的争议",
        "expected_aspects": ["成就", "特斯拉", "SpaceX", "争议"]
    },
    {
        "query": "人工智能的发展历史及其在医疗领域的应用与挑战",
        "expected_aspects": ["历史", "医疗应用", "挑战"]
    },
    {
        "query": "全球变暖对海洋生态系统的影响以及各国的应对策略",
        "expected_aspects": ["海洋生态影响", "应对策略"]
    },
    # Can be expanded up to 20-50 queries
]

async def run_evaluation(queries: List[Dict]):
    if not agent_app or not async_session:
        logger.error("Agent app or DB session not available.")
        return

    results = []
    total_expected = 0
    total_covered = 0

    for idx, item in enumerate(queries):
        query = item["query"]
        expected_aspects = item["expected_aspects"]
        logger.info(f"[{idx+1}/{len(queries)}] Evaluating query: {query}")
        
        state = {
            "user_query": query,
            "conversation_history": [],
            "retries": 0,
            "sub_queries": [],
            "document_chunks": {},
            "graph_chunks": {},
            "graph_findings": [],
            "retrieved_chunks": {},
            "citations": {},
            "trace_logs": [],
        }

        async with async_session() as db:
            state["db"] = db
            try:
                final_state = await agent_app.ainvoke(state)
            except Exception as e:
                logger.error(f"Error invoking agent: {e}")
                continue

            coverage_report = final_state.get("coverage_report", {})
            required_aspects = final_state.get("required_aspects", [])
            
            # Count coverage based on the report
            # If the planner extracted aspects that semantically match our expected ones
            # and coverage is "full" or "partial"
            covered_aspects = [asp for asp, status in coverage_report.items() if status in ["full", "partial"]]
            
            # Simple heuristic: how many extracted aspects were covered vs total extracted
            # For a rigorous eval, you'd use an LLM-as-a-judge to compare `expected_aspects` with the `final_answer`.
            
            extracted_covered = len(covered_aspects)
            extracted_total = len(required_aspects) if required_aspects else 1
            
            total_expected += extracted_total
            total_covered += extracted_covered
            
            results.append({
                "query": query,
                "expected_aspects": expected_aspects,
                "extracted_aspects": required_aspects,
                "coverage_report": coverage_report,
                "recall_ratio": f"{extracted_covered}/{extracted_total}",
                "final_answer": final_state.get("final_answer", "")[:100] + "..." # truncated
            })

    # Output metrics
    overall_recall = (total_covered / total_expected) * 100 if total_expected > 0 else 0
    logger.info(f"=== Evaluation Complete ===")
    logger.info(f"Total Queries: {len(results)}")
    logger.info(f"Overall Aspect Recall/Coverage: {overall_recall:.2f}% ({total_covered}/{total_expected})")
    
    with open("aspect_evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    logger.info("Detailed results saved to aspect_evaluation_results.json")

def main():
    parser = argparse.ArgumentParser(description="Evaluate multi-aspect RAG recall and coverage.")
    parser.add_argument("--samples", type=int, default=3, help="Number of samples to run from TEST_DATA (max 50).")
    args = parser.parse_args()
    
    test_subset = TEST_DATA[:args.samples]
    asyncio.run(run_evaluation(test_subset))

if __name__ == "__main__":
    main()
