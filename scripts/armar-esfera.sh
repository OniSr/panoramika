#!/usr/bin/env bash
# ============================================================================
# armar-esfera.sh
# ----------------------------------------------------------------------------
# Junta una carpeta de fotos (del dron DJI Mini 3 o del iPhone) en UNA imagen
# equirectangular 360° 2:1 lista para el visor. Usa Hugin (software libre).
#
# El dron y el iPhone entregan las tomas SUELTAS; este script las cose.
#
# Con el asistente de captura v14 son ~32 fotos por cuarto (16 por fila × 2 filas
# a ±28°), tomadas con el LENTE GRAN ANGULAR del iPhone y con paso de giro chico
# (22.5°) para que la vuelta cierre y haya traslape de sobra. El TECHO y el PISO
# no se capturan: los cascos de arriba y abajo quedan vacíos A PROPÓSITO y se
# tapan luego con el logo (scripts/tapar_polos.py).
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
#   1. Si el EXIF trae distancia focal                 -> pto_gen lo calcula solo.
#   2. Patron del asistente v14 (LENTE GRAN ANGULAR)   -> ~95 grados.
#   3. Dron DJI (modelo "FC...")                       -> ~82 grados.
#   4. Otro sin EXIF (iPhone, lente normal)            -> ~63 grados.
# Se puede forzar con la variable de entorno FOV_CAMARA.
# El valor por defecto se FIJA MAS ABAJO, tras detectar si es el patron del
# asistente (necesitamos saber eso para elegir 95 vs 63).
#
# Nota: el FOV exacto NO es lo que decide. Lo que salva la esfera es el TRASLAPE
# DENSO de la captura (paso de giro chico) + el sembrado de posiciones del
# "patrón asistente" (ver más abajo). Con el gran angular el traslape es aun mayor.
DETECTA='
from PIL import Image
import sys
e = Image.open(sys.argv[1]).getexif()
m = str(e.get(272, "")).upper().strip()
print("exif" if (e.get(37386) or e.get(41989)) else ("dron" if m.startswith("FC") else "iphone"))
'
lente="$(python -c "$DETECTA" "${FOTOS[0]}" 2>/dev/null || echo iphone)"

# ===========================================================================
# ¿Es el patrón del asistente de captura?  (modo "sembrado" vs modo "ciego")
# ---------------------------------------------------------------------------
# El asistente `capturar/` v14 SIEMPRE entrega 32 fotos en un orden conocido
# (las fotos ordenadas por nombre = el orden de captura):
#   fotos  1..16 (idx  0..15) -> fila "arriba", pitch +28°, giro +22.5°/foto
#                                 -> yaw = idx * 22.5
#   fotos 17..32 (idx 16..31) -> fila "abajo",  pitch -28°, mismo giro
#                                 -> yaw = (idx - 16) * 22.5
#   (parámetros = capturar/captura.js PASO 1: PASO_YAW, FILAS[*].pitch/disparos)
#   v14 NO tiene foto de techo ni de piso, y captura con el LENTE GRAN ANGULAR.
#
# Si reconocemos ese patrón SEMBRAMOS esas posiciones (yaw/pitch/roll) en el
# .pto ANTES de buscar puntos de control, en vez de que cpfind las adivine.
# Corrige el fallo visto en pruebas reales de interior: sin sembrar,
# `autooptimiser -a` auto-nivela adivinando y rola la esfera entera ~90° en
# cuartos chicos sin horizonte claro.
#
# El modo CIEGO (dron, fotos con EXIF, o cualquier cosa que no sean 32 fotos
# de canvas) se queda EXACTAMENTE igual que antes: el aéreo del dron cose
# perfecto así y no se toca.
#
# Forzar a mano con la variable de entorno PATRON:
#   PATRON=ciego      -> modo viejo aunque haya 32 fotos
#   PATRON=asistente  -> sembrado aunque no haya exactamente 32
#   (PATRON=v11 / v12 / v13 / v14 son alias de "asistente")
# ===========================================================================
PATRON_AST=0
case "${PATRON:-}" in
  ciego)                       PATRON_AST=0 ;;
  asistente|v11|v12|v13|v14)   PATRON_AST=1 ;;
  *)
    # Autodetección: 32 fotos + sin EXIF de lente (= salieron del <canvas>).
    if [ "${#FOTOS[@]}" -eq 32 ] && [ "$lente" != "dron" ] && [ "$lente" != "exif" ]; then
      PATRON_AST=1
    fi
    ;;
esac

# Parámetros del patrón — DEBEN coincidir con capturar/captura.js PASO 1.
AST_PASO_YAW=22.5        # PASO_YAW
AST_PITCH_ARRIBA=28      # FILAS[0].pitch   (v14: ±28 con lente gran angular)
AST_PITCH_ABAJO=-28      # FILAS[1].pitch
AST_POR_FILA=16          # FILAS[*].disparos

if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- Patrón del asistente detectado: siembro las posiciones de las ${#FOTOS[@]} fotos"
  echo "    (16 arriba a +${AST_PITCH_ARRIBA}° · 16 abajo a ${AST_PITCH_ABAJO}° · paso ${AST_PASO_YAW}° · lente gran angular)"
else
  echo "--- Modo ciego: cpfind adivina las posiciones (dron / EXIF / captura no estándar)"
fi

# --- FOV por defecto (ahora sí sabemos si es el patrón del asistente) --------
if [ -z "${FOV_CAMARA:-}" ]; then
  if [ "$PATRON_AST" -eq 1 ]; then
    # Patrón asistente v14 = LENTE GRAN ANGULAR del iPhone en retrato. Su FOV
    # horizontal ronda ~95° (ESTIMADO; afínalo con FOV_CAMARA=NN si el cosido
    # sale "ojo de pez" o al revés, comprimido). El lente normal era ~63°.
    FOV_CAMARA=95
  elif [ "$lente" = "dron" ]; then
    FOV_CAMARA=82
  else
    FOV_CAMARA=63    # iPhone lente normal / captura no estándar sin EXIF
  fi
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
# a que sobren o falten fotos: se reparten en 2 mitades (arriba / abajo). Así,
# si Daniel toma 31 o 33, no se rompe.
if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- 1b/6  Sembrando posiciones de las fotos (pto_var --set)"
  SEMBRADO="$(python - "${#FOTOS[@]}" <<'PY'
import sys
n = int(sys.argv[1])
PASO, P_ARRIBA, P_ABAJO = 22.5, 28, -28   # v14: paso 22.5°, filas a ±28° (gran angular)
por_fila = max(1, round(n / 2))    # ~16; se adapta si el conteo no es 32 exacto
partes = []
for i in range(n):
    if i < por_fila:                       # fila arriba
        yaw, pitch = (i * PASO) % 360, P_ARRIBA
    else:                                  # fila abajo (y cualquier foto de más)
        yaw, pitch = ((i - por_fila) * PASO) % 360, P_ABAJO
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
  echo "--- 4/6  Ajuste fino de posiciones + distorsión + exposición (asistente)"
  # Las posiciones YA vienen sembradas (paso 1b). Optimizamos:
  #   · yaw / pitch / roll de cada foto (MENOS la foto 0, anclada como referencia
  #     para que el conjunto no gire en bloque), y
  #   · `b` = distorsión radial (barril) del lente. El gran angular v14 la tiene
  #     FUERTE; sin corregirla las paredes y el piso salen ondulados y el error de
  #     alineación se dispara (RMS ~50). Con `b` liberado, la esfera queda derecha
  #     y legible (probado real con la captura "V14", 32 fotos). `b` es un
  #     parámetro por LENTE (compartido por todas las fotos), así que 940 puntos
  #     de control lo determinan de sobra.
  #
  # NUNCA se optimiza el FOV (`v`) ni se usa `autooptimiser -a`: en pruebas reales
  # ambos degeneran la esfera — con `v` libre sale una tira delgada (RMS ~70-85,
  # lienzo de 16000 px); con `-a` se descuadra el pitch y queda medio vacía.
  #   -n = optimiza solo las variables marcadas por pto_var --opt
  #   -m = iguala la exposición   ·   -s = elige el tamaño de lienzo
  # El error residual que quede es paralaje de captura a mano/tripié en un cuarto
  # chico; se reduce en la captura (girar sobre el eje), no aquí.
  # Una foto sin puntos de control (pared muy lisa) se queda en su posición
  # sembrada — es lo que queremos.
  pto_var --opt "y,p,r,b,!y0,!p0,!r0" -o "$PTO" "$PTO"
  autooptimiser -n -m -s -o "$PTO" "$PTO"
else
  echo "--- 4/6  Optimizando posiciones, nivelado y exposición (autooptimiser -a)"
  # El modo -a alinea posiciones y ajusta el FOV a partir de los puntos de control.
  # (Liberar también la distorsión a,b,c aquí desestabiliza la solución cuando hay
  #  poco traslape, así que NO se hace.)
  autooptimiser -a -m -l -s -o "$PTO" "$PTO"
fi

echo "--- 5/6  Fijando salida equirectangular 360x180 (pano_modify)"
# Se fuerza esfera completa 360x180. Los cascos de arriba (~+83°..+90°) y de
# abajo (nadir, ~−83°..−90°) quedan SIN fotos por diseño de la captura v14
# (2 filas a ±28°, sin polos): saldrán vacíos/negros y se tapan con el logo.
# Es lo esperado, no un fallo.
pano_modify --canvas=AUTO --crop=AUTO --projection=2 --fov=360x180 -o "$PTO" "$PTO"

# Verificación defensiva: ¿cpfind conectó las fotos?
# Con ~32 fotos y el traslape denso del asistente deberían salir VARIOS CIENTOS
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
echo "Los CASCOS de arriba y de abajo (~±7-12° en cada polo) quedan VACÍOS por diseño:"
echo "la captura v14 son 2 filas a ±28° (lente gran angular), sin techo ni piso. Taparlos con:"
echo "  python scripts/tapar_polos.py \"$SALIDA\" <salida-final.webp>"
echo "La franja del horizonte debe verse completa y SIN CUÑA NEGRA (si hay cuña, la"
echo "vuelta no cerró: gira más despacio y da la vuelta completa)."
