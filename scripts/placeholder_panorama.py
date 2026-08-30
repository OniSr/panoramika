#!/usr/bin/env python3
# ============================================================================
# placeholder_panorama.py
# ----------------------------------------------------------------------------
# Genera una panorámica 2:1 de relleno ("foto pendiente") para poder armar el
# flujo de un recorrido antes de tener las tomas reales. Se ve como una escena
# 360 con un cartel al centro.
#
#   python scripts/placeholder_panorama.py <salida.webp> "<Título>" ["<Subtítulo>"]
# ============================================================================
import sys, os
from PIL import Image, ImageDraw, ImageFont

W, H = 4096, 2048
FONDO = (16, 18, 22)
LINEA = (44, 49, 58)
ACENTO = (217, 154, 78)
TX = (200, 206, 214)

salida = sys.argv[1] if len(sys.argv) > 1 else "placeholder.webp"
titulo = sys.argv[2] if len(sys.argv) > 2 else "Toma pendiente"
sub = sys.argv[3] if len(sys.argv) > 3 else "Se reemplaza por la foto 360 real"

img = Image.new("RGB", (W, H), FONDO)
d = ImageDraw.Draw(img)

# Rejilla tipo esfera: meridianos y paralelos
for x in range(0, W + 1, W // 24):
    d.line([(x, 0), (x, H)], fill=LINEA, width=2)
for y in range(0, H + 1, H // 12):
    d.line([(0, y), (W, y)], fill=LINEA, width=2)
d.line([(0, H // 2), (W, H // 2)], fill=(70, 78, 90), width=4)  # horizonte


def fuente(px, bold=False):
    for n in (["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(n, px)
        except OSError:
            continue
    return ImageFont.load_default()


def centrado(texto, y, f, color):
    w = d.textlength(texto, font=f)
    d.text(((W - w) / 2, y), texto, font=f, fill=color)


d.rectangle([W // 2 - 60, H // 2 - 190, W // 2 + 60, H // 2 - 176], fill=ACENTO)
centrado("PANORÁMIKA", H // 2 - 150, fuente(34, True), ACENTO)
centrado(titulo, H // 2 - 90, fuente(96, True), (244, 246, 248))
centrado(sub, H // 2 + 40, fuente(40), TX)

os.makedirs(os.path.dirname(os.path.abspath(salida)), exist_ok=True)
img.save(salida, "WEBP", quality=80, method=6)
print(f"OK -> {salida}  ({os.path.getsize(salida)//1024} KB)")
