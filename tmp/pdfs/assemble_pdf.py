from pathlib import Path

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

root = Path(r"C:\Users\Soyoon Bang\Desktop\ChickProto")
slides = root / "tmp" / "pdfs"
output = root / "output" / "pdf" / "삐약마을_핵심시스템_성장구조.pdf"
images = sorted(slides.glob("slide-??.png"))
if len(images) != 8:
    raise RuntimeError(f"Expected 8 rendered slides, found {len(images)}")

page_width, page_height = 960, 540
pdf = canvas.Canvas(str(output), pagesize=(page_width, page_height), pageCompression=1)
pdf.setTitle("삐약마을 핵심 시스템과 성장 구조")
pdf.setAuthor("삐약마을 기획")
for image_path in images:
    with Image.open(image_path) as image:
        if image.size != (1920, 1080):
            raise RuntimeError(f"Unexpected slide size: {image_path.name} {image.size}")
        pdf.drawImage(ImageReader(image.convert("RGB")), 0, 0, width=page_width, height=page_height)
    pdf.showPage()
pdf.save()
print(output)
