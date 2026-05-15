# InsightGraph Agent - 论文技术集成计划

本文档评估了 `prompt2.txt` 中提到的研究论文，并制定了将其实用化功能集成到 InsightGraph Agent 系统中的计划。

## 📋 论文评估与集成策略

### 1. RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval
*   **核心思想**：通过对文档分片进行递归总结，构建多层级的摘要树，从而支持长文本的宏观和微观检索。
*   **实用化部分**：实现“分片摘要 -> 页面摘要 -> 文档摘要”的层级结构。
*   **集成位置**：`IngestionService`, `ChunkingService`, `PostgreSQL` (存储层级关系)。
*   **预估收益**：极大提升处理跨章节、全局性问题的能力。
*   **结论**：**优先实现**。

### 2. LightRAG / HippoRAG (图增强检索)
*   **核心思想**：利用实体图谱来辅助检索，结合局部实体邻居和全局实体重要性进行混合搜索。
*   **实用化部分**：实体感知的分片链接、图上下文扩展（检索分片时带出其相关实体的邻居）。
*   **集成位置**：`GraphService`, `RetrievalService`, `Neo4j`。
*   **预估收益**：解决传统向量检索难以处理的“实体关系跳跃”问题。
*   **结论**：**优先实现**。

### 3. ColPali / VisRAG (视觉文档检索)
*   **核心思想**：直接对文档页面图像进行索引和检索，避开复杂的 OCR 丢失。
*   **实用化部分**：实现 PDF 页面截图存储、页面级 Caption 索引、多模态预览。
*   **集成位置**：`Parser`, `MinIO`, `VectorStoreService`。
*   **预估收益**：提升 PPTX 和图表密集型 PDF 的展示和搜索效果。
*   **结论**：**实现轻量级版本**（基于 Caption 的检索 + 视觉预览）。

### 4. Agentic RAG / MA-RAG (多智能体协作)
*   **核心思想**：将 RAG 过程拆分为 Planner, Retriever, Verifier, Writer 等专业智能体，通过迭代和反馈优化答案。
*   **实用化部分**：实现明确的角色分工、验证重试循环 (Retry Loop)、执行轨迹流式展示。
*   **集成位置**：`Agent/Graph`, `FastAPI API`。
*   **预估收益**：显著提升答案的准确性和可解释性。
*   **结论**：**深度集成**。

---

## 🚀 实施路线图 (Implementation Roadmap)

### 第一阶段：层级化与结构化 (RAPTOR 灵感)
1.  **数据库扩展**：在 `document_chunks` 中增加 `parent_id` 和 `level` 字段，新增 `summary_chunks` 逻辑。
2.  **总结流水线**：在 `IngestionService` 中添加对分片组生成摘要的逻辑。
3.  **层级检索**：修改 `RetrievalService`，首先搜索摘要层，再根据摘要定位到细节分片。

### 第二阶段：图谱深度融合 (LightRAG 灵感)
1.  **实体邻居扩展**：优化 `GraphService`，在检索到 Chunk 后，自动查询关联实体的一度邻居，并将其作为上下文。
2.  **图权重重排**：在 Rerank 阶段考虑实体匹配度。

### 第三阶段：多模态视觉增强 (ColPali/VisRAG 灵感)
1.  **页面快照**：在 `PDFParser` 中添加生成页面缩略图并存入 MinIO 的功能。
2.  **视觉预览 UI**：前端支持在搜索结果中直接看到命中的页面截图。

### 第四阶段：智能体流程精化 (Agentic RAG/MA-RAG 灵感)
1.  **LangGraph 重构**：将现有的简单流程细化为 `Planner` -> `Retriever` -> `Verifier` -> `Writer`。
2.  **重试机制**：如果 `Verifier` 认为证据不足，则触发重新检索。

---

## 🛠️ 技术挑战与对策
*   **计算成本**：递归总结 (RAPTOR) 会增加 LLM Token 消耗。**对策**：仅对长文档或手动开启。
*   **图谱复杂度**：全量图搜索较慢。**对策**：采用 LightRAG 的双层搜索（Local & Global）。
*   **兼容性**：确保新功能不破坏现有的简单 RAG 流程。**对策**：使用环境变量和 Feature Flags 动态开启。
