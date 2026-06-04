import asyncio
from app.db.session import engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.book import Book, Chapter

async def main():
    async with AsyncSession(engine) as session:
        result = await session.exec(select(Book).order_by(Book.created_at.desc()).limit(1))
        book = result.first()
        print(f'Book: {book.title}')
        result = await session.exec(select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.order_index))
        chapters = result.all()
        print(f'Total chapters: {len(chapters)}')
        for c in chapters[:15]:
            print(f'[{c.order_index}] {c.title} (Level {c.level}) - Content length: {len(c.content_text)}')
            print(f'Excerpt: {repr(c.content_text[:50])}')

if __name__ == "__main__":
    asyncio.run(main())
