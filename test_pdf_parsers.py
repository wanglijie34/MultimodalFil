import sys
import os

filepath = "/mnt/d/Develop/MultimodalFile/NLC416-02jh004563-14492_崇禎長編.pdf"
if not os.path.exists(filepath):
    print("File not found.")
    sys.exit()

print("Testing pypdf...")
try:
    from pypdf import PdfReader
    reader = PdfReader(filepath)
    print(f"pypdf Pages: {len(reader.pages)}")
    print(f"pypdf Page 1 text: {repr(reader.pages[0].extract_text())[:200]}")
except Exception as e:
    print(e)

print("\nTesting PyMuPDF...")
try:
    import fitz
    doc = fitz.open(filepath)
    print(f"fitz Pages: {len(doc)}")
    print(f"fitz Page 1 text: {repr(doc[0].get_text())[:200]}")
except Exception as e:
    print(e)

print("\nTesting pdfplumber...")
try:
    import pdfplumber
    with pdfplumber.open(filepath) as pdf:
        print(f"pdfplumber Pages: {len(pdf.pages)}")
        print(f"pdfplumber Page 1 text: {repr(pdf.pages[0].extract_text())[:200]}")
except Exception as e:
    print(e)
