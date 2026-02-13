from PIL import Image
import os

img_path = r'C:\projects\flow-vid-manager\public\lovable-uploads\futuristic-team-banner.png'
if os.path.exists(img_path):
    with Image.open(img_path) as img:
        print(f"Dimensions: {img.width}x{img.height}")
        print(f"Format: {img.format}")
        print(f"Mode: {img.mode}")
else:
    print("File not found.")
