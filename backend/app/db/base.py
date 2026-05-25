# Import all models here for Alembic or SQLModel discovery
from sqlmodel import SQLModel
from app.models.user import User, Workspace
from app.models.file import File, Folder, Tag, FileTag, DocumentPage, DocumentChunk, FileAsset
from app.models.graph import Entity, ChunkEntity, EntityRelation
from app.models.agent import AgentRun, AgentStep, AgentMessage, Citation, AgentRunTitle, AgentRunPreference
from app.models.report import Report
from app.models.book import Book, Chapter

class Base(SQLModel):
    pass
