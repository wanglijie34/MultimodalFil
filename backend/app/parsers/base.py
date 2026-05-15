from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class ExtractedImage(BaseModel):
    image_path: str
    page_number: int
    bbox: Optional[Dict[str, Any]] = None
    caption: Optional[str] = None
    ocr_text: Optional[str] = None

class ExtractedTable(BaseModel):
    page_number: int
    table_markdown: str
    bbox: Optional[Dict[str, Any]] = None

class ParsedPage(BaseModel):
    page_number: int
    text: str
    images: List[ExtractedImage] = []
    tables: List[ExtractedTable] = []

class ParsedDocument(BaseModel):
    file_id: str
    title: Optional[str] = None
    pages: List[ParsedPage]
    metadata: Dict[str, Any] = {}

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        pass
