#!/usr/bin/env bash
# ============================================================================
# armar-esfera.sh
# ----------------------------------------------------------------------------
# Junta una carpeta de fotos (del dron DJI Mini 3 o del iPhone) en UNA imagen
# equirectangular 360° 2:1 lista para el visor. Usa Hugin (software libre).
#
# El dron y el iPhone entregan las tomas SUELTAS; este script las cose.
#
# Con el asistente de captura v15 son ~48 fotos por cuarto (16 por fila × 3 filas
# a 0° / +40° / −40°), tomadas con el LENTE GRAN ANGULAR del iPhone y con paso de
# giro chico (22.5°) para que la vuelta cierre y haya traslape de sobra. La fila
# de NIVEL (0°) carga el horizonte y los muebles de una sola pasada, sin costura.
# El asistente v14 entregaba 32 fotos (2 filas a ±28°): también se soporta.
# El CENIT y el NADIR no se capturan: los cascos de arriba y abajo quedan vacíos
# A PROPÓSITO y se tapan luego con el logo (scripts/tapar_polos.py).
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
#   2. Patron del asistente v14/v15 (LENTE GRAN ANGULAR) -> ~95 grados.
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
# El asistente `capturar/` entrega las fotos en un orden conocido (las fotos
# ordenadas por nombre = el orden de captura). Dos formatos soportados:
#   v15 → 48 fotos (16 por fila × 3 filas):
#     fotos  1..16 (idx  0..15) -> fila "nivel",  pitch   0°, yaw = pos * 22.5
#     fotos 17..32 (idx 16..31) -> fila "arriba", pitch +40°, yaw = pos * 22.5
#     fotos 33..48 (idx 32..47) -> fila "abajo",  pitch -40°, yaw = pos * 22.5
#   v14 → 32 fotos (16 por fila × 2 filas):
#     fotos  1..16 -> fila "arriba", pitch +28°   ·   fotos 17..32 -> "abajo", -28°
#   (parámetros = capturar/captura.js PASO 1: PASO_YAW, FILAS[*].pitch/disparos)
#   Ninguno tiene foto de cenit ni de nadir, y capturan con el LENTE GRAN ANGULAR.
#
# Si reconocemos ese patrón SEMBRAMOS esas posiciones (yaw/pitch/roll) en el
# .pto ANTES de buscar puntos de control, en vez de que cpfind las adivine.
# Corrige el fallo visto en pruebas reales de interior: sin sembrar,
# `autooptimiser -a` auto-nivela adivinando y rola la esfera entera ~90° en
# cuartos chicos sin horizonte claro.
#
# El modo CIEGO (dron, fotos con EXIF, o cualquier cosa que no sean 32/48 fotos
# de canvas) se queda EXACTAMENTE igual que antes: el aéreo del dron cose
# perfecto así y no se toca.
#
# Forzar a mano con la variable de entorno PATRON:
#   PATRON=ciego      -> modo viejo aunque haya 32/48 fotos
#   PATRON=asistente  -> sembrado aunque no haya exactamente 32/48
#   (PATRON=v11 / v12 / v13 / v14 / v15 son alias de "asistente")
# ===========================================================================
PATRON_AST=0
case "${PATRON:-}" in
  ciego)                           PATRON_AST=0 ;;
  asistente|v11|v12|v13|v14|v15)   PATRON_AST=1 ;;
  *)
    # Autodetección: 32 (v14) o 48 (v15) fotos + sin EXIF de lente (= salieron
    # del <canvas> del asistente, que no escribe metadatos).
    if { [ "${#FOTOS[@]}" -eq 32 ] || [ "${#FOTOS[@]}" -eq 48 ]; } \
       && [ "$lente" != "dron" ] && [ "$lente" != "exif" ]; then
      PATRON_AST=1
    fi
    ;;
esac

# Parámetros del patrón — DEBEN coincidir con capturar/captura.js PASO 1.
# El pitch real de cada fila lo decide el heredoc de Python (paso 1b) según
# cuántas filas trae la captura (2 -> v14 ±28° · 3 -> v15 0/+40/−40). Estas
# constantes son la referencia legible y alimentan el mensaje de abajo.
AST_PASO_YAW=22.5        # PASO_YAW
AST_PITCH_NIVEL=0        # v15 FILAS[0].pitch  (fila que carga el horizonte)
AST_PITCH_ARRIBA=40      # v15 FILAS[1].pitch  (en v14 / 32 fotos el Python usa +28)
AST_PITCH_ABAJO=-40      # v15 FILAS[2].pitch  (en v14 / 32 fotos el Python usa -28)
AST_POR_FILA=16          # FILAS[*].disparos

if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- Patrón del asistente detectado: siembro las posiciones de las ${#FOTOS[@]} fotos"
  if [ "${#FOTOS[@]}" -eq 32 ]; then
    echo "    (v14: 16 a +28° · 16 a -28° · paso ${AST_PASO_YAW}° · lente gran angular)"
  else
    echo "    (v15: 16 a ${AST_PITCH_NIVEL}° · 16 a +${AST_PITCH_ARRIBA}° · 16 a ${AST_PITCH_ABAJO}° · paso ${AST_PASO_YAW}° · lente gran angular)"
  fi
else
  echo "--- Modo ciego: cpfind adivina las posiciones (dron / EXIF / captura no estándar)"
fi

# --- FOV por defecto (ahora sí sabemos si es el patrón del asistente) --------
if [ -z "${FOV_CAMARA:-}" ]; then
  if [ "$PATRON_AST" -eq 1 ]; then
    # Patrón asistente (v14/v15) = LENTE GRAN ANGULAR del iPhone en retrato. Su
    # FOV horizontal ronda ~95° (ESTIMADO; afínalo con FOV_CAMARA=NN si el cosido
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
# armarla en shell) y la aplicamos con `pto_var --set`.
#
# El nº de FILAS se deduce del conteo: 16 disparos por fila (AST_POR_FILA).
#   32 fotos -> 2 filas -> pitch [+28, -28]        (v14)
#   48 fotos -> 3 filas -> pitch [0, +40, -40]     (v15; la de 0° carga el horizonte)
# Dentro de cada fila el yaw avanza PASO_YAW (22.5°) por disparo, empezando en 0.
# Es tolerante a que sobren/falten fotos: redondea el nº de filas y las fotos de
# más caen en la última fila, así una captura de 31/33/47 no rompe el sembrado.
if [ "$PATRON_AST" -eq 1 ]; then
  echo "--- 1b/6  Sembrando posiciones de las fotos (pto_var --set)"
  SEMBRADO="$(python - "${#FOTOS[@]}" "$AST_PASO_YAW" "$AST_POR_FILA" <<'PY'
import sys
n        = int(sys.argv[1])
PASO     = float(sys.argv[2])          # AST_PASO_YAW  = 22.5
POR_FILA = int(sys.argv[3])            # AST_POR_FILA  = 16

# pitch de cada fila segun cuantas filas trae la captura (debe coincidir con
# capturar/captura.js PASO 1 · FILAS[*].pitch):
PITCHES = {2: [28, -28], 3: [0, 40, -40]}

n_filas = max(1, round(n / POR_FILA))
pitches = PITCHES.get(n_filas)
if pitches is None:
    # conteo muy raro (ni ~32 ni ~48): reparte en 2 filas ±28 como en v14
    pitches, n_filas = [28, -28], 2

partes = []
for i in range(n):
    fila = min(i // POR_FILA, n_filas - 1)   # fotos de mas -> ultima fila
    pos  = i - fila * POR_FILA               # posicion dentro de la fila (0..15)
    yaw  = (pos * PASO) % 360
    partes.append("y{0}={1:g},p{0}={2:g},r{0}=0".format(i, yaw, pitches[fila]))
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
  # Nota: NO se usa `pano_modify --straighten` aquí. Se probó y EMPEORÓ: al
  # rotar la esfera arrastra el techo (mal cubierto por el gran angular en el
  # borde superior de cada foto) hacia el centro, donde se ve peor. La
  # inclinación del cuarto se corrige mejor en la captura (tomar el teléfono
  # derecho) que forzando una rotación global aquí.
else
  echo "--- 4/6  Optimizando posiciones, nivelado y exposición (autooptimiser -a)"
  # El modo -a alinea posiciones y ajusta el FOV a partir de los puntos de control.
  # (Liberar también la distorsión a,b,c aquí desestabiliza la solución cuando hay
  #  poco traslape, así que NO se hace.)
  autooptimiser -a -m -l -s -o "$PTO" "$PTO"
fi

echo "--- 5/6  Fijando salida equirectangular 360x180 (pano_modify)"
# Se fuerza esfera completa 360x180. Los cascos del cenit (~+90°) y del nadir
# (~−90°) quedan SIN fotos por diseño del asistente (v15: 3 filas a 0/±40°; v14:
# 2 filas a ±28°; ninguno captura polos): saldrán vacíos/negros y se tapan con el
# logo. Es lo esperado, no un fallo.
pano_modify --canvas=AUTO --crop=AUTO --projection=2 --fov=360x180 -o "$PTO" "$PTO"

# Verificación defensiva: ¿cpfind conectó las fotos?
# Con ~32-48 fotos y el traslape denso del asistente deberían salir VARIOS
# CIENTOS de puntos de control; en modo ciego el listón es más bajo.
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
echo "Los CASCOS del cenit y del nadir (~±10° en cada polo) quedan VACÍOS por diseño:"
echo "el asistente no captura polos (v15: 3 filas 0/±40° · v14: 2 filas ±28°). Taparlos con:"
echo "  python scripts/tapar_polos.py \"$SALIDA\" <salida-final.webp>"
echo "La franja del horizonte debe verse completa y SIN CUÑA NEGRA (si hay cuña, la"
echo "vuelta no cerró: gira más despacio y da la vuelta completa)."
