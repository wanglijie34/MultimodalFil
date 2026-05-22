from typing import List
from uuid import UUID, uuid4
from app.models.file import DocumentChunk
from app.parsers.base import ParsedDocument
from loguru import logger

class ChunkingService:
    def chunk_document(
        self, 
        parsed_doc: ParsedDocument, 
        chunk_size: int = 800, 
        chunk_overlap: int = 120
    ) -> List[DocumentChunk]:
        logger.info(f"Chunking document: {parsed_doc.file_id}")
        chunks = []
        chunk_index = 0
        
        for page in parsed_doc.pages:
            text = page.text
            if not text:
                continue
                
            # Basic chunking logic (could be improved with LangChain RecursiveCharacterTextSplitter)
            # For MVP, we'll do a simple overlap-based split if text is too long
            
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
                    token_count=len(chunk_content.split()), # Rough estimation
                    meta={"page_number": page.page_number}
                ))
                
                chunk_index += 1
                if end >= len(text):
                    break
                start = end - chunk_overlap
                
        return chunks

chunking_service = ChunkingService()
