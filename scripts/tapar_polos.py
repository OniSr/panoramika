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


def _texto_en_arco(img, texto, cx, cy, radio, px_fuente, color):
    """Escribe `texto` curvado sobre una circunferencia (radio `radio`, centro
    cx,cy), centrado abajo y siguiendo la forma del disco. Cada letra se rota
    para quedar tangente al arco. Así, al envolver el disco en la esfera
    (paso 3), el texto sigue el círculo del piso en vez de estirarse recto.

    El disco se envuelve con yaw=0 hacia ABAJO de esta imagen (+y), así que el
    centro del texto va en ángulo 90° (abajo) → queda al frente del piso."""
    if not texto:
        return
    f = _fuente(px_fuente)
    # Ancho angular de cada letra ≈ ancho en px / radio.
    anchos = []
    for ch in texto:
        b = f.getbbox(ch)
        anchos.append(max(px_fuente * 0.28, b[2] - b[0]))
    sep = px_fuente * 0.28                       # aire entre letras
    total = sum(anchos) + sep * (len(texto) - 1)
    ang_total = total / radio                    # radianes que ocupa la palabra
    # El texto se coloca en el arco de ARRIBA del disco. Al envolver el nadir,
    # el "arriba" del disco cae en el CENTRO de la equirectangular (yaw 180°),
    # una zona contigua — si se pone abajo cae justo en la costura (yaw 0°/360°)
    # y la palabra se parte y se espeja. El disco además se ve "desde atrás" al
    # mirar el piso desde dentro de la esfera, así que se recorre de DERECHA a
    # IZQUIERDA y cada letra se voltea en horizontal.
    ang_centro = -math.pi / 2                     # arriba del disco
    ang = ang_centro - ang_total / 2
    for ch, w in zip(texto, anchos):
        paso = (w / 2) / radio
        ang += paso
        x = cx + radio * math.cos(ang)
        y = cy + radio * math.sin(ang)
        cajon = int(px_fuente * 1.8)
        letra = Image.new("RGBA", (cajon, cajon), (0, 0, 0, 0))
        ld = ImageDraw.Draw(letra)
        lb = ld.textbbox((0, 0), ch, font=f)
        ld.text(((cajon - (lb[2] - lb[0])) / 2 - lb[0],
                 (cajon - (lb[3] - lb[1])) / 2 - lb[1]), ch, font=f, fill=color + (255,))
        letra = letra.transpose(Image.FLIP_LEFT_RIGHT)   # se lee "desde atrás"
        giro = -(math.degrees(ang) + 90.0)               # tangente al arco de arriba
        letra = letra.rotate(giro, resample=Image.BICUBIC, expand=True)
        img.alpha_composite(letra, (int(x - letra.width / 2), int(y - letra.height / 2)))
        ang += paso + sep / radio


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
    g = r * (0.40 if texto else 0.46)  # más grande si no hay texto
    gy = c + (r * 0.10 if texto else 0.0)
    lw = max(2, int(lado * 0.011))
    d.ellipse([c - g, gy - g, c + g, gy + g], outline=ACENTO + (255,), width=lw)
    d.ellipse([c - g * 0.42, gy - g, c + g * 0.42, gy + g],
              outline=ACENTO + (180,), width=max(1, lw - 1))
    d.line([c - g, gy, c + g, gy], fill=ACENTO + (180,), width=max(1, lw - 1))
    d.ellipse([c - g * 0.13, gy - g * 0.13, c + g * 0.13, gy + g * 0.13],
              fill=ACENTO + (255,))

    # --- Texto CURVADO siguiendo el borde del disco ----------------------
    _texto_en_arco(img, texto, c, c, r * 0.78, int(r * 0.20), TX_FUERTE)

    # Aro fino en el borde del disco, para separarlo de la foto.
    d.ellipse([c - r, c - r, c + r, c + r],
              outline=ACENTO + (110,), width=max(1, lw - 1))
    return img


# ==========================================================================
# 2 · Color de relleno para el CENIT
# ==========================================================================
def color_borde_cenit(equi, grados_relleno):
    """Color del techo REAL, muestreado en una franja por debajo de la zona que
    vamos a rellenar. Ojo: en un cosido de cuarto, esa franja suele traer
    manchas OSCURAS (sombras de las costuras infladas del techo). Un promedio
    simple sale gris-parduzco. Como el techo casi siempre es lo más CLARO que
    hay arriba, promediamos solo el tercio más brillante de la franja."""
    H = equi.height
    y0 = int(H * grados_relleno / 180.0)              # fin de la zona de relleno
    y1 = min(H, y0 + max(6, int(H * 0.10)))           # franja ancha de techo real
    tira = equi.crop((0, max(0, y0), equi.width, y1)).convert("RGB")
    px = list(tira.getdata())
    px.sort(key=lambda c: c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114)  # por luma
    claros = px[int(len(px) * 0.66):]                 # tercio más brillante
    n = len(claros) or 1
    return tuple(sum(c[k] for c in claros) // n for k in range(3))


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
    # Por defecto SIN texto: solo el glifo (se lee limpio en el visor). El texto
    # curvado (`--texto "..."`) todavía sale espejado por la proyección polar
    # del nadir — pendiente de afinar mirándolo en el visor. Ver _texto_en_arco.
    texto = ""
    pluma = 0.35
    cenit_color = None   # None = detectar del techo; "R,G,B" = forzar

    it = iter(argv[2:])
    for a in it:
        if a == "--nadir-grados":
            nadir_grados = float(next(it))
        elif a == "--cenit-grados":
            cenit_grados = float(next(it))
        elif a == "--cenit-color":
            cenit_color = tuple(int(x) for x in next(it).split(","))
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
        col = cenit_color if cenit_color else color_borde_cenit(equi, cenit_grados)
        equi = rellenar_polo_color(equi, col, cenit_grados, pluma, arriba=True)
        print(f"Cenit tapado: relleno liso RGB{col}, {cenit_grados:g}° de pitch"
              + (" (forzado)" if cenit_color else ""))

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
