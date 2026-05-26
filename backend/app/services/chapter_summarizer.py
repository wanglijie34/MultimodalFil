import json
import uuid
import asyncio
from typing import List, Dict, Any
from loguru import logger
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.book import Book, Chapter, ChapterSummary
from app.services.llm_service import llm_service

class ChapterSummarizerService:
    def __init__(self):
        self.max_chars = 15000  # Context window allowance for summary
        
    async def summarize_book_chapters(self, book_id: uuid.UUID):
        """Background task to summarize all chapters of a book."""
        logger.info(f"Starting background summarization for book {book_id}")
        
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Chapter).where(Chapter.book_id == book_id))
                chapters = result.scalars().all()
                
                for chapter in chapters:
                    # Skip if already summarized
                    existing = await db.get(ChapterSummary, chapter.id)
                    if existing:
                        continue
                        
                    # Skip if text is too short to be meaningful
                    text = chapter.content_text.strip()
                    if len(text) < 200:
                        short_summary = ChapterSummary(
                            chapter_id=chapter.id,
                            summary="Chapter is too short for an AI summary.",
                            bullets=[],
                            tags=["Short Chapter"],
                            keywords=[]
                        )
                        db.add(short_summary)
                        await db.commit()
                        logger.info(f"Skipped summarizing short chapter {chapter.id} ({chapter.title})")
                        continue
                        
                    await self._summarize_chapter(db, chapter)
                    
        except Exception as e:
            logger.error(f"Failed during book summarization task for {book_id}: {e}")

    async def _summarize_chapter(self, db: AsyncSession, chapter: Chapter):
        """Summarize a single chapter and save to DB."""
        text = chapter.content_text
        if len(text) > self.max_chars:
            text = text[:self.max_chars] + "...\n[Content truncated for summary]"
            
        system_prompt = (
            "You are an expert literary and technical summarizer. Your task is to analyze the following chapter text "
            "and extract a concise summary, key bullet points, overarching tags, and keywords.\n\n"
            "Return the result strictly as a valid JSON object with no markdown wrappers or additional text. "
            "Use the exact following JSON schema:\n"
            "{\n"
            "  \"summary\": \"One concise sentence summarizing the core essence of this chapter.\",\n"
            "  \"bullets\": [\"Point 1\", \"Point 2\", \"Point 3\", \"Point 4\", \"Point 5\"],\n"
            "  \"tags\": [\"Tag1\", \"Tag2\", \"Tag3\"],\n"
            "  \"keywords\": [\"keyword1\", \"keyword2\", \"keyword3\"]\n"
            "}\n\n"
            "Constraints:\n"
            "- 'bullets' should have 3 to 5 items maximum.\n"
            "- 'tags' should be 2 to 4 high-level categories (e.g., 'History', 'Technology', 'Character Development').\n"
            "- 'keywords' should be 3 to 6 specific entities, terms, or concepts mentioned.\n"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Chapter Title: {chapter.title}\n\nChapter Content:\n{text}"}
        ]
        
        try:
            response = await llm_service.chat(messages)
            
            # Clean up response if it has markdown block
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
                
            data = json.loads(clean_response.strip())
            
            summary = ChapterSummary(
                chapter_id=chapter.id,
                summary=data.get("summary", "No summary available."),
                bullets=data.get("bullets", [])[:5],
                tags=data.get("tags", [])[:4],
                keywords=data.get("keywords", [])[:6]
            )
            
            db.add(summary)
            await db.commit()
            logger.info(f"Successfully summarized chapter {chapter.id} ({chapter.title})")
            
        except Exception as e:
            logger.error(f"Failed to summarize chapter {chapter.id} ({chapter.title}): {e}")
            await db.rollback()
            try:
                fail_summary = ChapterSummary(
                    chapter_id=chapter.id,
                    summary="Failed to generate AI summary.",
                    bullets=[],
                    tags=["Error"],
                    keywords=[]
                )
                db.add(fail_summary)
                await db.commit()
            except Exception as ie:
                logger.error(f"Failed to save fallback summary for {chapter.id}: {ie}")
                await db.rollback()

chapter_summarizer = ChapterSummarizerService()
