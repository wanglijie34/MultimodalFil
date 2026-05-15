from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship

class Report(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    workspace_id: UUID = Field(foreign_key="workspace.id")
    title: str
    content: str # Markdown
    status: str = Field(default="generated")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="reports")
    workspace: "Workspace" = Relationship(back_populates="reports")
