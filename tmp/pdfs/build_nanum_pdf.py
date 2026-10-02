from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(r"C:\Users\Soyoon Bang\Desktop\ChickProto")
FONTS = ROOT / "tmp" / "pdfs" / "NanumSquareNeo" / "NanumSquareNeo" / "TTF"
OUTPUT = ROOT / "output" / "pdf" / "삐약마을_핵심시스템_성장구조_나눔스퀘어네오.pdf"

pdfmetrics.registerFont(TTFont("NeoRegular", str(FONTS / "NanumSquareNeo-bRg.ttf")))
pdfmetrics.registerFont(TTFont("NeoBold", str(FONTS / "NanumSquareNeo-cBd.ttf")))
pdfmetrics.registerFont(TTFont("NeoExtraBold", str(FONTS / "NanumSquareNeo-dEb.ttf")))

S = 0.75
PW, PH = 1280 * S, 720 * S
C = {
    "bg": HexColor("#FFFDF7"), "ink": HexColor("#2D2A24"),
    "muted": HexColor("#676B60"), "orange": HexColor("#F28C28"),
    "green": HexColor("#63886A"), "line": HexColor("#DADDD1"),
}
pdf = canvas.Canvas(str(OUTPUT), pagesize=(PW, PH), pageCompression=1)
pdf.setTitle("삐약마을 핵심 시스템과 성장 구조")
pdf.setAuthor("삐약마을 기획")

def rect(x, y, w, h, color):
    pdf.setFillColor(color)
    pdf.rect(x*S, PH-(y+h)*S, w*S, h*S, fill=1, stroke=0)

def rule(x, y, w, color=C["line"]):
    rect(x, y, w, 2, color)

def text(value, x, y, w, h, size=28, color=C["ink"], bold=False, align="left", extra=False):
    name = "NeoExtraBold" if extra else ("NeoBold" if bold else "NeoRegular")
    size_pt = size*S
    width = w*S
    lines = simpleSplit(value, name, size_pt, width)
    leading = size_pt*1.25
    block_h = len(lines)*leading
    top = PH-y*S + (block_h-h*S)/2
    pdf.setFillColor(color)
    pdf.setFont(name, size_pt)
    for i, line in enumerate(lines):
        baseline = top-(i+1)*leading+size_pt*0.22
        if align == "right":
            pdf.drawRightString((x+w)*S, baseline, line)
        elif align == "center":
            pdf.drawCentredString((x+w/2)*S, baseline, line)
        else:
            pdf.drawString(x*S, baseline, line)

def image(relative, x, y, w, h):
    source = ROOT / relative
    with Image.open(source) as im:
        iw, ih = im.size
        fit = min(w/iw, h/ih)
        dw, dh = iw*fit, ih*fit
        dx, dy = x+(w-dw)/2, y+(h-dh)/2
        pdf.drawImage(ImageReader(im.convert("RGBA")), dx*S, PH-(dy+dh)*S,
                      dw*S, dh*S, mask="auto")

def base(title, no, subtitle):
    rect(0, 0, 1280, 720, C["bg"])
    text(title, 70, 47, 1125, 67, 43, bold=True)
    text(subtitle, 72, 118, 1120, 48, 23, C["muted"])
    rule(70, 654, 1140)
    text("삐약마을  ·  핵심 시스템과 성장 구조", 70, 665, 700, 25, 15, C["muted"])
    text(f"{no:02d}", 1160, 665, 50, 25, 15, C["muted"], align="right")

def page():
    pdf.showPage()

# 1
rect(0, 0, 1280, 720, C["bg"])
rect(0, 0, 20, 720, C["orange"])
text("삐약마을", 76, 134, 700, 94, 67, extra=True)
text("핵심 시스템과 성장 구조", 78, 236, 820, 77, 42, bold=True)
text("만든 공간에 병아리가 찾아오고, 함께한 행동이 다음 성장을 엽니다.",
     80, 343, 770, 104, 27, C["muted"])
rule(80, 510, 680, C["orange"])
text("기획 방향 초안  ·  2026.10", 80, 535, 600, 40, 21, C["muted"])
image("assets/unity/original/icon_chick_001.png", 897, 207, 290, 290)
page()

# 2
base("전체 게임 흐름", 2, "한 번의 제작이 끝이 아니라 다음 행동의 이유가 됩니다.")
steps = [
    ("01", "채집·가공", "지역 재료를 얻고 설비에서 가공"),
    ("02", "제작·배치", "가구와 도구를 만들어 공간에 설치"),
    ("03", "발견·맞이", "달라진 공간을 보고 새 병아리가 방문"),
    ("04", "함께 생활", "병아리와 작업하고 가구를 사용하는 모습을 봄"),
    ("05", "새 성장", "특기와 재료가 다음 제작과 지역을 엶"),
]
for i, (num, name, description) in enumerate(steps):
    y = 193+i*83
    text(num, 76, y, 69, 42, 25, C["orange"] if i == 2 else C["green"], True)
    text(name, 157, y, 246, 43, 31, bold=True)
    text(description, 450, y+3, 720, 40, 24, C["muted"])
    if i < 4: rule(157, y+61, 1014)
page()

# 3
base("성장은 행동과 공간으로 보입니다", 3, "레벨 수치보다 플레이어가 새로 할 수 있는 일을 늘립니다.")
rows = [
    ("생산 기반", "채집과 가공 설비", "직접 만들 수 있는 물건이 늘어남"),
    ("생활 공간", "가구·둥지·길의 배치", "빈 땅에 주민 생활이 생김"),
    ("주민 협동", "새 병아리의 특기", "기존 설비와 재료의 쓰임이 바뀜"),
    ("영역 확장", "여러 지역의 재료 조합", "공터와 제작 선택이 늘어남"),
]
for i, (name, action, outcome) in enumerate(rows):
    y=200+i*103
    rect(76,y+11,13,61,C["green"] if i%2 else C["orange"])
    text(name,108,y,263,53,30,bold=True)
    text(action,424,y+5,306,44,23,C["muted"])
    text(outcome,770,y+5,398,49,23)
    if i<3: rule(108,y+83,1065)
page()

# 4
base("신규 병아리: 방문부터 일상까지", 4, "한 병아리의 관심사와 특기가 모든 접점에서 이어집니다.")
rows = [
    ("발견", "무엇에 끌리는가", "화분 주변의 발자국"),
    ("첫 만남", "함께 무엇을 해 보는가", "첫 물 주기와 새싹 확인"),
    ("일상", "혼자 무엇을 하는가", "화분을 살피고 꽃을 나눔"),
    ("개입", "플레이어가 무엇을 바꾸는가", "돌볼 화분과 씨앗 선택"),
    ("성장", "다음에 무엇이 열리는가", "새 정원 가구·생활 장면"),
]
for i,(phase,question,example) in enumerate(rows):
    y=201+i*86
    text(phase,78,y,117,31,20,C["orange"] if i==1 else C["green"],True)
    text(question,201,y-2,410,47,27,bold=True)
    text(example,672,y,465,42,24,C["muted"])
    if i<4: rule(78,y+61,1055)
text("예시는 특기 설계 방식의 설명이며 확정된 병아리 사양은 아닙니다.",
     80,612,1050,34,18,C["muted"])
page()

# 5
base("병아리 특기는 ‘동사’로 구분", 5, "새 병아리는 숫자 보너스보다 새로운 장면이나 선택을 만듭니다.")
data=[
    ("발견·탐색","숨은 채집처와 병아리 흔적을 찾음"),
    ("기르기·돌보기","자연물과 재배물을 다른 상태로 키움"),
    ("만들기·고치기","새 가공품을 만들거나 시설을 손봄"),
    ("운반·연결","지역 사이의 재료 이동을 바꿈"),
    ("모으기·어울리기","공동 가구에 주민을 모음"),
    ("밝히기·꾸미기","공간의 분위기와 사용 행동을 바꿈"),
]
for i,(name,description) in enumerate(data):
    col,row=(0 if i<3 else 1),i%3
    x,y=80+col*585,200+row*133
    text(name,x,y,525,43,30,C["green"] if col else C["orange"],True)
    text(description,x,y+48,522,70,23)
    if row<2: rule(x,y+111,515)
page()

# 6
base("설비·가구·아이템의 역할", 6, "세 요소가 각각 다른 이유로 필요해야 제작이 재미있습니다.")
columns=[
    (78,"설비","무엇을 할 수 있는가","채집물을 가공하고 가구·도구를 만듭니다. 병아리 특기로 새 제작법이나 작업 방식이 열립니다.","assets/game/workbench.png"),
    (474,"가구","어디서 일이 벌어지는가","방문의 실마리이자 입주 후의 생활 무대입니다. 같은 가구도 사용하는 병아리에 따라 장면이 달라집니다.","assets/game/garden-swing.png"),
    (870,"아이템","무엇을 다음에 만들까","원재료는 가공품이 되고, 가공품은 도구·가구·공동 시설로 이어집니다. 지역 간 제작에도 다시 쓰입니다.","assets/game/logs.png"),
]
for x,name,lead,body,asset in columns:
    text(name,x,195,310,50,37,bold=True)
    text(lead,x,251,332,42,23,C["orange"],True)
    text(body,x,309,332,172,22,C["muted"])
    image(asset,x+74,492,184,131)
page()

# 7
base("재화는 획득처와 소비처가 분명해야 합니다", 7, "마을의 성장과 꾸미기에 쓰이는 이유를 먼저 만듭니다.")
text("재화",81,188,295,35,21,C["green"],True)
text("얻는 행동",391,188,310,35,21,C["green"],True)
text("주요 소비처",748,188,415,35,21,C["green"],True)
rule(80,228,1092,C["green"])
rows=[
    ("마을 동전","부탁·주문·납품","일반 꾸미기, 설비 개선, 공터 정비"),
    ("지역 재료","지역별 채집·생산","가공품, 도구, 가구, 공동 시설"),
    ("특별 제작 재료","협동·공동 활동·발견","상위 기능 가구와 개성 있는 제작물"),
    ("유료 재화","구매","외형·테마 꾸미기와 선택적 편의"),
]
for i,(currency,source,sink) in enumerate(rows):
    y=254+i*91
    text(currency,81,y,285,58,25,bold=True)
    text(source,391,y,320,58,23,C["muted"])
    text(sink,748,y,415,58,23)
    if i<3: rule(80,y+70,1090)
text("행복 별은 소비하는 화폐가 아니라 병아리와 마을의 성장 상태입니다.",
     81,615,1080,30,19,C["muted"])
page()

# 8
base("새 콘텐츠는 기존 마을을 다시 움직입니다", 8,
     "새 병아리 하나가 오래된 가구와 지역에도 새 쓰임을 만들어야 합니다.")
blocks=[
    ("관심사","어떤 가구·공간을 보고 찾아오는가"),
    ("첫 행동","맞이하자마자 무엇을 함께 하는가"),
    ("반복 역할","어떤 설비·아이템의 쓰임을 바꾸는가"),
    ("주민 관계","기존 병아리와 어떤 장면을 만드는가"),
]
for i,(name,description) in enumerate(blocks):
    y=199+i*98
    text(f"{i+1:02d}",79,y,72,51,31,C["green"] if i%2 else C["orange"],True)
    text(name,159,y,231,47,31,bold=True)
    text(description,445,y+3,725,45,25,C["muted"])
    if i<3: rule(159,y+70,1014)
rect(78,601,1090,3,C["orange"])
text("다음에는 누구와 무엇을 만들어 어떤 장면을 볼까?",80,612,1080,41,27,bold=True)
page()

pdf.save()
print(OUTPUT)
