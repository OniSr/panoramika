# Domo 360 — Recorridos 360° con dron (Xalapa)

Sitio estático que muestra tomas panorámicas 360° del DJI Mini 3 con navegación
entre escenas mediante hotspots. Sin frameworks: **HTML + CSS + Pannellum.js**.
Multi-proyecto: cada recorrido es una carpeta con su JSON.

## Correr en local

Pannellum necesita `http://` (no `file://`):

```bash
python -m http.server 8000
```

- <http://localhost:8000> → recorrido por defecto (`xalapa-demo`)
- <http://localhost:8000/?proyecto=otro-slug> → otro recorrido

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` · `style.css` · `script.js` | El visor. No se editan para añadir contenido |
| `proyectos/<slug>/proyecto.json` | Metadatos + escenas + hotspots de un recorrido |
| `proyectos/<slug>/panoramas/` | Imágenes 360 de ese recorrido (2:1, `.webp`) |
| `proyectos/_plantilla/` | Copiar para crear un recorrido nuevo |
| `assets/panoramas/_raw/` | Originales pesados del dron (no se versionan) |
| `assets/favicon.svg` · `assets/og-imagen.jpg` | Icono y miniatura al compartir |
| `vendor/pannellum/` | Copia local de Pannellum (respaldo si el CDN falla) |
| `scripts/` | Optimizar panorámicas a WebP · generar la miniatura OG |
| `.claude/skills/` | Procedimientos del proyecto (ver `CLAUDE.md`) |

## Añadir un recorrido

```bash
cp -r proyectos/_plantilla proyectos/mi-terreno
# copia los .jpg del dron a assets/panoramas/_raw/ y:
python scripts/optimizar_panoramas.py proyectos/mi-terreno/panoramas
# edita proyectos/mi-terreno/proyecto.json
```

Enlace: `.../index.html?proyecto=mi-terreno`. Detalle en
`.claude/skills/add-panorama/`.

## Desplegar

GitHub Pages, estático. Ver **`DEPLOY.md`**.

## Historial

El MVP anterior en Next.js + Leaflet (mapa de lotes) está archivado en la rama
`archivo-nextjs`.
