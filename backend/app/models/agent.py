from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

if TYPE_CHECKING:
    from app.models.user import User, Workspace

class AgentRun(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    workspace_id: UUID = Field(foreign_key="workspace.id")
    query: str
    status: str = Field(default="pending")
    result: Optional[str] = None
    token_usage: int = Field(default=0)
    latency: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="agent_runs")
    workspace: "Workspace" = Relationship(back_populates="agent_runs")
    steps: List["AgentStep"] = Relationship(back_populates="run")
    messages: List["AgentMessage"] = Relationship(back_populates="run")
    citations: List["Citation"] = Relationship(back_populates="run")

class AgentStep(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    run_id: UUID = Field(foreign_key="agentrun.id")
    agent_name: str
    step_name: str
    input: Optional[str] = None
    output: Optional[str] = None
    latency: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    run: AgentRun = Relationship(back_populates="steps")

class AgentMessage(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    run_id: UUID = Field(foreign_key="agentrun.id")
    role: str # user, assistant, system
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    run: AgentRun = Relationship(back_populates="messages")
    citations: List["Citation"] = Relationship(back_populates="message")

class Citation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    run_id: UUID = Field(foreign_key="agentrun.id")
    message_id: Optional[UUID] = Field(default=None, foreign_key="agentmessage.id")
    file_id: UUID = Field(foreign_key="file.id")
    chunk_id: Optional[UUID] = Field(default=None, foreign_key="documentchunk.id")
    page_number: Optional[int] = None
    quote: Optional[str] = None
    score: float = Field(default=0.0)

    run: AgentRun = Relationship(back_populates="citations")
    message: Optional[AgentMessage] = Relationship(back_populates="citations")
