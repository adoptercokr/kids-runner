import os
import glob
from PIL import Image

def remove_white_bg(img_path):
    try:
        img = Image.open(img_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(img_path, "PNG")
        print(f"Processed: {img_path}")
    except Exception as e:
        print(f"Failed to process {img_path}: {e}")

assets_dir = r"C:\nas\mj\비즈니스\유튜브-SNS-캐릭터-애니\ai사이트\AI-mj공작실\02-Spark-Game-Studio\kids-runner\assets"
files = glob.glob(os.path.join(assets_dir, "*.png"))

for path in files:
    if "bg.png" not in path:
        remove_white_bg(path)
