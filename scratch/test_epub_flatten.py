import sys
sys.stdout.reconfigure(encoding='utf-8')
import ebooklib
from ebooklib import epub

book = epub.read_epub(r"D:\Develop\MultimodalFile\files\崇禎實錄.epub")
toc_entries = []

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

print("--- Flattened TOC ---")
for e in toc_entries:
    print(e)
