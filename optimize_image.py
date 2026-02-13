import os
from PIL import Image

src = r"public/lovable-uploads/futuristic-team-banner.png"
dst = r"public/lovable-uploads/futuristic-team-banner.webp"

if not os.path.exists(src):
    print(f"Error: {src} not found")
    exit(1)

try:
    img = Image.open(src)
    orig_size = os.path.getsize(src)
    # Save as WebP with good quality and lossless=False for best compression
    img.save(dst, "WEBP", quality=80)
    new_size = os.path.getsize(dst)
    
    print(f"Original file size: {orig_size / 1024:.2f} KB")
    print(f"WebP file size: {new_size / 1024:.2f} KB")
    print(f"Reduction: {(1 - new_size/orig_size)*100:.2f}%")
    print(f"Dimensions: {img.size}")
except Exception as e:
    print(f"Error during conversion: {e}")
