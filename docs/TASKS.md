# InsightGraph Agent Implementation Tasks

This document outlines the implementation plan for the **InsightGraph Agent** project, broken down into phases and functional areas.

## Phase 1: Foundation & Skeleton (MVP Phase 1) - ✅ COMPLETED
**Goal:** Initialize the project structure, set up infrastructure, and create a basic runnable application with file upload and health check capabilities.

### Infrastructure Tasks
- [x] **Task INF-1:** Create `docker-compose.yml` for PostgreSQL, Qdrant, Neo4j, MinIO, Redis.
- [x] **Task INF-2:** Configure `.env.example` with all necessary environment variables.
- [x] **Task INF-3:** Set up project documentation structure in `docs/`.

### Backend Tasks
- [x] **Task BE-1:** Initialize FastAPI skeleton (main.py, routers, core settings).
- [x] **Task BE-2:** Set up Logging and Error Handling middleware.
- [x] **Task BE-3:** Configure Database Session management (SQLAlchemy/SQLModel).
- [ ] **Task BE-4:** Initialize Alembic for database migrations (Implemented models, manual init needed).
- [x] **Task BE-5:** Implement Health Check endpoint (`/health`).
- [x] **Task BE-6:** Create File Metadata models (User, File, Folder, etc.).
- [x] **Task BE-7:** Implement basic File Upload API (saving metadata, uploading to MinIO).
- [ ] **Task BE-8:** Set up Celery/RQ for background task processing (Used BackgroundTasks for MVP).

### Frontend Tasks
- [x] **Task FE-1:** Initialize Next.js project with Tailwind CSS and TypeScript.
- [x] **Task FE-2:** Set up shadcn/ui and basic components (Button, Input, Card).
- [x] **Task FE-3:** Create App Layout with Sidebar and Topbar.
- [x] **Task FE-4:** Implement Dashboard Home page.
- [x] **Task FE-5:** Create File Management page (list view, upload logic).
- [x] **Task FE-6:** Set up API client abstraction (fetch).

---

## Phase 2: Ingestion & Basic RAG (MVP Phase 1 Continued) - ✅ COMPLETED
**Goal:** Implement document parsing, chunking, embedding, and basic vector-based retrieval.

### Backend Tasks
- [x] **Task BE-9:** Implement PDF, DOCX, PPTX Parsers.
- [x] **Task BE-10:** Implement Text Chunking service.
- [x] **Task BE-11:** Integrate Embedding service (Gemini/OpenAI abstraction).
- [x] **Task BE-12:** Implement Qdrant vector storage integration.
- [x] **Task BE-13:** Create background task for full ingestion flow (Parse -> Chunk -> Embed -> Index).
- [x] **Task BE-14:** Implement basic Vector Search API.

### Frontend Tasks
- [x] **Task FE-7:** Update File Management page with upload status monitoring.
- [x] **Task FE-8:** Implement Search page with basic vector search results.
- [x] **Task FE-9:** Create basic Chat UI for RAG questions.

---

## Phase 3: GraphRAG & Multi-Agent Workflow (MVP Phase 2) - 🔄 IN PROGRESS (MVP Ready)
**Goal:** Implement knowledge graph extraction and LangGraph-based agent workflows.

### Backend Tasks
- [x] **Task BE-15:** Integrate Neo4j for knowledge graph storage.
- [x] **Task BE-16:** Implement Entity/Relation Extraction service.
- [x] **Task BE-17:** Implement LangGraph workflow skeleton (Router, Retrieval, Writer).
- [x] **Task BE-18:** Implement Hybrid Search (Vector + Keyword fallback).
- [ ] **Task BE-19:** Implement Agent Trace logging and streaming API (Basic trace in response).

### Frontend Tasks
- [ ] **Task FE-10:** Implement Knowledge Graph visualization (React Flow) - (Backend ready, frontend placeholder).
- [x] **Task FE-11:** Update Chat UI to show Agent execution trace.
- [ ] **Task FE-12:** Implement Entity detail view.

---

## Phase 4: Multimodal & Advanced Features (MVP Phase 3) - 🔄 IN PROGRESS (MVP Ready)
**Goal:** Support image extraction, OCR, report generation, and full productization.

### Backend Tasks
- [ ] **Task BE-20:** Implement Image/Table extraction from PDF/PPTX.
- [ ] **Task BE-21:** Implement OCR/Captioning for images.
- [x] **Task BE-22:** Implement Report Generation service.
- [x] **Task BE-23:** Support PPTX and DOCX parsing.

### Frontend Tasks
- [ ] **Task FE-13:** Implement Multi-modal search results.
- [ ] **Task FE-14:** Implement Report generation and preview page.
- [ ] **Task FE-15:** Add PDF viewer with citation highlighting.

---

## Phase 5: Polish & Deployment - ⏳ PLANNED
**Goal:** Security, performance optimization, and production deployment.

### Tasks
- [ ] **Task SYS-1:** Implement full JWT Auth and Workspace permissions.
- [ ] **Task SYS-2:** Performance tuning for retrieval and ingestion.
- [ ] **Task SYS-3:** Set up CI/CD pipeline.
- [ ] **Task SYS-4:** Final UI/UX polish.
- [ ] **Task SYS-5:** Comprehensive testing (Unit, Integration, E2E).
