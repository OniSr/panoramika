# Domo 360 — Recorridos 360° con dron (Xalapa)

Sitio estático que muestra tomas panorámicas 360° del DJI Mini 3 con navegación
entre escenas mediante hotspots. Sin frameworks: **HTML + CSS + Pannellum.js**.

## Correr en local

Pannellum necesita `http://` (no `file://`) para cargar las texturas:

```bash
python -m http.server 8000
```

Abre <http://localhost:8000>. (O usa la extensión *Live Server* de VS Code.)

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html` | Estructura de la página |
| `style.css` | Estilos (tokens de diseño en `:root`, responsivo) |
| `script.js` | Lógica del visor. El array `ESCENAS` (arriba del archivo) es lo único que editas para añadir tomas |
| `assets/panoramas/` | Imágenes 360 (2:1, `.webp` preferido). `_raw/` = originales del dron, no se versionan |
| `vendor/pannellum/` | Copia local de Pannellum, respaldo si el CDN falla |
| `scripts/optimizar-panoramas.sh` | Convierte los JPG del dron a WebP con `cwebp` |
| `.claude/skills/` | Procedimientos del proyecto (ver `CLAUDE.md`) |

## Añadir una toma nueva

1. Cose la esfera 360 (DJI Fly / Microsoft ICE) → guarda el original en
   `assets/panoramas/_raw/`.
2. `bash scripts/optimizar-panoramas.sh` → genera el `.webp` en `assets/panoramas/`.
3. Agrega un bloque al array `ESCENAS` en `script.js` con su `id`, `titulo`,
   `panorama` y los `hotspots` hacia otras escenas.

## Despliegue

GitHub Pages, estático, desde `main` (raíz). Requiere GitHub CLI:
`winget install --id GitHub.cli` → `gh auth login`. Detalle en la skill
`.claude/skills/github-deploy/`.

## Historial

El MVP anterior en Next.js + Leaflet (mapa de lotes) está archivado en la rama
`archivo-nextjs`.
