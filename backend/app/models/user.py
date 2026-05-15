from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    display_name: Optional[str] = None
    password_hash: str
    role: str = Field(default="user")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspaces: List["Workspace"] = Relationship(back_populates="owner")
    uploaded_files: List["File"] = Relationship(back_populates="uploader")
    agent_runs: List["AgentRun"] = Relationship(back_populates="user")
    reports: List["Report"] = Relationship(back_populates="user")

class Workspace(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="user.id")
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    owner: User = Relationship(back_populates="workspaces")
    files: List["File"] = Relationship(back_populates="workspace")
    folders: List["Folder"] = Relationship(back_populates="workspace")
    tags: List["Tag"] = Relationship(back_populates="workspace")
    entities: List["Entity"] = Relationship(back_populates="workspace")
    agent_runs: List["AgentRun"] = Relationship(back_populates="workspace")
    reports: List["Report"] = Relationship(back_populates="workspace")
