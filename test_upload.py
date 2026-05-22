import httpx
import uuid

# Create a dummy epub file
with open("test.epub", "wb") as f:
    f.write(b"dummy content")

with open("test.epub", "rb") as f:
    files = {"file": ("test.epub", f, "application/epub+zip")}
    response = httpx.post("http://localhost:8000/api/v1/files/upload", files=files)

print(response.status_code)
print(response.json())
