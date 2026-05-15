from app.parsers.base import BaseParser, ParsedDocument, ParsedPage
from loguru import logger

class TXTParser(BaseParser):
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        logger.info(f"Parsing TXT: {file_path}")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except UnicodeDecodeError:
            # Fallback for common Windows encoding
            with open(file_path, "r", encoding="gbk") as f:
                text = f.read()
        
        pages = [ParsedPage(
            page_number=1,
            text=text
        )]
            
        return ParsedDocument(
            file_id=file_id,
            pages=pages,
            metadata={}
        )
