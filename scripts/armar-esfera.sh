#!/usr/bin/env bash
# ============================================================================
# armar-esfera.sh
# ----------------------------------------------------------------------------
# Junta una carpeta de fotos (del dron DJI Mini 3 o del iPhone) en UNA imagen
# equirectangular 360° 2:1 lista para el visor. Usa Hugin (software libre).
#
# El dron y el iPhone entregan las tomas SUELTAS; este script las cose.
#
# Con el asistente de captura v9 son ~50 fotos por cuarto (16 por fila × 3 filas
# + techo + piso), con paso de giro chico para que haya traslape de sobra.
#
# Requiere Hugin:  winget install --id Hugin.Hugin
#
# Uso:
#   bash scripts/armar-esfera.sh <carpeta_con_fotos> [salida.webp]
#
# Ejemplos:
#   bash scripts/armar-esfera.sh assets/panoramas/_raw/lote-4
#   bash scripts/armar-esfera.sh ~/fotos/terreno proyectos/grupo/lote-4/panoramas/aerea.webp
#
# Si no das salida, escribe en  assets/panoramas/_raw/<nombre-carpeta>.webp
# ============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARPETA="${1:-}"
SALIDA="${2:-}"

if [ -z "$CARPETA" ] || [ ! -d "$CARPETA" ]; then
  echo "ERROR: pásame una carpeta con las fotos.  bash scripts/armar-esfera.sh <carpeta> [salida.webp]" >&2
  exit 1
fi

# --- Localizar las herramientas de Hugin ---------------------------------
HUGIN_BIN=""
for c in \
  "$(command -v pto_gen 2>/dev/null || true)" \
  "/c/Program Files/Hugin/bin/pto_gen.exe" \
  "/c/Program Files (x86)/Hugin/bin/pto_gen.exe" ; do
  if [ -n "$c" ] && [ -x "$c" ]; then HUGIN_BIN="$(dirname "$c")"; break; fi
done
if [ -z "$HUGIN_BIN" ]; then
  echo "ERROR: no encuentro Hugin. Instálalo con:  winget install --id Hugin.Hugin" >&2
  exit 1
fi
export PATH="$HUGIN_BIN:$PATH"
echo "Hugin: $HUGIN_BIN"

# --- Reunir las fotos ---------------------------------------------------
shopt -s nullglob nocaseglob
FOTOS=( "$CARPETA"/*.jpg "$CARPETA"/*.jpeg "$CARPETA"/*.png "$CARPETA"/*.tif "$CARPETA"/*.tiff )
shopt -u nullglob nocaseglob
if [ "${#FOTOS[@]}" -lt 4 ]; then
  echo "ERROR: encontré ${#FOTOS[@]} fotos en $CARPETA. Se necesitan al menos 4 para una esfera." >&2
  exit 1
fi
echo "Fotos: ${#FOTOS[@]}"

# --- Nombre de salida por defecto -------------------------------------
if [ -z "$SALIDA" ]; then
  base="$(basename "$CARPETA")"
  SALIDA="$RAIZ/assets/panoramas/_raw/${base}.webp"
fi
mkdir -p "$(dirname "$SALIDA")"

# --- Carpeta de trabajo temporal ------------------------------------
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT
PTO="$TRABAJO/proyecto.pto"

# Hugin necesita el angulo de vision horizontal de cada foto. Estrategia:
#   1. Si el EXIF trae distancia focal  -> dejar que pto_gen lo calcule.
#   2. Si la camara es un dron DJI (modelo "FC...") -> ~82 grados.
#   3. Si no (iPhone: el asistente saca las fotos del <canvas> sin EXIF) -> ~63 grados.
# Se puede forzar con la variable de entorno FOV_CAMARA.
#
# Nota: el 63 del iPhone es APROXIMADO. Se probo 50 vs 63 con las mismas fotos y
# la esfera salio igual: el FOV exacto no es lo que decide. Lo que salva la
# esfera es el TRASLAPE DENSO de la captura v9 (paso de giro de 22.5°); autooptimiser
# -a afina el FOV real a partir de los puntos de control de todas formas.
DETECTA='
from PIL import Image
import sys
e = Image.open(sys.argv[1]).getexif()
m = str(e.get(272, "")).upper().strip()
print("exif" if (e.get(37386) or e.get(41989)) else ("dron" if m.startswith("FC") else "iphone"))
'
lente="$(python -c "$DETECTA" "${FOTOS[0]}" 2>/dev/null || echo iphone)"

if [ -z "${FOV_CAMARA:-}" ]; then
  if [ "$lente" = "dron" ]; then FOV_CAMARA=82; else FOV_CAMARA=63; fi
fi

echo "--- 1/6  Creando el proyecto (pto_gen)  [lente: $lente]"
if [ "$lente" = "exif" ]; then
  pto_gen -o "$PTO" "${FOTOS[@]}"
else
  echo "    (sin EXIF de lente: FOV horizontal = ${FOV_CAMARA} grados)"
  pto_gen --fov="$FOV_CAMARA" -o "$PTO" "${FOTOS[@]}"
fi

echo "--- 2/6  Buscando puntos de control (cpfind --multirow)"
cpfind --multirow -o "$PTO" "$PTO"

echo "--- 3/6  Limpiando puntos de control malos (cpclean)"
cpclean -o "$PTO" "$PTO"

echo "--- 4/6  Optimizando posiciones, nivelado y exposición (autooptimiser -a)"
# El modo -a alinea posiciones y ajusta el FOV a partir de los puntos de control.
# (Liberar también la distorsión a,b,c aquí desestabiliza la solución cuando hay
#  poco traslape, así que NO se hace.)
autooptimiser -a -m -l -s -o "$PTO" "$PTO"

echo "--- 5/6  Fijando salida equirectangular 360x180 (pano_modify)"
pano_modify --canvas=AUTO --crop=AUTO --projection=2 --fov=360x180 -o "$PTO" "$PTO"

# Verificación defensiva: ¿cpfind conectó las fotos?
# Con ~50 fotos y el traslape denso de v9 deberían salir CIENTOS de puntos de
# control. Menos de 40 casi siempre significa que algo salió mal en la captura.
n_cp="$(grep -c '^c ' "$PTO" || true)"
if [ "${n_cp:-0}" -lt 40 ]; then
  echo "AVISO: solo ${n_cp} puntos de control para ${#FOTOS[@]} fotos — son muy pocos." >&2
  echo "       Causas típicas:" >&2
  echo "        · las fotos no traslapan (se giró demasiado entre foto y foto, o" >&2
  echo "          la cámara se movió de sitio en vez de girar sobre el eje)," >&2
  echo "        · el cuarto tiene paredes lisas sin textura que Hugin pueda enganchar." >&2
  echo "       La esfera va a salir con huecos o geometría rota. Conviene recapturar." >&2
fi

echo "--- 6/6  Renderizando y fusionando (nona + enblend)"
nona -m TIFF_m -o "$TRABAJO/remap" "$PTO"
enblend --compression=LZW -o "$TRABAJO/panorama.tif" "$TRABAJO"/remap*.tif

if [ ! -s "$TRABAJO/panorama.tif" ]; then
  echo "ERROR: la fusión no produjo imagen. Revisa el traslape entre fotos." >&2
  exit 1
fi

echo "--- Optimizando a WebP 2:1"
python "$RAIZ/scripts/optimizar_panoramas.py" "$TRABAJO/panorama.tif" "$SALIDA"

echo
echo "LISTO -> $SALIDA"
echo "Revísala en el visor. Si el nadir (abajo) sale negro, es normal: se puede tapar con un logo después."
