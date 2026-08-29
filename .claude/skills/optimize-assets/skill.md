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

## Herramienta: `cwebp` (libwebp)

Binario liviano (~1 MB), sin dependencias npm.

| SO | Instalación |
|---|---|
| Windows | `winget install Google.WebP` |
| macOS | `brew install webp` |
| Linux | `sudo apt install webp` |

## Uso

1. Copia los originales del dron a `assets/panoramas/_raw/`.
2. Ejecuta:
   ```bash
   bash scripts/optimizar-panoramas.sh
   ```
   Convierte todos los `.jpg/.jpeg/.png` de `_raw/` y deja los `.webp` en
   `assets/panoramas/`. Imprime el antes/después en KB.
3. Variables opcionales:
   ```bash
   CALIDAD=85 ANCHO_MAX=6000 bash scripts/optimizar-panoramas.sh
   ```
4. Añade la toma a `ESCENAS` en `script.js` (ver skill `add-panorama`).

## Recorte a 2:1

`cwebp` redimensiona pero no recorta. Si el original no es 2:1, la esfera sale
deformada. Recorta antes en cualquier editor, o con ImageMagick:

```bash
magick _raw/foto.jpg -gravity center -crop 2:1 +repage _raw/foto.jpg
```

## Alternativas si no quieres instalar cwebp

- **Squoosh CLI** (necesita Node puntualmente, no queda como dependencia):
  `npx @squoosh/cli --webp '{"quality":82}' -d assets/panoramas assets/panoramas/_raw/*.jpg`
- **Squoosh web** (<https://squoosh.app>): arrastra la imagen, formato WebP,
  calidad ~82, descarga a `assets/panoramas/`. Cero instalación.

## Verificar

- El `.webp` pesa < 1.5 MB y abre bien en el navegador.
- Proporción exactamente 2:1 (`identify -format "%wx%h" foto.webp` o DevTools).
- El visor la muestra sin deformación y sin warning de proporción en consola.
