#!/usr/bin/env python3
# ============================================================================
# optimizar_panoramas.py
# ----------------------------------------------------------------------------
# Convierte los originales pesados del dron (assets/panoramas/_raw/) en .webp
# ligeros y en proporción EXACTA 2:1, listos para Pannellum.
#
# NUNCA toca el original: solo lee _raw/ y escribe la copia optimizada.
#
# Requiere Pillow:  python -m pip install Pillow
# (Alternativa sin Python: scripts/optimizar-panoramas.sh, que usa cwebp.)
#
# Uso:
#   python scripts/optimizar_panoramas.py                 # -> assets/panoramas/
#   python scripts/optimizar_panoramas.py proyectos/xalapa-demo/panoramas
#   CALIDAD=85 ANCHO_MAX=6000 python scripts/optimizar_panoramas.py <destino>
# ============================================================================
import os
import sys
import glob

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("ERROR: falta Pillow. Instálalo con:  python -m pip install Pillow")

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, "assets", "panoramas", "_raw")
DESTINO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "assets", "panoramas")

CALIDAD = int(os.environ.get("CALIDAD", "82"))      # 0-100; 80-85 es el punto dulce
ANCHO_MAX = int(os.environ.get("ANCHO_MAX", "5760"))  # ancho máximo de salida
COLOR_RELLENO = (13, 15, 18)                          # #0d0f12, el fondo de la UI


def a_proporcion_2_1(img):
    """Ajusta la imagen a proporción 2:1 exacta SIN deformarla: rellena el lado
    corto con una banda del color de la interfaz (una equirectangular real casi
    siempre tiene cielo o nadir vacío en esos bordes, así que no se nota)."""
    w, h = img.size
    objetivo = w / 2  # altura que debería tener para ser 2:1
    if abs(h - objetivo) < 2:
        return img
    if h < objetivo:                       # demasiado ancha -> añade alto
        lienzo = Image.new("RGB", (w, round(objetivo)), COLOR_RELLENO)
        lienzo.paste(img, (0, (round(objetivo) - h) // 2))
        return lienzo
    nuevo_ancho = h * 2                    # demasiado alta -> añade ancho
    lienzo = Image.new("RGB", (nuevo_ancho, h), COLOR_RELLENO)
    lienzo.paste(img, ((nuevo_ancho - w) // 2, 0))
    return lienzo


def optimizar(ruta_entrada, carpeta_salida):
    nombre = os.path.splitext(os.path.basename(ruta_entrada))[0]
    ruta_salida = os.path.join(carpeta_salida, nombre + ".webp")

    with Image.open(ruta_entrada) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")  # respeta orientación EXIF
        img = a_proporcion_2_1(img)
        if img.width > ANCHO_MAX:
            img = img.resize((ANCHO_MAX, ANCHO_MAX // 2), Image.LANCZOS)
        img.save(ruta_salida, "WEBP", quality=CALIDAD, method=6)

    antes = os.path.getsize(ruta_entrada) // 1024
    despues = os.path.getsize(ruta_salida) // 1024
    print(f"  {os.path.basename(ruta_entrada)}  {antes} KB -> {despues} KB  "
          f"({Image.open(ruta_salida).size[0]}x{Image.open(ruta_salida).size[1]})")


def main():
    if not os.path.isdir(ORIGEN):
        sys.exit(f"ERROR: no existe {ORIGEN}")
    os.makedirs(DESTINO, exist_ok=True)

    # Dedup por ruta real: en Windows el sistema de archivos no distingue
    # mayúsculas y *.jpg / *.JPG devolverían el mismo archivo dos veces.
    exts = (".jpg", ".jpeg", ".png")
    vistos, archivos = set(), []
    for f in sorted(glob.glob(os.path.join(ORIGEN, "*"))):
        clave = os.path.normcase(os.path.abspath(f))
        if f.lower().endswith(exts) and clave not in vistos:
            vistos.add(clave)
            archivos.append(f)
    if not archivos:
        print(f"No hay imágenes en {ORIGEN}. Copia ahí los originales del dron.")
        return

    print(f"Optimizando {len(archivos)} imagen(es) -> {DESTINO}")
    for f in archivos:
        optimizar(f, DESTINO)
    print("Listo. Añade las tomas al proyecto (ver skill add-panorama).")


if __name__ == "__main__":
    main()
