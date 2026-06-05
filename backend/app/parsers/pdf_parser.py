from pypdf import PdfReader
from app.parsers.base import BaseParser, ParsedDocument, ParsedPage
from loguru import logger
import fitz
import base64
import os
import time
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed

def process_page(file_path: str, page_num: int, client: OpenAI) -> ParsedPage:
    # Open document locally for thread safety
    doc = fitz.open(file_path)
    page = doc[page_num]
    text = page.get_text() or ""
    
    if len(text.strip()) < 20 and client:
        logger.info(f"Page {page_num+1} appears to be scanned. Using Qwen-VL OCR...")
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_data = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_data).decode("utf-8")
            
            # API Call (Bottle neck)
            response = client.chat.completions.create(
                model="qwen3-vl-plus",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "请精确提取这张古籍扫描件上的所有文字内容，保持原有文字顺序，尽量连贯，不要添加任何额外的解释或格式，直接输出纯文本。"},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                        ]
                    }
                ],
                max_tokens=2000
            )
            ocr_text = response.choices[0].message.content
            if ocr_text:
                text = ocr_text
        except Exception as e:
            logger.error(f"OCR failed for page {page_num+1}: {e}")
            
    doc.close()
    return ParsedPage(page_number=page_num + 1, text=text)


class PDFParser(BaseParser):
    def parse(self, file_path: str, file_id: str) -> ParsedDocument:
        logger.info(f"Parsing PDF (Multi-threaded OCR): {file_path}")
        
        temp_doc = fitz.open(file_path)
        total_pages = len(temp_doc)
        temp_doc.close()
        
        api_key = os.getenv("DASHSCOPE_API_KEY")
        base_url = os.getenv("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        
        client = None
        if api_key:
            try:
                client = OpenAI(api_key=api_key, base_url=base_url)
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client for OCR: {e}")
        
        pages = []
        # DashScope Qwen-VL rate limit is usually high enough, but 10 threads is a safe balance for speed vs API stability
        MAX_WORKERS = 10 
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(process_page, file_path, i, client): i 
                for i in range(total_pages)
            }
            
            for future in as_completed(futures):
                try:
                    parsed_page = future.result()
                    pages.append(parsed_page)
                except Exception as e:
                    page_num = futures[future]
                    logger.error(f"Failed processing page {page_num+1}: {e}")
                    pages.append(ParsedPage(page_number=page_num+1, text=""))

        # Sort pages since threads complete out of order
        pages.sort(key=lambda p: p.page_number)
            
        return ParsedDocument(
            file_id=file_id,
            pages=pages,
            metadata={"total_pages": total_pages}
        )
