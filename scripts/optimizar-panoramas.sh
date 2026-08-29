#!/usr/bin/env bash
# ============================================================================
# optimizar-panoramas.sh
# ----------------------------------------------------------------------------
# Convierte los .jpg/.png pesados del dron (en assets/panoramas/_raw/) a .webp
# ligeros y listos para web (en assets/panoramas/).
#
# NUNCA toca los originales: solo lee _raw/ y escribe una copia optimizada.
#
# Requiere 'cwebp' (paquete libwebp), un binario liviano de ~1 MB:
#   Windows : winget install Google.WebP     (o descarga de developers.google.com/speed/webp)
#   macOS   : brew install webp
#   Linux   : sudo apt install webp
#
# Uso:
#   bash scripts/optimizar-panoramas.sh
# ============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGEN="$RAIZ/assets/panoramas/_raw"
DESTINO="$RAIZ/assets/panoramas"

# Calidad WebP (0-100). 80-85 es el punto dulce para fotografía panorámica.
CALIDAD="${CALIDAD:-82}"
# Ancho máximo de salida. 5760 basta para pantalla completa sin pixelar y
# mantiene el archivo por debajo de ~1.5 MB. cwebp respeta la proporción.
ANCHO_MAX="${ANCHO_MAX:-5760}"

# --- Comprobaciones defensivas ---------------------------------------------
if ! command -v cwebp >/dev/null 2>&1; then
  echo "ERROR: no se encontró 'cwebp'. Instálalo (ver cabecera de este script)." >&2
  exit 1
fi

if [ ! -d "$ORIGEN" ]; then
  echo "ERROR: no existe $ORIGEN" >&2
  exit 1
fi

shopt -s nullglob nocaseglob
ARCHIVOS=("$ORIGEN"/*.jpg "$ORIGEN"/*.jpeg "$ORIGEN"/*.png)
shopt -u nullglob nocaseglob

if [ ${#ARCHIVOS[@]} -eq 0 ]; then
  echo "No hay imágenes en $ORIGEN. Copia ahí los originales del dron y vuelve a correr."
  exit 0
fi

# --- Conversión ------------------------------------------------------------
for entrada in "${ARCHIVOS[@]}"; do
  base="$(basename "$entrada")"
  salida="$DESTINO/${base%.*}.webp"

  echo "→ $base"
  cwebp -quiet -q "$CALIDAD" -resize "$ANCHO_MAX" 0 -metadata none "$entrada" -o "$salida"

  antes=$(wc -c < "$entrada")
  despues=$(wc -c < "$salida")
  printf "   %s KB  →  %s KB\n" "$((antes/1024))" "$((despues/1024))"
done

echo
echo "Listo. Revisa los .webp en assets/panoramas/ y añádelos al array ESCENAS de script.js."
echo "Recuerda: la imagen debe quedar en proporción 2:1. Si tu original no lo es,"
echo "recórtalo antes (en cualquier editor) o con ImageMagick:"
echo "   magick entrada.jpg -gravity center -crop 2:1 +repage assets/panoramas/_raw/entrada.jpg"
