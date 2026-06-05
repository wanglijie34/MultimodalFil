import httpx
import sys
import os

filepath = "NLC416-02jh004563-14492_崇禎長編.pdf"

if not os.path.exists(filepath):
    print(f"File not found: {filepath}")
    sys.exit(1)

print(f"Uploading {filepath}...")
with open(filepath, "rb") as f:
    files = {"file": ("NLC416-02jh004563-14492_崇禎長編.pdf", f, "application/pdf")}
    try:
        response = httpx.post("http://localhost:8000/api/v1/files/upload", files=files, timeout=60.0)
        print(f"Status: {response.status_code}")
        print(response.json())
    except Exception as e:
        print(f"Failed to upload: {e}")
