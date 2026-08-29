#!/usr/bin/env bash
# ============================================================================
# armar-esfera.sh
# ----------------------------------------------------------------------------
# Junta una carpeta de fotos (del dron DJI Mini 3 o del iPhone) en UNA imagen
# equirectangular 360° 2:1 lista para el visor. Usa Hugin (software libre).
#
# El dron y el iPhone entregan las tomas SUELTAS; este script las cose.
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

# ¿Las fotos traen distancia focal en el EXIF? Las del asistente de captura NO
# (el canvas la borra), así que hay que decirle a Hugin el ángulo de visión.
# iPhone (cámara principal, video) ≈ 63° horizontal en vertical. El dron sí trae
# EXIF: entonces dejamos que Hugin lo calcule (FOV_CAMARA vacío).
FOV_CAMARA="${FOV_CAMARA-63}"
tiene_focal="$(python -c "from PIL import Image; e=Image.open(r'${FOTOS[0]}').getexif(); print(1 if e.get(37386) else 0)" 2>/dev/null || echo 0)"

echo "--- 1/6  Creando el proyecto (pto_gen)"
if [ "$tiene_focal" = "1" ] || [ -z "$FOV_CAMARA" ]; then
  pto_gen -o "$PTO" "${FOTOS[@]}"
else
  echo "    (sin EXIF de lente → usando FOV horizontal = ${FOV_CAMARA}°)"
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
n_cp="$(grep -c '^c ' "$PTO" || true)"
if [ "${n_cp:-0}" -lt 8 ]; then
  echo "AVISO: solo ${n_cp} puntos de control. Las fotos quizá no tienen suficiente" >&2
  echo "       traslape o la escena tiene poca textura. La esfera puede salir mal." >&2
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
