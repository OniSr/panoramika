#!/usr/bin/env python3
# ============================================================================
# tapar_polos.py
# ----------------------------------------------------------------------------
# Tapa el hueco de ABAJO (nadir) y el de ARRIBA (cenit) de una esfera
# equirectangular 2:1.
#
#   · NADIR  -> disco con la marca "Panorámika" (globo ámbar sobre fondo oscuro).
#              Es el sitio donde tradicionalmente va el logo del fotógrafo.
#   · CENIT  -> relleno liso del color promedio del techo, con degradado suave.
#              Un logo en el techo se ve raro; mejor que "desaparezca".
#
# La captura v12 del asistente son 3 filas (0°, ±30°) sin fotos de techo ni
# piso, así que TODA esfera interior nace con ~±17° de casquete vacío en cada
# polo. Este script lo cierra.
#
# Uso:
#   python scripts/tapar_polos.py <entrada> <salida> [opciones]
#
#   <entrada>  equirectangular 2:1 (.webp / .jpg / .png / .tif)
#   <salida>   dónde escribir el resultado (mismo formato por la extensión)
#
# Opciones:
#   --nadir-grados N     altura del parche de abajo, en grados de pitch (def. 24)
#   --cenit-grados  N    altura del parche de arriba (def. 20; 0 = no tapar)
#   --texto "TEXTO"      texto del disco del nadir (def. "PANORÁMIKA")
#   --sin-texto          disco solo con el glifo, sin texto
#   --pluma F            fracción del parche usada para el degradado (def. 0.35)
#
# Requiere Pillow (ya instalado en el proyecto).
# ============================================================================
import sys
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    sys.exit("ERROR: falta Pillow.  pip install Pillow")

# --- Paleta de marca (= tokens de :root en style.css) ----------------------
FONDO = (13, 15, 18)       # --sup-fondo  #0d0f12
ACENTO = (217, 154, 78)    # --acento     #d99a4e
ACENTO_CLARO = (232, 194, 122)
TX_FUERTE = (244, 246, 248)


# ==========================================================================
# 1 · Disco de marca para el NADIR
# --------------------------------------------------------------------------
# Se dibuja en un lienzo cuadrado; luego se "envuelve" en la esfera (paso 3).
# El centro del disco cae en el polo sur; el borde, a `nadir_grados` del polo.
# ==========================================================================
def _fuente(px):
    """Primera fuente del sistema que Pillow logre cargar, al tamaño pedido."""
    for nombre in ("segoeui.ttf", "Arial.ttf", "arial.ttf",
                   "DejaVuSans.ttf", "Helvetica.ttf"):
        try:
            return ImageFont.truetype(nombre, px)
        except Exception:
            continue
    return ImageFont.load_default()


def disco_marca(lado, texto):
    """Devuelve una imagen RGBA cuadrada (lado x lado) con la marca centrada,
    fondo transparente fuera del círculo."""
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = lado / 2
    r = lado * 0.46                     # radio del disco

    # Disco de fondo (un pelín translúcido para que no sea un tapón muerto).
    d.ellipse([c - r, c - r, c + r, c + r], fill=FONDO + (255,))

    # --- Glifo: globo (círculo + elipse + meridiano), como el favicon -------
    g = r * 0.42                        # radio del globo
    gy = c - r * 0.18                   # el globo va un poco arriba del centro
    lw = max(2, int(lado * 0.010))
    d.ellipse([c - g, gy - g, c + g, gy + g], outline=ACENTO + (255,), width=lw)
    d.ellipse([c - g * 0.42, gy - g, c + g * 0.42, gy + g],
              outline=ACENTO + (180,), width=max(1, lw - 1))
    d.line([c - g, gy, c + g, gy], fill=ACENTO + (180,), width=max(1, lw - 1))
    d.ellipse([c - g * 0.13, gy - g * 0.13, c + g * 0.13, gy + g * 0.13],
              fill=ACENTO + (255,))

    # --- Texto bajo el glifo ----------------------------------------------
    if texto:
        f = _fuente(int(r * 0.24))
        tb = d.textbbox((0, 0), texto, font=f)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        d.text((c - tw / 2 - tb[0], gy + g + r * 0.16 - tb[1]),
               texto, font=f, fill=TX_FUERTE + (255,))

    # Aro fino en el borde del disco, para separarlo de la foto.
    d.ellipse([c - r, c - r, c + r, c + r],
              outline=ACENTO + (90,), width=max(1, lw - 1))
    return img


# ==========================================================================
# 2 · Color de relleno para el CENIT
# ==========================================================================
def color_borde_cenit(equi, filas):
    """Promedio de las primeras `filas` de la equirectangular (el techo)."""
    tira = equi.crop((0, 0, equi.width, max(1, filas))).convert("RGB")
    chico = tira.resize((1, 1), Image.BOX)
    return chico.getpixel((0, 0))


# ==========================================================================
# 3 · Envolver un parche polar en la esfera
# --------------------------------------------------------------------------
# Para cada pixel de la banda polar de la equirectangular:
#   fila  -> pitch  -> radio dentro del disco (0 en el polo, 1 en el borde)
#   col   -> yaw    -> ángulo alrededor del disco
# Se muestrea el disco en esa coordenada polar y se mezcla con la foto usando
# una "pluma" (alfa que decae hacia el borde) para que no se vea un corte.
# ==========================================================================
def envolver_polo(equi, parche_rgba, grados, pluma, arriba):
    W, H = equi.size
    banda_px = int(round(H * grados / 180.0))
    if banda_px < 2:
        return equi

    equi = equi.convert("RGB")
    px_equi = equi.load()
    P = parche_rgba
    pw, ph = P.size
    px_par = P.load()
    rmax = min(pw, ph) / 2.0

    for j in range(banda_px):
        # j = 0 es SIEMPRE la fila del polo (abajo del todo para el nadir,
        # arriba del todo para el cenit). frac va de 0 en el polo a 1 en el
        # borde de la banda.
        frac = (j + 0.5) / banda_px
        fila = j if arriba else (H - 1 - j)

        # Radio dentro del disco: 0 = centro (cae en el polo), 1 = borde.
        radio = frac

        # Alfa de mezcla: opaco cerca del polo, se desvanece en la "pluma"
        # (el anillo exterior de la banda) para fundirse con la foto.
        if frac > 1.0 - pluma:
            alfa_fila = max(0.0, (1.0 - frac) / pluma)
        else:
            alfa_fila = 1.0
        if alfa_fila <= 0:
            continue

        rr = radio * rmax
        for i in range(W):
            yaw = (i / W) * 2.0 * math.pi
            dx = math.sin(yaw) * rr
            dy = math.cos(yaw) * rr          # +cos: yaw 0 hacia "abajo" del disco
            if arriba:
                dy = -dy
            sx = int(pw / 2 + dx)
            sy = int(ph / 2 + dy)
            if sx < 0 or sx >= pw or sy < 0 or sy >= ph:
                continue
            pr, pg, pb, pa = px_par[sx, sy]
            if pa == 0:
                continue
            a = (pa / 255.0) * alfa_fila
            if a <= 0:
                continue
            orr, org, orb = px_equi[i, fila]
            px_equi[i, fila] = (
                int(orr * (1 - a) + pr * a),
                int(org * (1 - a) + pg * a),
                int(orb * (1 - a) + pb * a),
            )
    return equi


def rellenar_polo_color(equi, color, grados, pluma, arriba):
    """Como envolver_polo pero con un color liso (para el cenit)."""
    W, H = equi.size
    banda_px = int(round(H * grados / 180.0))
    if banda_px < 2:
        return equi
    equi = equi.convert("RGB")
    px = equi.load()
    cr, cg, cb = color
    for j in range(banda_px):
        # j = 0 en el polo; frac = 0 en el polo, 1 en el borde de la banda.
        frac = (j + 0.5) / banda_px
        alfa = 1.0 if frac <= 1.0 - pluma else max(0.0, (1.0 - frac) / pluma)
        fila = j if arriba else (H - 1 - j)
        for i in range(W):
            orr, org, orb = px[i, fila]
            px[i, fila] = (
                int(orr * (1 - alfa) + cr * alfa),
                int(org * (1 - alfa) + cg * alfa),
                int(orb * (1 - alfa) + cb * alfa),
            )
    return equi


# ==========================================================================
# CLI
# ==========================================================================
def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__ if __doc__ else "uso: tapar_polos.py <entrada> <salida> [opciones]")

    entrada = Path(argv[0])
    salida = Path(argv[1])
    nadir_grados = 24.0
    cenit_grados = 20.0
    texto = "PANORÁMIKA"
    pluma = 0.35

    it = iter(argv[2:])
    for a in it:
        if a == "--nadir-grados":
            nadir_grados = float(next(it))
        elif a == "--cenit-grados":
            cenit_grados = float(next(it))
        elif a == "--texto":
            texto = next(it)
        elif a == "--sin-texto":
            texto = ""
        elif a == "--pluma":
            pluma = float(next(it))
        else:
            sys.exit(f"opción desconocida: {a}")

    if not entrada.is_file():
        sys.exit(f"ERROR: no existe {entrada}")

    equi = Image.open(entrada)
    W, H = equi.size
    if abs(W / H - 2.0) > 0.02:
        print(f"AVISO: la imagen es {W}x{H}, no es 2:1 exacto. Sigo igual.")

    print(f"Entrada: {W}x{H}")

    # --- NADIR: disco de marca -------------------------------------------
    if nadir_grados > 0:
        lado = int(H * nadir_grados / 180.0) * 2 + 2
        disco = disco_marca(lado, texto)
        equi = envolver_polo(equi, disco, nadir_grados, pluma, arriba=False)
        print(f"Nadir tapado: disco de marca, {nadir_grados:g}° de pitch"
              + (f', texto "{texto}"' if texto else ", sin texto"))

    # --- CENIT: relleno de color ---------------------------------------
    if cenit_grados > 0:
        col = color_borde_cenit(equi, max(2, int(H * 0.02)))
        equi = rellenar_polo_color(equi, col, cenit_grados, pluma, arriba=True)
        print(f"Cenit tapado: relleno liso RGB{col}, {cenit_grados:g}° de pitch")

    # Un desenfoque muy leve en las dos bandas polares suaviza el aliasing del
    # muestreo polar sin tocar el resto de la esfera.
    equi = _suavizar_bandas(equi, nadir_grados, cenit_grados)

    salida.parent.mkdir(parents=True, exist_ok=True)
    params = {}
    if salida.suffix.lower() == ".webp":
        params = dict(quality=90, method=6)
    equi.save(salida, **params)
    print(f"LISTO -> {salida}")


def _suavizar_bandas(equi, nadir_grados, cenit_grados):
    W, H = equi.size
    if nadir_grados > 0:
        b = int(round(H * nadir_grados / 180.0))
        caja = (0, H - b, W, H)
        reg = equi.crop(caja).filter(ImageFilter.GaussianBlur(0.6))
        equi.paste(reg, caja)
    if cenit_grados > 0:
        b = int(round(H * cenit_grados / 180.0))
        caja = (0, 0, W, b)
        reg = equi.crop(caja).filter(ImageFilter.GaussianBlur(0.6))
        equi.paste(reg, caja)
    return equi


if __name__ == "__main__":
    main(sys.argv[1:])
