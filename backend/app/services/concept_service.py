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
        prompt = f"""You are an advanced conceptual and entity analysis engine.
Analyze the user's query and extract the core concepts, especially if it refers to a collective term, historical event, technical framework, abstract definition, or a specific entity (person, organization, etc.).
For entities, perform entity normalization (e.g. resolve "万历" to "明神宗" or "朱翊钧").

Query: "{query}"

Output MUST be EXACTLY valid JSON with the following structure:
{{
  "canonical_concept": "The formal, full true name of the core subject (e.g., '明神宗' or '万历三大征')",
  "aliases": ["Alias1", "Alternative Name", "Common Name"],
  "members": ["Member 1", "Member 2", "Member 3"], // If collective term, list explicit members
  "related_entities": ["Entity A", "Entity B"], // Broad related concepts
  "target_attributes": ["name", "date of birth"] // If the user asks for specific properties (e.g. "真名", "出生年份"), list them here
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
                "target_attributes": result.get("target_attributes", []),
            }
        except Exception as e:
            logger.error(f"Concept parsing failed: {e}")
            return {
                "canonical_concept": query,
                "aliases": [],
                "members": [],
                "related_entities": [],
                "target_attributes": [],
            }

concept_service = ConceptService()
