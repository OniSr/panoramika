---
name: optimize-assets
description: >-
  Procedimiento para convertir las imágenes gigantes .jpg del DJI Mini 3 a WebP
  optimizado para web con un script local liviano, sin subir de peso el repo ni
  la carga de la página. Úsala cuando lleguen tomas nuevas del dron o cuando una
  panorámica existente pese de más.
---

# optimize-assets — optimizar tomas del dron

## Objetivo

Los JPG cosidos del dron pesan varios MB y miden ~8000 px de ancho. Para web se
quieren **WebP, ≤ ~1.5 MB, ancho ≤ 5760 px, proporción 2:1**. WebP a calidad 82
pesa 30–40 % menos que el JPG equivalente sin diferencia visible en pantalla.

## Regla de oro

**Nunca optimices sobre el original.** El flujo es:

```
assets/panoramas/_raw/foto.jpg   (original pesado, en .gitignore)
        │  script
        ▼
assets/panoramas/foto.webp       (optimizado, esto sí se versiona)
```

## Opción recomendada: script de Python (Pillow)

Ya funciona en el equipo de Daniel (Pillow instalado). Además de convertir a WebP,
**ajusta la proporción a 2:1 exacta** rellenando el lado corto con el color de la
interfaz (una equirectangular real casi siempre tiene cielo/nadir vacío ahí).

```bash
# 1. copia los originales del dron a assets/panoramas/_raw/
# 2. optimiza HACIA la carpeta del proyecto:
python scripts/optimizar_panoramas.py proyectos/<slug>/panoramas
# opcionales:
CALIDAD=85 ANCHO_MAX=6000 python scripts/optimizar_panoramas.py proyectos/<slug>/panoramas
```

Si falta Pillow: `python -m pip install Pillow`.

## Opción B: `cwebp` (sin Python)

Binario liviano (~1 MB): Windows `winget install Google.WebP`, macOS
`brew install webp`, Linux `sudo apt install webp`. Luego:

```bash
bash scripts/optimizar-panoramas.sh          # escribe a assets/panoramas/
```
`cwebp` redimensiona pero **no** recorta a 2:1: si el original no es 2:1, recórtalo
antes en cualquier editor o con ImageMagick
(`magick in.jpg -gravity center -crop 2:1 +repage _raw/in.jpg`).

## Opción C: sin instalar nada

**Squoosh web** (<https://squoosh.app>): arrastra la imagen, formato WebP,
calidad ~82, descarga a `proyectos/<slug>/panoramas/`.

## Después

Añade la toma al `proyecto.json` correspondiente (ver skill `add-panorama`).

## Verificar

- El `.webp` pesa < 1.5 MB y abre bien en el navegador.
- Proporción exactamente 2:1 (`identify -format "%wx%h" foto.webp` o DevTools).
- El visor la muestra sin deformación y sin warning de proporción en consola.
