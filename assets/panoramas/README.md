# assets/panoramas/

Aquí viven las tomas 360 que muestra el visor. `script.js` las referencia por su
ruta en el array `ESCENAS`.

## Requisitos de cada imagen

| Requisito | Valor | Por qué |
|---|---|---|
| Proyección | Equirectangular | Es lo que Pannellum sabe pintar como esfera |
| Proporción | **2:1 exacta** (ej. 5760×2880, 4096×2048) | Si no es 2:1 la esfera sale deformada |
| Formato | `.webp` (preferido) o `.jpg` | WebP pesa ~30–40 % menos con calidad similar |
| Peso objetivo | < 1.5 MB por toma | Carga rápida en celular con datos móviles |

## Flujo desde el DJI Mini 3

1. El dron toma la esfera por segmentos; se cosen con **DJI Fly**, **Microsoft ICE**
   o similar → sale un `.jpg` grande (varios MB, ~8000 px de ancho).
2. Guarda ese original pesado en `assets/panoramas/_raw/` (esa carpeta está en
   `.gitignore`: no se sube, es tu respaldo local).
3. Optimiza a `.webp` con el script (ver skill `optimize-assets`):
   ```bash
   bash scripts/optimizar-panoramas.sh
   ```
   El resultado optimizado se escribe aquí, en `assets/panoramas/`.
4. Añade la toma al array `ESCENAS` en `script.js`.

## Contenido actual

| Archivo | Origen | Nota |
|---|---|---|
| `pano-cocina.jpg` | **Captura real DJI Mini 3** (2026-08-25, cosida con Microsoft ICE) | 4864×2224. Pendiente: recortar a 2:1 exacto y pasar a WebP. |
| `pano-sala.jpg` | Muestra 2048×1024 | Placeholder de demo; reemplazar por toma real. |
| `aerea-demo.jpg` | Imagen cenital plana (no es 360) | Sobra para el visor 360; se conserva por si vuelve la vista de mapa. |
