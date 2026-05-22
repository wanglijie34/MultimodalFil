# InsightGraph Agent - 项目状态总结

本文档详细记录了 InsightGraph Agent 项目的当前完成情况以及后续需要完成的工作。

## 🎯 总体架构与目标达成度

项目旨在构建一个 **多模态文件管理 + RAG + GraphRAG + Multi-Agent Workflow** 的知识工作台。目前核心 MVP (Minimum Viable Product) 功能已经基本完成，系统具备了从文件上传、多格式解析、向量化索引到混合检索和智能体问答的完整闭环。

**整体进度评估：约 85%**

---

## ✅ 已完成的工作 (Completed)

### 1. 基础设施与核心模型 (Phase 1)
*   **容器化编排**：`docker-compose.yml` 现已集成了完整的基础设施栈，包括 PostgreSQL, Qdrant, Neo4j, MinIO, Redis 以及构建 Backend 和 Frontend 的服务。
*   **后端基座**：基于 FastAPI 构建，配置了日志记录 (Loguru) 和自定义异常处理。
*   **数据模型**：使用 SQLModel 定义了完整的数据库关系，包括：`User`, `Workspace`, `File`, `Folder`, `DocumentPage`, `DocumentChunk`, `FileAsset`, `Entity`, `AgentRun`, `Citation`, `Report` 等 15+ 个核心表结构。
*   **对象存储**：集成了 MinIO，实现了文件的上传和原始文件留存。

### 2. 多模态文档解析与摄入 (Phase 2)
*   **解析器架构**：设计了可扩展的 `BaseParser` 架构。
*   **支持的文件格式**：
    *   PDF (`.pdf`)
    *   Word (`.docx`)
    *   PowerPoint (`.pptx`)
    *   文本文件 (`.txt`) - *新增*
    *   Markdown 文件 (`.md`) - *新增*
*   **文档分片 (Chunking)**：实现了基于文本长度和重叠率的自动分片服务 (`ChunkingService`)。
*   **向量化集成**：实现了 `EmbeddingService`，支持集成 Google Gemini (`text-embedding-004`) 和 OpenAI，并为开发环境提供了 Deterministic 伪向量生成机制。
*   **向量检索**：集成了 Qdrant 数据库，文档分片自动存入并建立索引。

### 3. 混合检索与智能体问答 (Phase 3 & 4)
*   **混合检索 (Hybrid Retrieval)**：实现了基于向量搜索 (Vector) 和 关键词匹配 (Keyword) 的混合检索逻辑。
*   **知识库问答 (RAG)**：实现了 `RAGService`，能够根据检索到的上下文（包含出处和页码）组装 Prompt 并调用 LLM 生成回答。
*   **智能体工作流 (Agentic Workflow)**：
    *   使用 **LangGraph** 思想设计了 Agent 节点 (Router, Retrieval, Writer)。
    *   实现了 `/agent/runs` 接口，能够返回问答结果、引用的具体分片信息以及**执行轨迹 (Execution Trace)**。
*   **知识图谱 (GraphRAG)**：
    *   集成了 **Neo4j** 图数据库。
    *   实现了利用 LLM 从文本分片中自动抽取实体 (Entity) 和关系的逻辑，并建立与原始文档的映射 (`MENTIONS` 关系)。
*   **报告生成**：实现了 `ReportService`，能够基于特定主题自动检索资料并生成结构化的 Markdown 报告。

### 4. 前端产品化 (Frontend UI)
基于 Next.js App Router, Tailwind CSS 和 shadcn/ui 开发：
*   **API 客户端**：封装了统一的 `api.ts` 与后端交互。
*   **Dashboard**：展示系统状态和统计信息的仪表盘页面。
*   **文件管理页 (`/files`)**：实现了文件的列表展示、上传和删除功能。
*   **文件详情页 (`/files/[fileId]`)**：实现了元数据展示和预览/分片/实体切换标签页。
*   **语义搜索页 (`/search`)**：实现了输入查询并展示相关分片及其匹配分数的 UI。
*   **智能体对话页 (`/agent`)**：实现了类似 ChatGPT 的对话界面，支持显示 Agent 的**思考/执行轨迹**以及**来源引用 (Citations)**。
*   **知识图谱可视化 (`/graph`)**：使用 **React Flow (@xyflow/react)** 实现了动态节点与边的渲染，支持搜索实体并展示文档关联。
*   **报告中心 (`/reports`)**：实现了报告生成、列表展示和在线阅读预览。

---

## ⏳ 待完成与优化工作 (To-Do & Polish)

### 1. 前端 UI 深度补全 (Frontend Enhancements)
*   **PDF 在线预览**：目前文件详情页为占位，需要集成 `PDF.js` 实现真正在线预览并支持分片高亮。
*   **图谱交互增强**：增加节点拖拽后的自动布局保存，以及双击节点发起 Agent 提问的功能。

### 2. 多模态深度处理 (Deep Multimodal Processing)
*   **高级 OCR 与图片解析**：对于包含大量扫描件或图表的 PDF/PPTX，当前仅提取了纯文本。需要接入 `pytesseract` 或 `Gemini Vision API` 来解析图片中的文字和表格数据。
*   **图片级向量化**：实现 CLIP 模型集成，支持“以文搜图”或“以图搜图”。

### 3. 工程化与架构优化 (Engineering & Architecture)
*   **异步任务队列队列**：目前为了 MVP 跑通，`IngestionService` (解析->分片->向量化) 是通过 FastAPI 的 `BackgroundTasks` 在主进程的背景执行的。生产环境下应切换到已经配好的 `Celery` + `Redis` 架构，以支持大规模并发文件处理。
*   **数据库迁移 (Alembic)**：模型已经定义完毕，需要执行一次 `alembic revision --autogenerate` 和 `alembic upgrade head` 来规范化表结构的生成。

### 4. 权限与安全 (Security & Auth)
*   **JWT 身份验证**：目前 API 使用了硬编码的 `DEFAULT_USER_ID`。需要实现完整的登录注册逻辑，以及基于 Token 的 API 访问控制。
*   **多租户/工作区隔离**：完善 Frontend 工作区切换逻辑，确保每个用户的搜索和图谱数据严格隔离。

---

## 🚀 启动与测试指南

目前项目具备直接运行的条件：

1.  在根目录配置 `.env` 文件，填入必要的 `GOOGLE_API_KEY` 或 `OPENAI_API_KEY`。
2.  执行 `docker compose up -d` 启动所有环境。
3.  访问 `http://localhost:3000` 进入前端界面进行测试。
4.  可以通过 Frontend 的 `/files` 页面上传 `.pdf`, `.docx`, `.pptx`, `.txt`, `.md` 文件，然后去 `/agent` 页面向 Agent 提问。
