import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.book import Book, Chapter
from app.services.book_extractor import book_extractor

router = APIRouter()

@router.post("/extract/{file_id}", response_model=dict)
async def extract_book(file_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Extract a book from an uploaded EPUB file."""
    book = await book_extractor.extract_book_from_file(db, file_id)
    if not book:
        raise HTTPException(status_code=400, detail="Failed to extract book. Check if the file is a valid EPUB.")
    return {"message": "Book extracted successfully", "book_id": book.id}

@router.get("", response_model=List[dict])
async def list_books(db: AsyncSession = Depends(get_db)):
    """List all extracted books."""
    result = await db.execute(select(Book).order_by(Book.created_at.desc()))
    books = result.scalars().all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "language": b.language,
            "description": b.description,
            "cover_path": b.cover_path,
            "created_at": b.created_at
        } for b in books
    ]

@router.get("/{book_id}", response_model=dict)
async def get_book(book_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get book details and chapter list (without full text)."""
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
        
    result = await db.execute(select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.order_index))
    chapters = result.scalars().all()
    
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "description": book.description,
        "cover_path": book.cover_path,
        "language": book.language,
        "chapters": [
            {
                "id": c.id,
                "title": c.title,
                "level": c.level,
                "order_index": c.order_index
            } for c in chapters
        ]
    }

@router.get("/{book_id}/chapters/{chapter_id}", response_model=dict)
async def get_chapter(book_id: uuid.UUID, chapter_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get full text for a specific chapter."""
    chapter = await db.get(Chapter, chapter_id)
    if not chapter or chapter.book_id != book_id:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    return {
        "id": chapter.id,
        "title": chapter.title,
        "content_text": chapter.content_text,
        "level": chapter.level
    }
