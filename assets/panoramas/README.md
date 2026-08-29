# assets/panoramas/

**Zona de preparación**, no de publicación. Las tomas que usa el visor viven en
`proyectos/<slug>/panoramas/`.

- `_raw/` — originales pesados del dron (varios MB, sin recortar). Está en
  `.gitignore`: es tu respaldo local, no se sube al repo.

## Flujo

1. Cose la esfera 360 del DJI Mini 3 (DJI Fly / Microsoft ICE) → `.jpg` grande.
2. Guárdalo en `assets/panoramas/_raw/`.
3. Optimiza a WebP 2:1 hacia la carpeta del proyecto:
   ```bash
   python scripts/optimizar_panoramas.py proyectos/<slug>/panoramas
   ```
4. Refiéncialo en `proyectos/<slug>/proyecto.json` (ver skill `add-panorama`).

## Requisitos de cada toma publicada

| Requisito | Valor |
|---|---|
| Proyección | Equirectangular |
| Proporción | 2:1 exacta (el script la ajusta) |
| Formato | `.webp`, calidad ~82 |
| Peso | < 1.5 MB por toma |
