from pypdf import PdfReader
from app.parsers.base import BaseParser, ParsedDocument, ParsedPage
from loguru import logger

class PDFParser(BaseParser):
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        logger.info(f"Parsing PDF: {file_path}")
        reader = PdfReader(file_path)
        pages = []
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append(ParsedPage(
                page_number=i + 1,
                text=text
            ))
            
        return ParsedDocument(
            file_id=file_id,
            pages=pages,
            metadata={"total_pages": len(reader.pages)}
        )
