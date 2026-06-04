import asyncio
from app.db.session import engine
from sqlmodel import Session, select
from app.models.book import Book, Chapter
with Session(engine) as session:
    book = session.exec(select(Book).order_by(Book.created_at.desc()).limit(1)).first()
    print(f'Book: {book.title}')
    chapters = session.exec(select(Chapter).where(Chapter.book_id == book.id).order_by(Chapter.order_index)).all()
    print(f'Total chapters: {len(chapters)}')
    for c in chapters[:15]:
        print(f'[{c.order_index}] {c.title} (Level {c.level}) - Content length: {len(c.content_text)}')
        print(f'Excerpt: {repr(c.content_text[:50])}')
