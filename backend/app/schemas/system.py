from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_files: int
    agent_runs: int
    knowledge_entities: int
    storage_used_bytes: int
