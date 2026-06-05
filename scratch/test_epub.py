import sys
sys.stdout.reconfigure(encoding='utf-8')
import ebooklib
from ebooklib import epub

book = epub.read_epub(r"D:\Develop\MultimodalFile\files\崇禎實錄.epub")

def print_toc(items, indent=0):
    for item in items:
        if isinstance(item, epub.Link):
            print("  " * indent + f"Link: {item.title} -> {item.href}")
        elif isinstance(item, tuple):
            section, sub_items = item
            if isinstance(section, (epub.Section, epub.Link)):
                print("  " * indent + f"Section: {section.title} -> {section.href}")
            print_toc(sub_items, indent + 1)
        elif isinstance(item, epub.Section):
            print("  " * indent + f"Section(single): {item.title} -> {item.href}")

print("--- TOC ---")
print_toc(book.toc)
print("--- SPINE ---")
for item_id, _ in book.spine:
    item = book.get_item_with_id(item_id)
    if item:
        print(f"Spine item: {item.get_name()}")
