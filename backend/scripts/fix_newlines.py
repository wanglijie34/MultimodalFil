import asyncio
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.session import SessionLocal
from app.models.book import Chapter
from sqlalchemy.future import select

async def fix_newlines():
    async with SessionLocal() as db:
        print("Fetching chapters...")
        result = await db.execute(select(Chapter))
        chapters = result.scalars().all()
        
        updated_count = 0
        for chapter in chapters:
            if '\\n' in chapter.content_text:
                chapter.content_text = chapter.content_text.replace('\\n', '\n')
                updated_count += 1
                
        if updated_count > 0:
            await db.commit()
            print(f"Fixed {updated_count} chapters.")
        else:
            print("No chapters needed fixing.")

if __name__ == "__main__":
    asyncio.run(fix_newlines())
