from typing import List, Optional, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

if TYPE_CHECKING:
    from app.models.user import Workspace
    from app.models.file import DocumentChunk

class ChunkEntity(SQLModel, table=True):
    chunk_id: UUID = Field(foreign_key="documentchunk.id", primary_key=True)
    entity_id: UUID = Field(foreign_key="entity.id", primary_key=True)

class Entity(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str = Field(index=True)
    type: str = Field(index=True)
    description: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON, sa_column_kwargs={"name": "metadata"})

    workspace: "Workspace" = Relationship(back_populates="entities")
    chunks: List["DocumentChunk"] = Relationship(back_populates="entities", link_model=ChunkEntity)

class EntityRelation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    source_id: UUID = Field(foreign_key="entity.id")
    target_id: UUID = Field(foreign_key="entity.id")
    relation_type: str
    description: Optional[str] = None
    confidence: float = Field(default=1.0)
    meta: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON, sa_column_kwargs={"name": "metadata"})
