from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

if TYPE_CHECKING:
    from app.models.user import User, Workspace

from app.models.graph import Entity, ChunkEntity

class FileTag(SQLModel, table=True):
    file_id: UUID = Field(foreign_key="file.id", primary_key=True)
    tag_id: UUID = Field(foreign_key="tag.id", primary_key=True)

class Tag(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str
    color: Optional[str] = None
    
    workspace: "Workspace" = Relationship(back_populates="tags")
    files: List["File"] = Relationship(back_populates="tags", link_model=FileTag)

class Folder(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    parent_id: Optional[UUID] = Field(default=None, foreign_key="folder.id")
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: "Workspace" = Relationship(back_populates="folders")
    files: List["File"] = Relationship(back_populates="folder")
    children: List["Folder"] = Relationship(back_populates="parent")
    parent: Optional["Folder"] = Relationship(back_populates="children", sa_relationship_kwargs={"remote_side": "Folder.id"})

class File(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    folder_id: Optional[UUID] = Field(default=None, foreign_key="folder.id")
    uploader_id: UUID = Field(foreign_key="user.id")

    original_filename: str
    stored_filename: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: int

    storage_bucket: str
    storage_key: str

    status: str = Field(default="uploaded")
    error_message: Optional[str] = None

    page_count: int = Field(default=0)
    chunk_count: int = Field(default=0)
    asset_count: int = Field(default=0)
    entity_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: "Workspace" = Relationship(back_populates="files")
    folder: Optional[Folder] = Relationship(back_populates="files")
    uploader: "User" = Relationship(back_populates="uploaded_files")
    pages: List["DocumentPage"] = Relationship(back_populates="file")
    chunks: List["DocumentChunk"] = Relationship(back_populates="file")
    assets: List["FileAsset"] = Relationship(back_populates="file")
    tags: List[Tag] = Relationship(back_populates="files", link_model=FileTag)

class DocumentPage(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID = Field(foreign_key="file.id")
    page_number: int
    text_content: Optional[str] = None
    preview_image_key: Optional[str] = None
    thumbnail_key: Optional[str] = None # Added for visual preview
    width: Optional[float] = None
    height: Optional[float] = None
    meta: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON, sa_column_kwargs={"name": "metadata"})
    created_at: datetime = Field(default_factory=datetime.utcnow)

    file: File = Relationship(back_populates="pages")

class DocumentChunk(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID = Field(foreign_key="file.id")
    parent_id: Optional[UUID] = Field(default=None, foreign_key="documentchunk.id") # Added for RAPTOR
    is_summary: bool = Field(default=False) # Added for RAPTOR
    level: int = Field(default=0) # Added for RAPTOR hierarchy level
    page_number: Optional[int] = None
    chunk_index: int
    modality: str = Field(default="text")
    content: str
    token_count: int = Field(default=0)
    meta: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON, sa_column_kwargs={"name": "metadata"})

    file: File = Relationship(back_populates="chunks")
    entities: List["Entity"] = Relationship(back_populates="chunks", link_model=ChunkEntity)
    # Hierarchy relationships
    children: List["DocumentChunk"] = Relationship(back_populates="parent")
    parent: Optional["DocumentChunk"] = Relationship(
        back_populates="children", 
        sa_relationship_kwargs={"remote_side": "DocumentChunk.id"}
    )

class FileAsset(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    file_id: UUID = Field(foreign_key="file.id")
    page_number: Optional[int] = None
    asset_type: str  # image, table
    storage_key: str
    caption: Optional[str] = None
    ocr_text: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict, sa_type=JSON, sa_column_kwargs={"name": "metadata"})

    file: File = Relationship(back_populates="assets")
