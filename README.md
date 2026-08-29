# Tours 360 — Plataforma propia (MVP)

## Correr en local
```bash
npm install
npm run dev
```
Abre http://localhost:3000

## Qué hay ahora
- `/` — lista de proyectos demo
- `/tour/demo/terreno-1` — mapa aéreo con polígonos de lotes (clic en un lote = ficha con precio/estatus)
- `/tour/demo/casa-1` — visor 360 navegable entre 2 escenas (sala/cocina)

## Reemplazar por contenido real
- `public/demo/aerea-demo.jpg` → tu captura aérea del Mini 3 (foto normal, no necesita ser 360)
- `public/demo/pano-sala.jpg` y `pano-cocina.jpg` → tus panoramas 360 equirectangulares (relación 2:1, ej. 4096x2048)
- `data/proyectos-mock.ts` → aquí defines cada proyecto nuevo (coordenadas de lotes, escenas y hotspots). Esto es temporal: el siguiente paso es mover esto a Supabase para que lo puedas cargar desde un panel admin en vez de editar código.

## Siguiente fase
1. Panel admin (subir fotos, dibujar polígonos visualmente, no a mano en el código)
2. Supabase: Storage (fotos) + Postgres (datos de proyectos/lotes/escenas) + Auth (tu login)
3. Deploy a Vercel con dominio propio
