import sys
from PIL import Image
import math

def remove_background(input_path, output_path, tolerance=30):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        # Get background color from top-left corner
        bg_color = datas[0]
        
        newData = []
        for item in datas:
            # Calculate distance
            diff = math.sqrt((item[0]-bg_color[0])**2 + (item[1]-bg_color[1])**2 + (item[2]-bg_color[2])**2)
            
            # If the pixel is close to black/dark background
            if diff < tolerance and item[0] < 50 and item[1] < 50 and item[2] < 50:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully processed {input_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    # Ensure Pillow is installed
    try:
        import PIL
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        from PIL import Image

    remove_background("frontend/public/images/capital_icon.png", "frontend/public/images/capital_icon.png", 60)
    remove_background("frontend/public/images/fortress_icon.png", "frontend/public/images/fortress_icon.png", 60)
