from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from app.models.file import DocumentChunk
from app.parsers.base import ParsedDocument
from loguru import logger

class ChunkingService:
    def chunk_document(
        self, 
        parsed_doc: ParsedDocument, 
        chunk_size: int = 800, 
        chunk_overlap: int = 120,
        split_mode: str = "character",
        overlap_lines: int = 4,
        extra_meta: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:
        logger.info(f"Chunking document: {parsed_doc.file_id}")
        chunks = []
        chunk_index = 0
        extra_meta = extra_meta or {}
        
        for page in parsed_doc.pages:
            text = page.text
            if not text:
                continue

            if split_mode == "line":
                lines = text.splitlines()
                if not lines:
                    continue

                start_line = 0
                while start_line < len(lines):
                    current_lines: List[str] = []
                    current_length = 0
                    end_line = start_line

                    while end_line < len(lines):
                        line = lines[end_line]
                        addition = len(line) + (1 if current_lines else 0)
                        if current_lines and current_length + addition > chunk_size:
                            break
                        current_lines.append(line)
                        current_length += addition
                        end_line += 1

                    chunk_content = "\n".join(current_lines).strip()
                    if chunk_content:
                        chunks.append(DocumentChunk(
                            id=uuid4(),
                            file_id=UUID(parsed_doc.file_id),
                            page_number=page.page_number,
                            chunk_index=chunk_index,
                            content=chunk_content,
                            token_count=len(chunk_content.split()),
                            meta={
                                "page_number": page.page_number,
                                "split_mode": split_mode,
                                **extra_meta,
                            }
                        ))
                        chunk_index += 1

                    if end_line >= len(lines):
                        break
                    start_line = max(end_line - overlap_lines, start_line + 1)
                continue

            start = 0
            while start < len(text):
                end = start + chunk_size
                chunk_content = text[start:end]

                chunks.append(DocumentChunk(
                    id=uuid4(),
                    file_id=UUID(parsed_doc.file_id),
                    page_number=page.page_number,
                    chunk_index=chunk_index,
                    content=chunk_content,
                    token_count=len(chunk_content.split()),
                    meta={
                        "page_number": page.page_number,
                        "split_mode": split_mode,
                        **extra_meta,
                    }
                ))

                chunk_index += 1
                if end >= len(text):
                    break
                start = end - chunk_overlap
                
        return chunks

chunking_service = ChunkingService()
