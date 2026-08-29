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
#   python scripts/optimizar_panoramas.py                       # lote -> assets/panoramas/
#   python scripts/optimizar_panoramas.py proyectos/x/panoramas # lote -> esa carpeta
#   python scripts/optimizar_panoramas.py entrada.tif salida.webp   # un solo archivo
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


def optimizar(ruta_entrada, ruta_salida):
    with Image.open(ruta_entrada) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")  # respeta orientación EXIF
        img = a_proporcion_2_1(img)
        if img.width > ANCHO_MAX:
            img = img.resize((ANCHO_MAX, ANCHO_MAX // 2), Image.LANCZOS)
        os.makedirs(os.path.dirname(os.path.abspath(ruta_salida)), exist_ok=True)
        img.save(ruta_salida, "WEBP", quality=CALIDAD, method=6)
        w, h = img.size

    antes = os.path.getsize(ruta_entrada) // 1024
    despues = os.path.getsize(ruta_salida) // 1024
    print(f"  {os.path.basename(ruta_entrada)} -> {os.path.basename(ruta_salida)}  "
          f"{antes} KB -> {despues} KB  ({w}x{h})")


def main():
    args = sys.argv[1:]

    # Modo "un solo archivo":  optimizar_panoramas.py entrada.ext salida.webp
    if len(args) == 2 and os.path.isfile(args[0]):
        optimizar(args[0], args[1])
        print("Listo.")
        return

    # Modo lote: procesa assets/panoramas/_raw/ -> carpeta destino
    destino = args[0] if args else os.path.join(RAIZ, "assets", "panoramas")
    if not os.path.isdir(ORIGEN):
        sys.exit(f"ERROR: no existe {ORIGEN}")
    os.makedirs(destino, exist_ok=True)

    # Dedup por ruta real: en Windows el sistema de archivos no distingue
    # mayúsculas y *.jpg / *.JPG devolverían el mismo archivo dos veces.
    exts = (".jpg", ".jpeg", ".png", ".tif", ".tiff")
    vistos, archivos = set(), []
    for f in sorted(glob.glob(os.path.join(ORIGEN, "*"))):
        clave = os.path.normcase(os.path.abspath(f))
        if f.lower().endswith(exts) and clave not in vistos:
            vistos.add(clave)
            archivos.append(f)
    if not archivos:
        print(f"No hay imágenes en {ORIGEN}. Copia ahí los originales del dron.")
        return

    print(f"Optimizando {len(archivos)} imagen(es) -> {destino}")
    for f in archivos:
        nombre = os.path.splitext(os.path.basename(f))[0]
        optimizar(f, os.path.join(destino, nombre + ".webp"))
    print("Listo. Añade las tomas al proyecto (ver skill add-panorama).")


if __name__ == "__main__":
    main()
