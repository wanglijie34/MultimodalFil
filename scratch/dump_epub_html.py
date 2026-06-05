import sys
sys.stdout.reconfigure(encoding='utf-8')
import ebooklib
from ebooklib import epub

book = epub.read_epub(r"D:\Develop\MultimodalFile\files\崇禎實錄.epub")

for item_id, _ in book.spine:
    item = book.get_item_with_id(item_id)
    if not item or item.get_type() != ebooklib.ITEM_DOCUMENT:
        continue
    
    if "juan_yi" in item.get_name():
        print(f"\n================ [ RAW HTML: {item.get_name()} ] ================\n")
        print(item.get_body_content().decode('utf-8'))
