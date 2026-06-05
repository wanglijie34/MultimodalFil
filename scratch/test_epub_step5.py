import sys
sys.stdout.reconfigure(encoding='utf-8')
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup

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

all_levels = set(e['level'] for e in toc_entries)
max_chapter_level = 2 if len(all_levels) >= 3 else max(all_levels) if all_levels else 1
chapter_entries = [e for e in toc_entries if e['level'] <= max_chapter_level]

spine_items = []
seen_bases = set()
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

print(f"Num chapter entries: {len(chapter_entries)}")
print(f"Num spine items: {len(spine_items)}")

# Step 5 Simulation
from collections import defaultdict
href_to_entries = defaultdict(list)
for e in chapter_entries:
    href_to_entries[e['base_href']].append(e)

chapters = []
pending_entries = []
active_chapter = None
previous_text = ""
order_idx = 0

for spine_item in spine_items:
    base = spine_item['base_href']
    text = spine_item['text']
    entries = href_to_entries.get(base, [])
    
    if entries:
        for p in pending_entries:
            chapters.append({
                'title': p['title'] or f"Section {order_idx+1}",
                'level': p['level'],
                'order_index': order_idx,
                'content_length': 0 if p['level'] < max_chapter_level else len(previous_text)
            })
            order_idx += 1
        
        pending_entries = entries.copy()
        
    if pending_entries:
        e = pending_entries.pop(0)
        new_chap = {
            'title': e['title'] or f"Section {order_idx+1}",
            'level': e['level'],
            'order_index': order_idx,
            'content_length': len(text)
        }
        chapters.append(new_chap)
        active_chapter = new_chap
        order_idx += 1
    else:
        if active_chapter:
            active_chapter['content_length'] += len(text) + 2
    
    previous_text = text

for p in pending_entries:
    chapters.append({
        'title': p['title'] or f"Section {order_idx+1}",
        'level': p['level'],
        'order_index': order_idx,
        'content_length': 0 if p['level'] < max_chapter_level else len(previous_text)
    })
    order_idx += 1

print("--- Step 5 Chapters ---")
for c in chapters:
    print(c)
