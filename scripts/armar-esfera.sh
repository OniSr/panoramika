#!/usr/bin/env bash
# ============================================================================
# armar-esfera.sh
# ----------------------------------------------------------------------------
# Junta una carpeta de fotos (del dron DJI Mini 3 o del iPhone) en UNA imagen
# equirectangular 360° 2:1 lista para el visor. Usa Hugin (software libre).
#
# El dron y el iPhone entregan las tomas SUELTAS; este script las cose.
#
# Con el asistente de captura v12 son ~36 fotos por cuarto (12 por fila × 3 filas
# a 0° y ±30°), con paso de giro chico (30°) para que haya traslape de sobra.
# El TECHO y el PISO no se capturan: los cascos de arriba y abajo quedan vacíos
# A PROPÓSITO y se tapan luego con el logo. No es un error del armado.
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
# esfera es el TRASLAPE DENSO de la captura (paso de giro chico) + el sembrado
# de posiciones del "patrón asistente" (ver más abajo).
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

# ===========================================================================
# ¿Es el patrón del asistente de captura?  (modo "sembrado" vs modo "ciego")
# ---------------------------------------------------------------------------
# El asistente `capturar/` v12 SIEMPRE entrega 36 fotos en un orden conocido
# (las fotos ordenadas por nombre = el orden de captura):
#   fotos  1..12 (idx  0..11) -> fila "horizonte", pitch   0°, giro +30°/foto
#                                 -> yaw = idx * 30
#   fotos 13..24 (idx 12..23) -> fila "arriba",    pitch +30°, mismo giro
#                                 -> yaw = (idx - 12) * 30
#   fotos 25..36 (idx 24..35) -> fila "abajo",     pitch -30°, mismo giro
#                                 -> yaw = (idx - 24) * 30
#   (parámetros = capturar/captura.js PASO 1: PASO_YAW, FILAS[*].pitch/disparos)
#   v12 NO tiene foto de techo ni de piso.
#
# Si reconocemos ese patrón SEMBRAMOS esas posiciones (yaw/pitch/roll) en el
# .pto ANTES de buscar puntos de control, en vez de que cpfind las adivine.
# Corrige el fallo visto en pruebas reales de interior: sin sembrar,
# `autooptimiser -a` auto-nivela adivinando y rola la esfera entera ~90° en
# cuartos chicos sin horizonte claro.
#
# El modo CIEGO (dron, fotos con EXIF, o cualquier cosa que no sean 36 fotos
# de canvas) se queda EXACTAMENTE igual que antes: el aéreo del dron cose
# perfecto así y no se toca.
#
# Forzar a mano con la variable de entorno PATRON:
#   PATRON=ciego      -> modo viejo aunque haya 36 fotos
#   PATRON=asistente  -> sembrado aunque no haya exactamente 36
#   (PATRON=v11 y PATRON=v12 son alias de "asistente")
# ===========================================================================
PATRON_AST=0
case "${PATRON:-}" in
  ciego)               PATRON_AST=0 ;;
  asistente|v11|v12)   PATRON_AST=1 ;;
  *)
    # Autodetección: 36 fotos + sin EXIF de lente (= salieron del <canvas>).
    if [ "${#FOTOS[@]}" -eq 36 ] && [ "$lente" != "dron" ] && [ "$lente" != "exif" ]; then
      PATRON_AST=1
    fi
    ;;
esac

# Parámetros del patrón — DEBEN coincidir con capturar/captura.js PASO 1.
AST_PASO_YAW=30           # PASO_YAW
AST_PITCH_HORIZONTE=0     # FILAS[0].pitch
AST_PITCH_ARRIBA=30       # FILAS[1].pitch
AST_PITCH_ABAJO=-30       # FILAS[2].pitch
AST_POR_FILA=12           # FILAS[*].disparos

if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- Patrón del asistente detectado: siembro las posiciones de las ${#FOTOS[@]} fotos"
  echo "    (12 horizonte a ${AST_PITCH_HORIZONTE}° · 12 arriba a +${AST_PITCH_ARRIBA}° · 12 abajo a ${AST_PITCH_ABAJO}° · paso ${AST_PASO_YAW}°)"
else
  echo "--- Modo ciego: cpfind adivina las posiciones (dron / EXIF / captura no estándar)"
fi

echo "--- 1/6  Creando el proyecto (pto_gen)  [lente: $lente]"
if [ "$lente" = "exif" ]; then
  pto_gen -o "$PTO" "${FOTOS[@]}"
else
  echo "    (sin EXIF de lente: FOV horizontal = ${FOV_CAMARA} grados)"
  pto_gen --fov="$FOV_CAMARA" -o "$PTO" "${FOTOS[@]}"
fi

# --- 1b/6  (solo patrón asistente) Sembrar yaw/pitch/roll de cada foto ----
# Generamos la cadena "y0=..,p0=..,r0=0,y1=.." con Python (más legible que
# armarla en shell) y la aplicamos con `pto_var --set`. El bucle es tolerante
# a que sobren o falten fotos: se reparten en 3 tercios (horizonte / arriba /
# abajo). Así, si Daniel toma 35 o 37, no se rompe.
if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- 1b/6  Sembrando posiciones de las fotos (pto_var --set)"
  SEMBRADO="$(python - "${#FOTOS[@]}" <<'PY'
import sys
n = int(sys.argv[1])
PASO, P_HORIZONTE, P_ARRIBA, P_ABAJO = 30, 0, 30, -30
por_fila = max(1, round(n / 3))    # ~12; se adapta si el conteo no es 36 exacto
partes = []
for i in range(n):
    if i < por_fila:                       # fila horizonte
        yaw, pitch = (i * PASO) % 360, P_HORIZONTE
    elif i < 2 * por_fila:                 # fila arriba
        yaw, pitch = ((i - por_fila) * PASO) % 360, P_ARRIBA
    else:                                  # fila abajo (y cualquier foto de más)
        yaw, pitch = ((i - 2 * por_fila) * PASO) % 360, P_ABAJO
    partes.append("y{0}={1:g},p{0}={2:g},r{0}=0".format(i, yaw, pitch))
print(",".join(partes))
PY
)"
  pto_var --set "$SEMBRADO" -o "$PTO" "$PTO"
fi

echo "--- 2/6  Buscando puntos de control (cpfind)"
if [ "$PATRON_AST" -eq 1 ]; then
  # --prealigned: cpfind solo compara los pares de fotos que el sembrado dice
  # que se traslapan. Más rápido y con muchos menos emparejamientos falsos que
  # --multirow (que compara a ciegas y en un cuarto repetitivo se confunde).
  cpfind --prealigned -o "$PTO" "$PTO"
else
  cpfind --multirow -o "$PTO" "$PTO"
fi

echo "--- 3/6  Limpiando puntos de control malos (cpclean)"
cpclean -o "$PTO" "$PTO"

if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- 4/6  Ajuste fino de posiciones + exposición (asistente: solo yaw/pitch/roll)"
  # Las posiciones YA vienen sembradas (paso 1b) y son razonables. Optimizamos
  # SOLO la orientación (yaw, pitch, roll) de cada foto, MENOS la foto 0 (anclada
  # como referencia, para que el conjunto no gire en bloque).
  #
  # NO se optimiza el FOV (`v`) ni la distorsión (`b`,`c`), y NO se usa
  # `autooptimiser -a`: en pruebas reales, en cuanto se libera el FOV el
  # optimizador encuentra una solución degenerada (FOV enorme) y la esfera sale
  # como una tira delgada (RMS ~70-85, lienzo de 16000 px). Con solo y,p,r el
  # resultado es estable y predecible (RMS ~16).
  #   -n = optimiza solo las variables marcadas por pto_var --opt
  #   -m = iguala la exposición   ·   -s = elige el tamaño de lienzo
  # El error residual (~16) es sobre todo paralaje de captura a mano/tripié en un
  # cuarto chico; se reduce en la captura (girar sobre el eje), no aquí.
  # Una foto sin puntos de control (una pared muy lisa) no se puede mover → se
  # queda en su posición sembrada. Es lo que queremos.
  pto_var --opt "y,p,r,!y0,!p0,!r0" -o "$PTO" "$PTO"
  autooptimiser -n -m -s -o "$PTO" "$PTO"
else
  echo "--- 4/6  Optimizando posiciones, nivelado y exposición (autooptimiser -a)"
  # El modo -a alinea posiciones y ajusta el FOV a partir de los puntos de control.
  # (Liberar también la distorsión a,b,c aquí desestabiliza la solución cuando hay
  #  poco traslape, así que NO se hace.)
  autooptimiser -a -m -l -s -o "$PTO" "$PTO"
fi

echo "--- 5/6  Fijando salida equirectangular 360x180 (pano_modify)"
# Se fuerza esfera completa 360x180. Los cascos de arriba (~+73°..+90°) y de
# abajo (nadir, ~−73°..−90°) quedan SIN fotos por diseño de la captura v12
# (3 filas a 0°/±30°, sin polos): saldrán vacíos/negros y se tapan con el logo.
# Es lo esperado, no un fallo.
pano_modify --canvas=AUTO --crop=AUTO --projection=2 --fov=360x180 -o "$PTO" "$PTO"

# Verificación defensiva: ¿cpfind conectó las fotos?
# Con ~36 fotos y el traslape denso del asistente deberían salir VARIOS CIENTOS
# de puntos de control; en modo ciego el listón es más bajo.
n_cp="$(grep -c '^c ' "$PTO" || true)"
: "${n_cp:=0}"
if [ "$PATRON_AST" -eq 1 ]; then UMBRAL_CP=120; else UMBRAL_CP=40; fi
if [ "$n_cp" -lt "$UMBRAL_CP" ]; then
  echo "AVISO: solo ${n_cp} puntos de control para ${#FOTOS[@]} fotos (esperaba >= ${UMBRAL_CP})." >&2
  if [ "$PATRON_AST" -eq 1 ]; then
    echo "       Las posiciones sembradas evitan una esfera rota, pero con tan pocos" >&2
    echo "       puntos de control casi seguro pasó algo en la captura:" >&2
    echo "        · te MOVISTE de sitio entre fotos (paralaje) en vez de girar sobre" >&2
    echo "          el eje del teléfono — hay que usar tripié y girar en el sitio," >&2
    echo "        · giraste demasiado rápido y el giroscopio perdió el paso del giro," >&2
    echo "        · el cuarto tiene paredes lisas sin textura que enganchar." >&2
    echo "       Puede haber fantasmas o saltos entre fotos. Conviene recapturar." >&2
  else
    echo "       Causas típicas:" >&2
    echo "        · las fotos no traslapan (se giró demasiado entre foto y foto, o" >&2
    echo "          la cámara se movió de sitio en vez de girar sobre el eje)," >&2
    echo "        · el cuarto tiene paredes lisas sin textura que Hugin pueda enganchar." >&2
    echo "       La esfera va a salir con huecos o geometría rota. Conviene recapturar." >&2
  fi
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
echo "Los CASCOS de arriba y de abajo (~±17° en cada polo) quedan VACÍOS por diseño:"
echo "la captura v12 son 3 filas a 0°/±30°, sin fotos de techo ni piso. Se tapan con"
echo "el logo — NO es un error. La franja del horizonte debe verse completa y sin saltos."
