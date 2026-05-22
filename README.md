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



 当前项目的启动命令有以下两种主要方式：

  ### 1. 使用 Docker Compose 整体启动（推荐）

  在项目根目录下，直接使用 Docker Compose
  启动包含前端、后端以及所有依赖服务（PostgreSQL, Qdrant, Neo4j, MinIO,
  Redis）：

    docker compose up -d

  • 前端访问地址：http://localhost:3000
  • 后端 API 文档：http://localhost:8000/api/v1/docs
  ──────
  ### 2. 本地开发分步启动

  如果你想在本地开发模式下分别启动前端和后端，可以在安装依赖后运行以下命令：

  #### 后端 (Backend)

  进入 backend 目录，并在虚拟环境中运行：

    python -m app.main
    # 或者使用 uvicorn 启动：
    uvicorn app.main:app --reload --port 8000

  #### 前端 (Frontend)

  进入 frontend 目录，运行：

    npm run dev

  │ [!NOTE]
  │ 本地开发分步启动时，仍需确保数据库等基础组件（PostgreSQL, Qdrant, Neo4j,
  │ MinIO, Redis）在本地或 Docker 中处于运行状态，并已正确配置根目录下的
  │ .env 环境变量文件。
