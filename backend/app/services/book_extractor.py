import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional, Tuple, Any

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select

from app.models.file import File
from app.models.book import Book, Chapter
from loguru import logger

# Where we will store extracted covers locally
COVERS_DIR = Path(__file__).resolve().parents[3] / "files" / "covers"
COVERS_DIR.mkdir(parents=True, exist_ok=True)

class BookExtractorService:
    async def extract_book_from_file(self, db: AsyncSession, file_id: uuid.UUID) -> Optional[Book]:
        # 1. Verify file
        db_file = await db.get(File, file_id)
        if not db_file or db_file.file_type != "epub":
            logger.error(f"File {file_id} is not a valid EPUB.")
            return None

        # Check if already extracted
        existing = await db.execute(select(Book).where(Book.source_file_id == file_id))
        if existing.scalar_one_or_none():
            logger.info(f"Book for file {file_id} already exists.")
            return existing.scalar_one_or_none()

        from app.integrations.minio_client import minio_client
        import tempfile

        try:
            logger.info(f"Downloading file from MinIO: {db_file.storage_key}")
            file_bytes = minio_client.download_file(db_file.storage_key)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".epub") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
                
            logger.info(f"Parsing EPUB for book extraction: {tmp_path}")
            book_epub = epub.read_epub(tmp_path)
            
            # Clean up temp file
            os.remove(tmp_path)
        except Exception as e:
            logger.error(f"Failed to download or parse EPUB: {e}")
            return None

        # 2. Extract Metadata
        title = self._get_metadata(book_epub, 'DC', 'title') or db_file.original_filename
        author = self._get_metadata(book_epub, 'DC', 'creator')
        language = self._get_metadata(book_epub, 'DC', 'language')
        description = self._get_metadata(book_epub, 'DC', 'description')
        
        # 3. Extract Cover
        cover_path = self._extract_cover(book_epub, file_id)

        # 4. Create Book entry
        db_book = Book(
            source_file_id=file_id,
            title=title,
            author=author,
            language=language,
            description=description,
            cover_path=cover_path
        )
        db.add(db_book)
        await db.flush()  # To get db_book.id

        # 5. Extract Chapters
        chapters = self._extract_chapters(book_epub, db_book.id)
        if chapters:
            db.add_all(chapters)
            
        await db.commit()
        await db.refresh(db_book)
        logger.info(f"Successfully extracted book: {title} with {len(chapters)} chapters.")
        return db_book

    def _get_metadata(self, book: epub.EpubBook, namespace: str, name: str) -> Optional[str]:
        data = book.get_metadata(namespace, name)
        if data and len(data) > 0 and len(data[0]) > 0:
            if isinstance(data[0][0], tuple): # sometimes ebooklib returns tuples
                return str(data[0][0][0])
            return str(data[0][0])
        return None

    def _extract_cover(self, book: epub.EpubBook, file_id: uuid.UUID) -> Optional[str]:
        cover_items = [item for item in book.get_items() if isinstance(item, epub.EpubCover) or (isinstance(item, epub.EpubImage) and 'cover' in item.id.lower())]
        if not cover_items:
            # Fallback to search any image with 'cover' in file name
            cover_items = [item for item in book.get_items_of_type(ebooklib.ITEM_IMAGE) if 'cover' in item.file_name.lower()]
            
        if cover_items:
            cover_item = cover_items[0]
            extension = cover_item.file_name.split('.')[-1] if '.' in cover_item.file_name else 'jpg'
            cover_filename = f"{file_id}_cover.{extension}"
            cover_filepath = COVERS_DIR / cover_filename
            
            with open(cover_filepath, 'wb') as f:
                f.write(cover_item.get_content())
                
            return f"/covers/{cover_filename}"
        return None

    def _extract_chapters(self, book: epub.EpubBook, book_id: uuid.UUID) -> List[Chapter]:
        chapters: List[Chapter] = []
        order_idx = 0
        
        # Helper to recursively parse TOC
        def parse_toc(items, level=1):
            nonlocal order_idx
            for item in items:
                if isinstance(item, epub.Link):
                    # It's a link to a document
                    doc_item = book.get_item_with_href(item.href)
                    text = ""
                    if doc_item:
                        soup = BeautifulSoup(doc_item.get_body_content(), 'html.parser')
                        text = soup.get_text(separator='\n', strip=True)
                    
                    chapters.append(Chapter(
                        book_id=book_id,
                        title=item.title or f"Chapter {order_idx+1}",
                        level=level,
                        order_index=order_idx,
                        src_href=item.href,
                        content_text=text
                    ))
                    order_idx += 1
                elif isinstance(item, tuple):
                    # Section with sub-items
                    section, sub_items = item
                    if isinstance(section, epub.Section):
                        chapters.append(Chapter(
                            book_id=book_id,
                            title=section.title,
                            level=level,
                            order_index=order_idx,
                            src_href=section.href,
                            content_text="" # usually sections just group
                        ))
                        order_idx += 1
                    parse_toc(sub_items, level + 1)
                elif isinstance(item, epub.Section):
                    chapters.append(Chapter(
                        book_id=book_id,
                        title=item.title,
                        level=level,
                        order_index=order_idx,
                        src_href=item.href,
                        content_text=""
                    ))
                    order_idx += 1

        # Attempt to parse standard TOC
        if book.toc:
            parse_toc(book.toc)
        
        # Filter out empty chapters or see if we need a fallback
        valid_chapters = [c for c in chapters if c.content_text.strip()]
        
        if not valid_chapters:
            # Fallback: TOC was empty or useless, just iterate all documents
            logger.info("TOC incomplete or missing, falling back to raw document extraction.")
            chapters = []
            order_idx = 0
            for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
                soup = BeautifulSoup(item.get_body_content(), 'html.parser')
                text = soup.get_text(separator='\n', strip=True)
                
                if not text:
                    continue
                    
                # Try to find an h1 or h2 for title
                title = f"Part {order_idx+1}"
                h = soup.find(['h1', 'h2', 'h3'])
                if h and h.get_text(strip=True):
                    title = h.get_text(strip=True)[:100]
                    
                chapters.append(Chapter(
                    book_id=book_id,
                    title=title,
                    level=1,
                    order_index=order_idx,
                    src_href=item.file_name,
                    content_text=text
                ))
                order_idx += 1
                
        return chapters

book_extractor = BookExtractorService()
