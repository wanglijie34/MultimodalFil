from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

class FileBase(BaseModel):
    original_filename: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: int

class FileRead(FileBase):
    id: UUID
    workspace_id: UUID
    folder_id: Optional[UUID] = None
    uploader_id: UUID
    status: str
    error_message: Optional[str] = None
    page_count: int
    chunk_count: int
    asset_count: int
    entity_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    file_id: UUID
    filename: str
    status: str
    message: str

class FolderRead(BaseModel):
    id: UUID
    workspace_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    created_at: datetime

    class Config:
        from_attributes = True

class TagRead(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True
