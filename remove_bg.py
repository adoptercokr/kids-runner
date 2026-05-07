import os
from PIL import Image

def remove_white_bg(img_path):
    try:
        img = Image.open(img_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # White-ish pixels become transparent
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
files = ["body_run1.png", "body_run2.png", "obstacle.png", "item.png"]

for f in files:
    path = os.path.join(assets_dir, f)
    remove_white_bg(path)
