import os
from PIL import Image

img_path = r"C:\nas\mj\비즈니스\유튜브-SNS-캐릭터-애니\ai사이트\AI-mj공작실\02-Spark-Game-Studio\kids-runner\assets\spritesheet.jpg"
out_dir = r"C:\nas\mj\비즈니스\유튜브-SNS-캐릭터-애니\ai사이트\AI-mj공작실\02-Spark-Game-Studio\kids-runner\assets\slices"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(img_path).convert("RGBA")

# 1. Backgrounds
img.crop((0, 78, 1024, 208)).save(os.path.join(out_dir, "bg_sky.png"))
img.crop((0, 208, 1024, 338)).save(os.path.join(out_dir, "bg_city.png"))
img.crop((0, 338, 1024, 468)).save(os.path.join(out_dir, "bg_street.png"))

def make_transparent(cropped, bg_color=(57, 60, 66), tolerance=35):
    datas = cropped.getdata()
    newData = []
    for item in datas:
        # 배경색(어두운 회색)과 비슷하면 투명하게
        if abs(item[0]-bg_color[0]) < tolerance and abs(item[1]-bg_color[1]) < tolerance and abs(item[2]-bg_color[2]) < tolerance:
            newData.append((255, 255, 255, 0))
        # 혹시 글자가 잘려 들어갔을 경우 흰색 글씨 투명하게
        elif item[0] > 230 and item[1] > 230 and item[2] > 230:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    cropped.putdata(newData)
    return cropped

# 2. Sprites
for i in range(4):
    char = img.crop((20 + i*70, 410, 80 + i*70, 480))
    make_transparent(char).save(os.path.join(out_dir, f"player_{i}.png"))

coin = img.crop((340, 410, 390, 460))
make_transparent(coin).save(os.path.join(out_dir, "coin.png"))

shield = img.crop((445, 410, 495, 460))
make_transparent(shield).save(os.path.join(out_dir, "shield.png"))

spike = img.crop((530, 450, 610, 520))
make_transparent(spike).save(os.path.join(out_dir, "spike.png"))

bat = img.crop((710, 400, 790, 460))
make_transparent(bat).save(os.path.join(out_dir, "bat.png"))

goblin = img.crop((910, 440, 980, 530))
make_transparent(goblin).save(os.path.join(out_dir, "goblin.png"))

print("Slicing and background removal complete!")
