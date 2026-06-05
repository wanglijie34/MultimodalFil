import os
import sys
import fitz
from PIL import Image
import io
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("DASHSCOPE_API_KEY")
base_url = os.getenv("DASHSCOPE_BASE_URL")
if not api_key:
    print("DASHSCOPE_API_KEY not found")
    sys.exit(1)

filepath = "NLC416-02jh004563-14492_崇禎長編.pdf"
doc = fitz.open(filepath)
page = doc[0]

pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
img_data = pix.tobytes("jpeg")
base64_image = base64.b64encode(img_data).decode("utf-8")

client = OpenAI(api_key=api_key, base_url=base_url)

prompt = "请精确提取这张古籍扫描件上的所有文字内容，保持原有文字顺序，不要添加任何额外的解释或格式，直接输出纯文本。"

print("Sending to Qwen-VL...")
try:
    response = client.chat.completions.create(
        model="qwen-vl-max",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ],
        max_tokens=2000
    )
    print("\n--- Extracted Text ---")
    print(response.choices[0].message.content)
    print("----------------------")
except Exception as e:
    print(f"Error: {e}")
