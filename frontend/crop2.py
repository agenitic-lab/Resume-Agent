import sys
from PIL import Image

try:
    img = Image.open('/home/shabas-rahman/Desktop/Bridgeon/Group-Project/Resume-Agent/frontend/public/resiko-logo.png')
    img = img.convert("RGBA")
    
    width, height = img.size
    data = img.getdata()
    
    min_x = width
    min_y = height
    max_x = -1
    max_y = -1
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = data[y * width + x]
            # Use an alpha threshold of 10 to ignore very faint shadow/antialias pixels
            if a > 10:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    if max_x >= min_x and max_y >= min_y:
        bbox = (min_x, min_y, max_x+1, max_y+1)
        print("Mask-based bounding box:", bbox)
        
        img_cropped = img.crop(bbox)
        img_cropped.save('/home/shabas-rahman/Desktop/Bridgeon/Group-Project/Resume-Agent/frontend/public/resiko-logo-cropped.png')
        print("Cropped logo saved to resiko-logo-cropped.png. New size:", img_cropped.size)
    else:
        print("No non-transparent pixels found.")
except Exception as e:
    print(f"Error: {e}") 
