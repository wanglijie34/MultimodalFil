import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from app.parsers.base import BaseParser, ParsedDocument, ParsedPage
from loguru import logger

class EPUBParser(BaseParser):
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        logger.info(f"Parsing EPUB: {file_path}")
        
        try:
            book = epub.read_epub(file_path)
            
            pages = []
            page_num = 1
            
            for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
                # Extract text using BeautifulSoup
                soup = BeautifulSoup(item.get_body_content(), 'html.parser')
                text = soup.get_text(separator='\n', strip=True)
                
                if text:
                    # Very long chapters might need splitting, but for MVP we treat a chapter as a page
                    # Chunking service will split it further for embedding
                    pages.append(ParsedPage(
                        page_number=page_num,
                        text=text
                    ))
                    page_num += 1
            
            # Extract metadata
            title_metadata = book.get_metadata('DC', 'title')
            title = title_metadata[0][0] if title_metadata else None
            
            return ParsedDocument(
                file_id=file_id,
                title=title,
                pages=pages,
                metadata={}
            )
        except Exception as e:
            logger.error(f"Failed to parse EPUB {file_path}: {e}")
            raise e
