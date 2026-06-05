import sys
sys.stdout.reconfigure(encoding='utf-8')
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

book = epub.read_epub(r"D:\Develop\MultimodalFile\files\崇禎實錄.epub")

for item_id, _ in book.spine:
    item = book.get_item_with_id(item_id)
    if not item or item.get_type() != ebooklib.ITEM_DOCUMENT:
        continue
    
    print(f"\n================ [ {item.get_name()} ] ================\n")
    soup = BeautifulSoup(item.get_body_content(), 'html.parser')
    text = soup.get_text(separator='\n', strip=True)
    print(text[:1000]) # print first 1000 chars
