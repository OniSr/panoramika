#!/usr/bin/env python3
# ============================================================================
# generar_og.py
# ----------------------------------------------------------------------------
# Genera assets/og-imagen.jpg (1200x630): la miniatura que WhatsApp / Facebook
# muestran al compartir el enlace del recorrido. Toma una panorámica como fondo,
# la oscurece y le pone el nombre del proyecto.
#
# Uso:
#   python scripts/generar_og.py <imagen_fondo> "<titulo>" "<subtitulo>"
#   python scripts/generar_og.py proyectos/xalapa-demo/panoramas/aerea-xalapa.webp \
#          "Recorrido 360°" "Xalapa, Veracruz"
# ============================================================================
import sys
import os

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
except ImportError:
    sys.exit("ERROR: falta Pillow.  python -m pip install Pillow")

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
ACENTO = (217, 154, 78)

fondo_src = sys.argv[1] if len(sys.argv) > 1 else \
    os.path.join(RAIZ, "proyectos", "xalapa-demo", "panoramas", "aerea-xalapa.webp")
titulo = sys.argv[2] if len(sys.argv) > 2 else "Recorrido virtual 360°"
subtitulo = sys.argv[3] if len(sys.argv) > 3 else "Domo 360 · Xalapa"
salida = os.path.join(RAIZ, "assets", "og-imagen.jpg")


def fuente(px, negrita=False):
    """Intenta una fuente del sistema; si no hay, usa la de Pillow (más pequeña)."""
    candidatas = (
        ["segoeuib.ttf", "arialbd.ttf"] if negrita else ["segoeui.ttf", "arial.ttf"]
    )
    for nombre in candidatas:
        try:
            return ImageFont.truetype(nombre, px)
        except OSError:
            continue
    return ImageFont.load_default()


with Image.open(fondo_src) as img:
    img = img.convert("RGB")
    # Recorte central a 1200x630 manteniendo proporción
    escala = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * escala), round(img.height * escala)), Image.LANCZOS)
    izq = (img.width - W) // 2
    arr = (img.height - H) // 2
    lienzo = img.crop((izq, arr, izq + W, arr + H))

lienzo = ImageEnhance.Brightness(lienzo).enhance(0.55)
lienzo = lienzo.filter(ImageFilter.GaussianBlur(1.5))

# Degradado inferior para que el texto se lea
grad = Image.new("L", (1, H), 0)
for y in range(H):
    grad.putpixel((0, y), int(200 * (y / H) ** 2))
grad = grad.resize((W, H))
negro = Image.new("RGB", (W, H), (8, 9, 11))
lienzo = Image.composite(negro, lienzo, grad)

d = ImageDraw.Draw(lienzo)
d.rectangle([64, 92, 110, 100], fill=ACENTO)          # barrita de acento
d.text((64, 118), subtitulo.upper(), font=fuente(30, True), fill=ACENTO)
d.text((64, 300), titulo, font=fuente(78, True), fill=(244, 246, 248))
d.text((64, H - 96), "Arrastra para mirar en todas direcciones · Captura con dron DJI",
       font=fuente(26), fill=(185, 192, 200))

os.makedirs(os.path.dirname(salida), exist_ok=True)
lienzo.save(salida, "JPEG", quality=86, optimize=True)
print(f"OK -> {salida}  ({os.path.getsize(salida)//1024} KB)")
