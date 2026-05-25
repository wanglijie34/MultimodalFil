import json
from typing import Dict, Any
from loguru import logger
from app.services.llm_service import llm_service

class ConceptService:
    async def parse_concept(self, query: str) -> Dict[str, Any]:
        """
        Parses a query into structural components.
        For example: "万历三大征是什么" -> canonical_concept, aliases, members, related_entities
        """
        prompt = f"""You are an advanced conceptual analysis engine.
Analyze the user's query and extract the core concepts, especially if it refers to a collective term, historical event, technical framework, or abstract definition.

Query: "{query}"

Output MUST be EXACTLY valid JSON with the following structure:
{{
  "canonical_concept": "The formal name of the core subject (e.g., '万历三大征')",
  "aliases": ["Alias1", "Alternative Name"],
  "members": ["Member 1", "Member 2", "Member 3"], // If the concept is a collective term (like "三大征"), list the explicit members (e.g., ["宁夏之役", "朝鲜之役", "播州之役"]). Otherwise empty.
  "related_entities": ["Entity A", "Entity B"] // Broad related concepts, people, or places
}}"""

        try:
            response = await llm_service.chat([{"role": "user", "content": prompt}])
            json_str = response[response.find("{") : response.rfind("}") + 1]
            result = json.loads(json_str)
            return {
                "canonical_concept": result.get("canonical_concept", query),
                "aliases": result.get("aliases", []),
                "members": result.get("members", []),
                "related_entities": result.get("related_entities", []),
            }
        except Exception as e:
            logger.error(f"Concept parsing failed: {e}")
            return {
                "canonical_concept": query,
                "aliases": [],
                "members": [],
                "related_entities": [],
            }

concept_service = ConceptService()
