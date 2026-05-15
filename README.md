# InsightGraph Agent

InsightGraph Agent is a production-style multimodal knowledge-agent web system that turns your documents into a searchable vector index and a knowledge graph. It uses AI agents to search, reason, verify, and generate source-grounded answers and reports.

## 🚀 Features

- **File Management**: Upload and manage PDF, Word, PowerPoint, Text, and Markdown files.
- **Multimodal Ingestion**: Automatic parsing, chunking, and indexing of various document formats.
- **Hybrid Retrieval**: Combines semantic vector search (Qdrant) with keyword search (PostgreSQL).
- **GraphRAG**: Automatically extracts entities and relations to build a knowledge graph (Neo4j).
- **Agentic Workflows**: Multi-step reasoning using LangGraph to provide verified, cited answers.
- **Report Generation**: Automatically generate comprehensive Markdown reports based on your knowledge base.
- **Execution Tracing**: Real-time visualization of the Agent's reasoning steps.

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI, Pydantic, SQLModel, SQLAlchemy.
- **Databases**: PostgreSQL (Metadata), Qdrant (Vectors), Neo4j (Graph), Redis (Queue/Cache).
- **Storage**: MinIO (Object Storage).
- **AI/Agent**: LangGraph, LangChain, Google Gemini / OpenAI.

## 📦 Getting Started

### Prerequisites

- Docker and Docker Compose
- API Key for Google Gemini (recommended) or OpenAI

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MultimodalFile
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY or OPENAI_API_KEY
   ```

3. Start the system:
   ```bash
   docker compose up -d
   ```

4. Access the applications:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API Docs: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

## 📖 API Examples

### Upload a File
```bash
curl -X POST http://localhost:8000/api/v1/files/upload \
  -F "file=@document.pdf"
```

### Search
```bash
curl "http://localhost:8000/api/v1/search?query=what+is+graphrag"
```

### Ask Agent
```bash
curl -X POST "http://localhost:8000/api/v1/agent/runs?query=Compare+RAG+designs"
```

## 🗺️ Project Status

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed progress and roadmap.

## 📄 License

MIT
