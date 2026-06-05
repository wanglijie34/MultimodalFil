import os
import uuid
import shutil
import re
import hashlib
import json
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple, Any

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.future import select

from app.models.file import File
from app.models.book import Book, Chapter
from app.integrations.minio_client import minio_client
from app.services.llm_service import llm_service
from loguru import logger

# Where we will store extracted covers locally
COVERS_DIR = Path(__file__).resolve().parents[3] / "files" / "covers"
COVERS_DIR.mkdir(parents=True, exist_ok=True)

class BookExtractorService:
    async def extract_book_from_file(self, db: AsyncSession, file_id: uuid.UUID) -> Optional[Book]:
        # 1. Verify file
        db_file = await db.get(File, file_id)
        if not db_file or db_file.file_type not in ["epub", "pdf"]:
            logger.error(f"File {file_id} is not a valid EPUB or PDF.")
            return None

        # Check if already extracted
        existing = await db.execute(select(Book).where(Book.source_file_id == file_id))
        db_book = existing.scalars().first()
        if db_book:
            logger.info(f"Book for file {file_id} already exists.")
            return db_book

        if db_file.file_type == "pdf":
            from app.models.file import DocumentPage
            # For PDF, we rely on the parsed DocumentPage from ingestion
            stmt = select(DocumentPage).where(DocumentPage.file_id == file_id).order_by(DocumentPage.page_number)
            pages = (await db.execute(stmt)).scalars().all()
            
            if not pages:
                raise ValueError("PDF is still parsing or has no extractable text. Please wait for ingestion to complete.")

            db_book = Book(
                source_file_id=file_id,
                title=db_file.original_filename,
                author="Unknown",
                language="en",
                description="Imported PDF Document"
            )
            db.add(db_book)
            await db.flush()
            
            import fitz
            
            built_in_toc = []
            try:
                logger.info(f"Checking for built-in TOC in PDF: {db_file.storage_key}")
                file_bytes = minio_client.download_file(db_file.storage_key)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                
                doc = fitz.open(tmp_path)
                toc = doc.get_toc()
                doc.close()
                os.remove(tmp_path)
                
                if toc:
                    built_in_toc = [{"title": str(item[1]).strip(), "start_page": int(item[2])} for item in toc if len(item) >= 3]
                    if len(built_in_toc) < 6:
                        logger.warning(f"Built-in TOC has only {len(built_in_toc)} entries (likely basic bookmarks). Falling back to LLM.")
                        built_in_toc = []
                    else:
                        logger.info(f"Found built-in TOC with {len(built_in_toc)} entries.")
            except Exception as e:
                logger.error(f"Failed to check built-in TOC: {e}")

            chapters = []

            if built_in_toc:
                logger.info("Using built-in PDF bookmarks for chapters.")
                current_chapter_title = "Front Matter"
                current_text_blocks = []
                next_toc_idx = 0
                
                for p in pages:
                    t = p.text_content or ""
                    t_clean = re.sub(r'[．.。・·]{5,}', '...', t)
                    
                    if next_toc_idx < len(built_in_toc):
                        next_entry = built_in_toc[next_toc_idx]
                        if p.page_number >= next_entry["start_page"]:
                            if current_text_blocks:
                                chapters.append(Chapter(
                                    book_id=db_book.id,
                                    order_index=len(chapters),
                                    title=current_chapter_title,
                                    content_text="\n\n".join(current_text_blocks)
                                ))
                                current_text_blocks = []
                            current_chapter_title = next_entry["title"]
                            next_toc_idx += 1
                            # Fast forward if multiple TOC entries point to same page
                            while next_toc_idx < len(built_in_toc) and p.page_number >= built_in_toc[next_toc_idx]["start_page"]:
                                current_chapter_title = built_in_toc[next_toc_idx]["title"]
                                next_toc_idx += 1
                                
                    current_text_blocks.append(t_clean)
                    
                if current_text_blocks:
                    chapters.append(Chapter(
                        book_id=db_book.id,
                        order_index=len(chapters),
                        title=current_chapter_title,
                        content_text="\n\n".join(current_text_blocks)
                    ))
            else:
                # 1. Prepare sample text for LLM (first 25 pages)
                sample_text = ""
                for p in pages[:25]:
                    t = p.text_content or ""
                    t = re.sub(r'[．.。・·]{5,}', '...', t)
                    sample_text += f"\n--- Page {p.page_number} ---\n{t}"
                    
                # 2. Call LLM to extract TOC, using cache
                cache_dir = "llm_cache"
                os.makedirs(cache_dir, exist_ok=True)
                cache_file = os.path.join(cache_dir, f"toc_{file_id}.json")
                
                toc_chapters = []
                if os.path.exists(cache_file):
                    try:
                        with open(cache_file, "r", encoding="utf-8") as f:
                            toc_chapters = json.load(f)
                    except Exception:
                        pass
                        
                if not toc_chapters:
                    prompt = f"""You are an expert at extracting tables of contents from raw OCR text of scanned books.
Here are the first few pages of a book:
{sample_text}

Identify the table of contents. Extract the list of chapter titles exactly as they are written.
Return EXACTLY a JSON array of strings containing the chapter titles in order.
For example: ["Chapter 1", "Chapter 2", "Chapter 3"]
If you cannot find a clear table of contents, return an empty array [].
JSON:"""
                    try:
                        response = await llm_service.chat([{"role": "user", "content": prompt}], json_mode=True)
                        if "```json" in response:
                            response = response.split("```json")[1].split("```")[0]
                        elif "```" in response:
                            response = response.split("```")[1].split("```")[0]
                            
                        data = json.loads(response.strip())
                        if isinstance(data, list):
                            toc_chapters = [str(x).strip() for x in data if str(x).strip()]
                        elif isinstance(data, dict) and "chapters" in data:
                            toc_chapters = [str(x).strip() for x in data["chapters"] if str(x).strip()]
                            
                        if toc_chapters:
                            with open(cache_file, "w", encoding="utf-8") as f:
                                json.dump(toc_chapters, f, ensure_ascii=False)
                    except Exception as e:
                        logger.error(f"TOC extraction failed: {e}")
                        toc_chapters = []
                
                if toc_chapters and len(toc_chapters) > 0:
                    logger.info(f"Using extracted TOC with {len(toc_chapters)} chapters for merging.")
                    current_chapter_title = "Front Matter"
                    current_text_blocks = []
                    next_title_idx = 0
                    
                    for p in pages:
                        t = p.text_content or ""
                        t_clean = re.sub(r'[．.。・·]{5,}', '...', t)
                        
                        if next_title_idx < len(toc_chapters):
                            next_title = toc_chapters[next_title_idx]
                            clean_t = t_clean.replace(" ", "").replace("\n", "")
                            clean_title = next_title.replace(" ", "").replace("\n", "")
                            
                            if clean_title in clean_t:
                                if current_text_blocks:
                                    chapters.append(Chapter(
                                        book_id=db_book.id,
                                        order_index=len(chapters),
                                        title=current_chapter_title,
                                        content_text="\n\n".join(current_text_blocks)
                                    ))
                                    current_text_blocks = []
                                
                                current_chapter_title = next_title
                                next_title_idx += 1
                                while next_title_idx < len(toc_chapters):
                                    next_t = toc_chapters[next_title_idx].replace(" ", "").replace("\n", "")
                                    if next_t in clean_t:
                                        current_chapter_title = toc_chapters[next_title_idx]
                                        next_title_idx += 1
                                    else:
                                        break
                        
                        current_text_blocks.append(t_clean)
                        
                    if current_text_blocks:
                        chapters.append(Chapter(
                            book_id=db_book.id,
                            order_index=len(chapters),
                            title=current_chapter_title,
                            content_text="\n\n".join(current_text_blocks)
                        ))
                else:
                    logger.info("No TOC found. Falling back to page-by-page mapping.")
                    for i, page in enumerate(pages):
                        text = page.text_content or ""
                        text = re.sub(r'[．.。・·]{5,}', '...', text)
                        chapters.append(Chapter(
                            book_id=db_book.id,
                            order_index=i,
                            title=f"Page {page.page_number}",
                            content_text=text
                        ))
            
            if chapters:
                db.add_all(chapters)
            await db.commit()
            await db.refresh(db_book)
            logger.info(f"Successfully extracted PDF: {db_book.title} with {len(chapters)} chapters.")
            return db_book

        # === EPUB LOGIC ===

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
        chapters = await self._extract_chapters(book_epub, db_book.id, file_id)
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

    async def _extract_chapters(self, book: epub.EpubBook, book_id: uuid.UUID, file_id: uuid.UUID) -> List[Chapter]:
        """
        Extract chapters by walking the TOC tree for structure (titles, hierarchy)
        and the spine for content (body text).
        
        Strategy:
        1. Flatten the TOC tree into an ordered list of entries with (title, level, href).
           Only keep "chapter-level" entries (篇 and 章), skip sub-section 【小节】 titles.
        2. Build a content map: base_href -> body text (from spine).
        3. Walk the ordered TOC list, attach content from spine, produce chapters.
        4. Pick up any spine documents NOT covered by TOC entries.
        """
        from collections import OrderedDict
        
        # --- Step 1: Flatten the TOC tree into an ordered entry list ---
        toc_entries: list = []  # [{'title', 'level', 'href', 'base_href'}, ...]
        
        def flatten_toc(items, level=1):
            for item in items:
                if isinstance(item, epub.Link):
                    href = item.href or ''
                    base = href.split('#')[0]
                    toc_entries.append({
                        'title': item.title, 'level': level,
                        'href': href, 'base_href': base
                    })
                elif isinstance(item, tuple):
                    section, sub_items = item
                    if isinstance(section, (epub.Section, epub.Link)):
                        href = section.href or ''
                        base = href.split('#')[0]
                        toc_entries.append({
                            'title': section.title, 'level': level,
                            'href': href, 'base_href': base
                        })
                    # Recurse into children
                    flatten_toc(sub_items, level + 1)
                elif isinstance(item, epub.Section):
                    href = item.href or ''
                    base = href.split('#')[0]
                    toc_entries.append({
                        'title': item.title, 'level': level,
                        'href': href, 'base_href': base
                    })
        
        if book.toc:
            flatten_toc(book.toc)
        
        # --- Step 2: Determine the max depth to use for chapters ---
        # We want "篇" (level 1) and "章" (level 2) as separate chapters,
        # but NOT deeper sub-sections (level 3+ like 【xxx】).
        # Determine max_chapter_level: if there are 3+ distinct levels, cap at 2.
        all_levels = set(e['level'] for e in toc_entries)
        max_chapter_level = 2 if len(all_levels) >= 3 else max(all_levels) if all_levels else 1
        
        # Filter to only chapter-level entries
        chapter_entries = [e for e in toc_entries if e['level'] <= max_chapter_level]
        
        # --- Step 3: Build spine list and content ---
        spine_items: list = []  # [{'base_href': str, 'text': str}, ...]
        seen_bases: set = set()
        for item_id, _ in book.spine:
            item = book.get_item_with_id(item_id)
            if not item or item.get_type() != ebooklib.ITEM_DOCUMENT:
                continue
            href = item.get_name()
            base = href.split('#')[0]
            if base in seen_bases:
                continue
            seen_bases.add(base)
            soup = BeautifulSoup(item.get_body_content(), 'html.parser')
            text = soup.get_text(separator='\n', strip=True)
            if text.strip():
                spine_items.append({'base_href': base, 'text': text})
        
        # --- Step 4: Check if TOC is shallow and fallback to LLM ---
        # Only fallback if the TOC is practically empty or very sparse compared to the spine items, 
        # meaning many chapters are likely hidden without TOC entries.
        if len(chapter_entries) == 0 or (len(chapter_entries) < 6 and len(spine_items) > len(chapter_entries) * 2):
            logger.warning(f"EPUB built-in TOC is too shallow ({len(chapter_entries)} entries). Falling back to LLM extraction.")
            sample_text = ""
            for item in spine_items[:10]:
                sample_text += f"\n{item['text'][:3000]}"
                if len(sample_text) > 15000:
                    break
                    

            from app.services.llm_service import llm_service
            cache_dir = "llm_cache"
            os.makedirs(cache_dir, exist_ok=True)
            cache_file = os.path.join(cache_dir, f"toc_{file_id}.json")
            
            toc_chapters = []
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        toc_chapters = json.load(f)
                except Exception:
                    pass
                    
            if not toc_chapters:
                prompt = f"""You are an expert at extracting tables of contents from raw text of books.
Here are the first few parts of a book:
{sample_text}

Identify the table of contents. Extract the list of chapter titles exactly as they are written.
Return EXACTLY a JSON array of strings containing the chapter titles in order.
For example: ["Chapter 1", "Chapter 2", "Chapter 3"]
If you cannot find a clear table of contents, return an empty array [].
JSON:"""
                try:
                    response = await llm_service.chat([{"role": "user", "content": prompt}], json_mode=True)
                    if "```json" in response:
                        response = response.split("```json")[1].split("```")[0]
                    elif "```" in response:
                        response = response.split("```")[1].split("```")[0]
                        
                    data = json.loads(response.strip())
                    if isinstance(data, list):
                        toc_chapters = [str(x).strip() for x in data if str(x).strip()]
                    elif isinstance(data, dict) and "chapters" in data:
                        toc_chapters = [str(x).strip() for x in data["chapters"] if str(x).strip()]
                        
                    if toc_chapters:
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(toc_chapters, f, ensure_ascii=False)
                except Exception as e:
                    logger.error(f"TOC extraction failed: {e}")
                    toc_chapters = []
                    
            if toc_chapters and len(toc_chapters) > 0:
                logger.info(f"Using extracted TOC with {len(toc_chapters)} chapters for EPUB merging.")
                chapters = []
                current_chapter_title = "Front Matter"
                current_text_blocks = []
                next_title_idx = 0
                
                # Split the entire EPUB text based on LLM TOC
                for spine_item in spine_items:
                    t = spine_item['text']
                    
                    if next_title_idx < len(toc_chapters):
                        next_title = toc_chapters[next_title_idx]
                        clean_t = t.replace(" ", "").replace("\n", "")
                        clean_title = next_title.replace(" ", "").replace("\n", "")
                        
                        if clean_title in clean_t:
                            if current_text_blocks:
                                chapters.append(Chapter(
                                    book_id=book_id,
                                    order_index=len(chapters),
                                    title=current_chapter_title,
                                    content_text="\n\n".join(current_text_blocks)
                                ))
                                current_text_blocks = []
                            
                            current_chapter_title = next_title
                            next_title_idx += 1
                            while next_title_idx < len(toc_chapters):
                                next_t = toc_chapters[next_title_idx].replace(" ", "").replace("\n", "")
                                if next_t in clean_t:
                                    current_chapter_title = toc_chapters[next_title_idx]
                                    next_title_idx += 1
                                else:
                                    break
                    
                    current_text_blocks.append(t)
                    
                if current_text_blocks:
                    chapters.append(Chapter(
                        book_id=book_id,
                        order_index=len(chapters),
                        title=current_chapter_title,
                        content_text="\n\n".join(current_text_blocks)
                    ))
                return chapters

        # --- Step 5: Fallback to built-in EPUB TOC mapping ---
        from collections import defaultdict
        href_to_entries: dict = defaultdict(list)
        for e in chapter_entries:
            href_to_entries[e['base_href']].append(e)
        
        # --- Step 5: Walk spine with queue logic to handle Calibre offset bugs ---
        # When multiple TOC entries point to the same file, but subsequent files have NO TOC entries,
        # it's a known EPUB bug. We use a pending queue to align them correctly.
        chapters: List[Chapter] = []
        pending_entries = []
        active_chapter = None
        previous_text = ""
        order_idx = 0
        
        for spine_item in spine_items:
            base = spine_item['base_href']
            text = spine_item['text']
            entries = href_to_entries.get(base, [])
            
            if entries:
                # We hit a new TOC-referenced file. 
                # Any remaining pending entries didn't get their own file, so they 
                # share the previous file's text.
                for p in pending_entries:
                    chapters.append(Chapter(
                        book_id=book_id,
                        title=p['title'] or f"Section {order_idx+1}",
                        level=p['level'],
                        order_index=order_idx,
                        src_href=p['href'],
                        # Make shallow headers empty to serve as structural dividers
                        content_text="" if p['level'] < max_chapter_level else previous_text
                    ))
                    order_idx += 1
                
                pending_entries = entries.copy()
                
            if pending_entries:
                # Consume one pending entry for this spine file
                e = pending_entries.pop(0)
                # If it's a high-level header AND it's not the only entry for this file,
                # we could make it empty. But for simplicity and safety, we just give it the text.
                # If the text is just a 4-char title, it's effectively empty anyway.
                new_chap = Chapter(
                    book_id=book_id,
                    title=e['title'] or f"Section {order_idx+1}",
                    level=e['level'],
                    order_index=order_idx,
                    src_href=e['href'],
                    content_text=text
                )
                chapters.append(new_chap)
                active_chapter = new_chap
                order_idx += 1
            else:
                # Orphaned file and no pending entries -> append to active chapter
                if active_chapter:
                    active_chapter.content_text += "\n\n" + text
            
            previous_text = text
            
        # Final flush of any trailing pending entries
        for p in pending_entries:
            chapters.append(Chapter(
                book_id=book_id,
                title=p['title'] or f"Section {order_idx+1}",
                level=p['level'],
                order_index=order_idx,
                src_href=p['href'],
                content_text="" if p['level'] < max_chapter_level else previous_text
            ))
            order_idx += 1
        
        return chapters

book_extractor = BookExtractorService()
