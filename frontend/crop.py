import sys
from PIL import Image

try:
    img = Image.open('/home/shabas-rahman/Desktop/Bridgeon/Group-Project/Resume-Agent/frontend/public/resiko-logo.png')
    img = img.convert("RGBA")
    bbox = img.getbbox()
    print("Original size:", img.size)
    print("Bounding box:", bbox)
    if bbox:
        img_cropped = img.crop(bbox)
        img_cropped.save('/home/shabas-rahman/Desktop/Bridgeon/Group-Project/Resume-Agent/frontend/public/resiko-logo-cropped.png')
        print("Cropped logo saved to resiko-logo-cropped.png. New size:", img_cropped.size)
except ImportError:
    print("Pillow not installed")
except Exception as e:
    print(f"Error: {e}")
