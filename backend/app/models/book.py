from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

if TYPE_CHECKING:
    from app.models.file import File

class Book(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    source_file_id: UUID = Field(foreign_key="file.id")
    
    title: str
    author: Optional[str] = None
    language: Optional[str] = None
    description: Optional[str] = None
    cover_path: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    source_file: "File" = Relationship()
    chapters: List["Chapter"] = Relationship(
        back_populates="book",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class Chapter(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    book_id: UUID = Field(foreign_key="book.id")
    
    title: str
    level: int = Field(default=1)
    order_index: int = Field(default=0)
    
    src_href: Optional[str] = None
    anchor: Optional[str] = None
    
    content_text: str = Field(default="")
    book: Book = Relationship(back_populates="chapters")

class ReadingProgress(SQLModel, table=True):
    user_id: UUID = Field(foreign_key="user.id", primary_key=True)
    book_id: UUID = Field(foreign_key="book.id", primary_key=True)
    chapter_id: UUID = Field(foreign_key="chapter.id")
    
    scroll_offset: float = Field(default=0.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
