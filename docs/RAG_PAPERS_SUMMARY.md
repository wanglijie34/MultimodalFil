# InsightGraph Agent - RAG 领域前沿论文总结

本文对 `paper/` 目录下的 7 篇核心 RAG 及 Agent 相关论文进行了技术总结，提炼了每篇论文值得借鉴的工程思想。

---

## 1. RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval
*   **论文 ID**: `2401.18059`
*   **核心借鉴点**：
    *   **递归总结树**：传统的 RAG 只索引原始文本块。RAPTOR 提出对文本块进行聚类并生成摘要，再对摘要进行总结，构建一棵树。
    *   **多尺度检索**：检索时同时搜索叶子节点（细节）和高层节点（全局背景）。
*   **对本系统的启发**：目前我们已经集成了 Level-1 摘要。后续可以引入**聚类总结**，解决超长文档的跨章节逻辑理解问题。

## 2. LightRAG: Simple and Fast Retrieval-Augmented Generation
*   **论文 ID**: `2410.05779`
*   **核心借鉴点**：
    *   **双层检索架构**：将检索分为 **Local (局部细节)** 和 **Global (全局关系)** 两层。
    *   **图谱增量更新**：强调了图谱在 RAG 中的低延迟摄入和检索优势。
*   **对本系统的启发**：将 `RetrievalService` 的搜索模式显式拆分为“局部向量搜索”和“全局图谱/摘要搜索”，并根据问题类型动态切换。

## 3. ColPali: Efficient Document Retrieval with Vision Language Models
*   **论文 ID**: `2407.01449`
*   **核心借鉴点**：
    *   **视觉特征嵌入**：不再依赖复杂的 OCR，而是利用 VLM (如 PaliGemma) 直接对页面图像进行 Patch 级的特征提取和检索。
*   **对本系统的启发**：虽然目前使用文本 RAG，但可以借鉴其“页面作为一等公民”的思想，将页面快照的语义特征（通过 Caption 或 VLM）纳入检索排名。

## 4. VisRAG: Vision-based Retrieval-Augmented Generation
*   **论文 ID**: `2410.10594`
*   **核心借鉴点**：
    *   **端到端视觉 RAG**：直接将检索到的页面图像输入给多模态 LLM 进行回答，彻底避免 OCR 带来的信息损失（如复杂公式、流程图）。
*   **对本系统的启发**：在 `Agent` 流程中加入 `VisionNode`，当检索到含有图表的分片时，自动调取关联的页面图片供 LLM 分析。

## 5. M3DocRAG: Multi-modal, Multi-page, Multi-document RAG
*   **论文 ID**: `2411.04952`
*   **核心借鉴点**：
    *   **长序列跨文档推理**：针对涉及多个长文档、成百上千页的复杂查询，提出了一种高效的证据聚合和多步推理流程。
*   **对本系统的启发**：优化本系统的 `ReportService`，在生成报告前先进行“证据地图”的构建，而非简单的片段堆叠。

## 6. Agentic RAG Survey
*   **论文 ID**: `2501.09136`
*   **核心借鉴点**：
    *   **五大核心能力**：Planning (规划), Retrieval (检索), Reasoning (推理), Tools (工具), Reflection (反思)。
    *   **迭代循环**：回答不满意时自动重新规划或补充检索。
*   **对本系统的启发**：将当前的顺序 LangGraph 重构为带 **Reflection (反思)** 和 **Verification (验证)** 的循环图。

## 7. MA-RAG: Multi-Agent RAG
*   **论文 ID**: `2505.20096`
*   **核心借鉴点**：
    *   **角色专业化**：不同 Agent 负责不同维度的信息采集（如一个搜图，一个搜图谱，一个搜文本），最后由主 Agent 合并。
*   **对本系统的启发**：目前的 `AgentState` 已经支持多维度数据，可以进一步细化 `RetrievalAgent` 的子策略，实现“分而治之”。
