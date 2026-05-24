from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List


DOCUMENT_EXTENSIONS = {"pdf", "docx", "txt", "md", "epub"}
PRESENTATION_EXTENSIONS = {"pptx"}
SPREADSHEET_EXTENSIONS = {"xlsx", "xls", "csv", "tsv"}
SOURCE_CODE_EXTENSIONS = {
    "py",
    "js",
    "jsx",
    "ts",
    "tsx",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "sql",
}
STRUCTURED_DATA_EXTENSIONS = {"json", "xml", "yaml", "yml", "toml", "ini", "cfg", "log"}
WEB_TEXT_EXTENSIONS = {"html", "css"}
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "raw"}
AUDIO_EXTENSIONS = {"mp3", "wav", "flac", "m4a", "aac", "ogg"}
VIDEO_EXTENSIONS = {"mp4", "mkv", "avi", "mov", "webm"}
ARCHIVE_EXTENSIONS = {"zip", "rar", "7z", "tar", "gz", "tgz"}

TEXT_LIKE_EXTENSIONS = (
    {"txt", "csv", "tsv"}
    | SOURCE_CODE_EXTENSIONS
    | STRUCTURED_DATA_EXTENSIONS
    | WEB_TEXT_EXTENSIONS
)

INGESTION_SUPPORTED_EXTENSIONS = {"pdf", "docx", "pptx", "txt", "md", "epub"} | TEXT_LIKE_EXTENSIONS


def normalize_file_type(file_type_or_name: str) -> str:
    raw = (file_type_or_name or "").strip().lower()
    if "." in raw:
        raw = Path(raw).suffix.lstrip(".").lower()
    return raw


def get_supported_ingestion_extensions() -> List[str]:
    return sorted(INGESTION_SUPPORTED_EXTENSIONS)


def get_file_profile(file_type_or_name: str, mime_type: str | None = None) -> Dict[str, Any]:
    ext = normalize_file_type(file_type_or_name)

    profile: Dict[str, Any] = {
        "file_type": ext or "unknown",
        "mime_type": mime_type,
        "file_category": "other",
        "category_label": "Other",
        "indexing_profile": "metadata_only",
        "embedding_strategy": "Store file metadata only. Semantic indexing is not enabled yet.",
        "retrieval_strategy": "Return file metadata for future handlers.",
        "parser_name": None,
        "parser_key": None,
        "supported_for_ingestion": False,
        "split_mode": "character",
        "chunk_size": 800,
        "chunk_overlap": 120,
        "overlap_lines": 4,
        "enable_summaries": False,
        "enable_graph_extraction": False,
        "query_bias": "neutral",
    }

    if ext == "pdf":
        profile.update(
            file_category="document",
            category_label="Text & Document",
            indexing_profile="layout_aware_longform",
            embedding_strategy="Dense embeddings on page chunks plus hierarchical summaries for long-form reading.",
            retrieval_strategy="Blend summaries, semantic chunks, and keyword recall for narrative questions.",
            parser_name="PDFParser",
            parser_key="pdf",
            supported_for_ingestion=True,
            chunk_size=900,
            chunk_overlap=140,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="narrative",
        )
    elif ext == "docx":
        profile.update(
            file_category="document",
            category_label="Text & Document",
            indexing_profile="office_document",
            embedding_strategy="Paragraph-focused embeddings with summary layers for reports and notes.",
            retrieval_strategy="Favor semantic paragraphs and document summaries for descriptive answers.",
            parser_name="DOCXParser",
            parser_key="docx",
            supported_for_ingestion=True,
            chunk_size=820,
            chunk_overlap=130,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="narrative",
        )
    elif ext == "pptx":
        profile.update(
            file_category="presentation",
            category_label="Presentation",
            indexing_profile="slide_semantic",
            embedding_strategy="Compact slide-level embeddings tuned for titles, bullets, and presenter notes.",
            retrieval_strategy="Favor concise keyword and semantic matches across slide chunks.",
            parser_name="PPTXParser",
            parser_key="pptx",
            supported_for_ingestion=True,
            chunk_size=520,
            chunk_overlap=80,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="presentation",
        )
    elif ext == "epub":
        profile.update(
            file_category="document",
            category_label="Text & Document",
            indexing_profile="ebook_longform",
            embedding_strategy="Chapter-friendly embeddings with summary layers for books and long articles.",
            retrieval_strategy="Favor summary chunks first, then drill into semantic evidence blocks.",
            parser_name="EPUBParser",
            parser_key="epub",
            supported_for_ingestion=True,
            chunk_size=980,
            chunk_overlap=160,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="narrative",
        )
    elif ext == "md":
        profile.update(
            file_category="document",
            category_label="Text & Document",
            indexing_profile="markdown_outline",
            embedding_strategy="Header-sensitive markdown chunking for notes, docs, and knowledge bases.",
            retrieval_strategy="Use semantic chunks plus keyword recall around headings and lists.",
            parser_name="MDParser",
            parser_key="md",
            supported_for_ingestion=True,
            chunk_size=760,
            chunk_overlap=100,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="narrative",
        )
    elif ext in {"txt"}:
        profile.update(
            file_category="document",
            category_label="Text & Document",
            indexing_profile="plain_text",
            embedding_strategy="General-purpose text embeddings for transcripts, notes, and raw text.",
            retrieval_strategy="Balance semantic recall with keyword grounding on plain text blocks.",
            parser_name="TXTParser",
            parser_key="txt",
            supported_for_ingestion=True,
            chunk_size=760,
            chunk_overlap=100,
            enable_summaries=True,
            enable_graph_extraction=True,
            query_bias="narrative",
        )
    elif ext in {"csv", "tsv"}:
        profile.update(
            file_category="spreadsheet",
            category_label="Spreadsheet & Data",
            indexing_profile="tabular_text",
            embedding_strategy="Row-preserving text embeddings so column names and values remain searchable.",
            retrieval_strategy="Boost exact keyword and lightweight semantic matches for structured lookups.",
            parser_name="TXTParser",
            parser_key="txt",
            supported_for_ingestion=True,
            split_mode="line",
            chunk_size=1400,
            chunk_overlap=60,
            overlap_lines=2,
            enable_summaries=False,
            enable_graph_extraction=False,
            query_bias="structured",
        )
    elif ext in SOURCE_CODE_EXTENSIONS:
        profile.update(
            file_category="source_code",
            category_label="Source Code",
            indexing_profile="code_semantic",
            embedding_strategy="Line-aware code embeddings that preserve function boundaries and configuration blocks.",
            retrieval_strategy="Boost exact symbol hits and line-aware semantic chunks for technical questions.",
            parser_name="TXTParser",
            parser_key="txt",
            supported_for_ingestion=True,
            split_mode="line",
            chunk_size=1500,
            chunk_overlap=90,
            overlap_lines=4,
            enable_summaries=False,
            enable_graph_extraction=False,
            query_bias="code",
        )
    elif ext in STRUCTURED_DATA_EXTENSIONS | WEB_TEXT_EXTENSIONS:
        profile.update(
            file_category="structured_data",
            category_label="Structured Data & Config",
            indexing_profile="config_semantic",
            embedding_strategy="Text embeddings that keep keys, fields, and config sections together.",
            retrieval_strategy="Favor exact field-name matches and nearby semantic context for configs/data files.",
            parser_name="TXTParser",
            parser_key="txt",
            supported_for_ingestion=True,
            split_mode="line",
            chunk_size=1200,
            chunk_overlap=80,
            overlap_lines=3,
            enable_summaries=False,
            enable_graph_extraction=False,
            query_bias="structured",
        )
    elif ext in SPREADSHEET_EXTENSIONS:
        profile.update(
            file_category="spreadsheet",
            category_label="Spreadsheet & Data",
            indexing_profile="binary_spreadsheet_pending",
            embedding_strategy="Spreadsheet parsing is reserved for a dedicated extractor.",
            retrieval_strategy="Metadata-only until a tabular parser is attached.",
            query_bias="structured",
        )
    elif ext in IMAGE_EXTENSIONS:
        profile.update(
            file_category="image",
            category_label="Image",
            indexing_profile="vision_pending",
            embedding_strategy="Image OCR/vision embeddings are not enabled in the current pipeline.",
            retrieval_strategy="Metadata-only until multimodal indexing is added.",
        )
    elif ext in AUDIO_EXTENSIONS:
        profile.update(
            file_category="audio",
            category_label="Audio",
            indexing_profile="transcription_pending",
            embedding_strategy="Audio transcription and embedding are not enabled in the current pipeline.",
            retrieval_strategy="Metadata-only until speech indexing is added.",
        )
    elif ext in VIDEO_EXTENSIONS:
        profile.update(
            file_category="video",
            category_label="Video",
            indexing_profile="video_pending",
            embedding_strategy="Video transcription and scene indexing are not enabled in the current pipeline.",
            retrieval_strategy="Metadata-only until multimodal indexing is added.",
        )
    elif ext in ARCHIVE_EXTENSIONS:
        profile.update(
            file_category="archive",
            category_label="Archive",
            indexing_profile="archive_pending",
            embedding_strategy="Archives are stored as-is and need unpacking before semantic indexing.",
            retrieval_strategy="Metadata-only until archive expansion is added.",
        )

    return profile


def describe_query_profile(query: str) -> Dict[str, Any]:
    text = (query or "").lower()
    preferred_biases: List[str] = []
    prefer_summaries = False

    if any(token in text for token in ["代码", "函数", "class", "def ", "import ", "json", "xml", "api", "报错", "脚本", "sql"]):
        preferred_biases.extend(["code", "structured"])
    if any(token in text for token in ["表格", "字段", "列", "数据", "配置", "yaml", "toml", "csv", "tsv"]):
        preferred_biases.append("structured")
    if any(token in text for token in ["ppt", "演示", "幻灯片", "slide"]):
        preferred_biases.append("presentation")
    if any(token in text for token in ["总结", "概括", "全文", "完整信息", "背景", "原因", "经过", "影响"]):
        prefer_summaries = True
        preferred_biases.append("narrative")
    if not preferred_biases:
        preferred_biases.append("narrative")

    return {
        "preferred_biases": preferred_biases,
        "prefer_summaries": prefer_summaries,
    }


def compute_query_bias_boost(chunk_meta: Dict[str, Any] | None, query_profile: Dict[str, Any]) -> float:
    if not chunk_meta:
        return 0.0

    bias = chunk_meta.get("query_bias") or "neutral"
    preferred_biases: Iterable[str] = query_profile.get("preferred_biases", [])
    boost = 0.0

    if bias in preferred_biases:
        boost += 0.08
    if query_profile.get("prefer_summaries") and chunk_meta.get("is_summary"):
        boost += 0.05

    return boost
