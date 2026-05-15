from app.parsers.base import BaseParser, ParsedDocument, ParsedPage
from loguru import logger

class MDParser(BaseParser):
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        logger.info(f"Parsing Markdown: {file_path}")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="gbk") as f:
                text = f.read()
        
        # For now, treat MD as a single page
        # In the future, we could split by headers (#)
        pages = [ParsedPage(
            page_number=1,
            text=text
        )]
            
        return ParsedDocument(
            file_id=file_id,
            pages=pages,
            metadata={}
        )
