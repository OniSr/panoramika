# ESTADO — Panorámika

> Punto de traspaso entre sesiones. Una sesión nueva lee **esto + CLAUDE.md +
> ESTRATEGIA.md** y ya puede continuar sin releer el chat. Se actualiza al cerrar
> cada sesión o antes de compactar contexto. Última actualización: **2026-08-30**.

## Qué es

Sitio estático (HTML/CSS/Pannellum vía CDN) de recorridos virtuales 360 para
inmobiliaria en Xalapa. En vivo: **https://onisr.github.io/panoramika/**.
Repo `OniSr/panoramika` (público). Rama de trabajo `main`; MVP viejo Next.js en
`archivo-nextjs`. Deploy = push a `main` → GitHub Pages redepliega solo.

## Cómo está montado el entorno (ya hecho)

- `gh` CLI instalado (`winget --scope user`), autenticado como `OniSr`.
- `Hugin` instalado (`winget install Hugin.Hugin`) → `C:\Program Files\Hugin\bin`.
- `Pillow` disponible en Python. `ffmpeg` disponible (winget Gyan.FFmpeg).
- **Google Drive para escritorio** montado en `G:` →
  `G:\Mi unidad\PANORAMIKA\...` son archivos locales (leer de ahí, **NO** con
  `download_file_content` del MCP que mete base64 al contexto).

## Estructura del código (índice para no leer todo)

| Necesitas tocar… | Archivo | Dónde |
|---|---|---|
| Lógica del visor (carga JSON, escenas, hotspots, compartir) | `script.js` | PASO 1–8, se lee de arriba abajo |
| Marcadores/hotspots del visor | `script.js` | `crearMarcador()`, `construirConfigPannellum()` |
| Barra de navegación entre escenas | `script.js` | `construirSelector()`, `alCambiarEscena()` |
| Estilos del visor | `style.css` | secciones numeradas 1–9 |
| Asistente de captura (pantallas, permisos) | `capturar/captura.js` | PASO 1–7 |
| Bucle de captura (filas, giro relativo, disparo) | `capturar/captura.js` | PASO 6: `bucle()`, `entrarEnDisparo()`, `capturarFoto()` |
| Orientación del teléfono (giroscopio) | `capturar/captura.js` | PASO 4: `escucharOrientacion()` |
| Compartir fotos a Drive (en tandas) | `capturar/captura.js` | PASO 7: `btnCompartir` handler |
| Datos de un recorrido | `proyectos/<slug>/proyecto.json` | — |
| Armar esfera de fotos sueltas | `scripts/armar-esfera.sh` | Hugin CLI + detección de lente dron/iPhone |
| Optimizar imagen → WebP 2:1 | `scripts/optimizar_panoramas.py` | modo lote y modo un-archivo |
| Placeholder de escena | `scripts/placeholder_panorama.py` | — |
| Miniatura de compartir | `scripts/generar_og.py` | — |

Recorridos actuales: `proyectos/xalapa-demo/` (demo original 2 escenas),
`proyectos/depto-lagos/` (piloto real: aérea del dron OK + fachada/sala/recámara
son placeholders hasta tener fotos).

## Estado de cada frente

### Asistente de captura — `capturar/` (v12, en vivo tras push)
- **Pantalla final (commit 5221165)**: compartir a Drive desde iOS NUNCA fue
  fiable. Ahora **un solo `navigator.share` con todas las fotos** → "Guardar
  imágenes" al carrete → Daniel las sube a Drive desde Fotos. Sin tandas.
- **Diagnóstico del stitching (cerrado)**: v6/v7/v8 no cosían — con paso de giro
  de 45° dos fotos seguidas de una fila tenían **0 puntos de control** (traslape
  horizontal nulo). El FOV no era la causa (probado 50 vs 63, igual). Solución:
  **paso de giro chico** = traslape denso, robusto aunque el giroscopio yerre ±10°.
- **v11 (probado real, "Cuarto lagos 4", 33 fotos)**: 2 filas ±20° + 1 techo, paso
  22.5°. Arregló 2 bugs que traía v10: verticalidad (`acostado = |derZ| > sin45°`,
  el eje "derecha" del teléfono; ya no usa `e.gamma` que se desquicia en beta ±90)
  y la diana (**proyección gnomónica** `proyectarObjetivo()` en PASO 5, cae bien a
  cualquier inclinación). Con el sembrado del script **la esfera cosió y quedó
  derecha**, PERO: la foto de techo nunca engancha y 2 filas a ±20° dejaban bandas
  negras de ~40°.
- **v12 (este commit)** — "3 filas moderadas, sin polos":
  - **3 filas: horizonte 0°, arriba +30°, abajo −30°**, `PASO_YAW = 30°` (12
    disparos/fila) → **36 fotos.** `POLOS = []` (sin techo ni piso).
  - La fila del horizonte hace de ancla; ±30° no hace caer el teléfono (±40 sí).
    Cobertura ~±65° → cascos de ~±17° arriba y abajo → se tapan con logo.
  - Resto igual: roll robusto, diana gnomónica, `FOV_GUIA` 54/87, giro relativo,
    paso denso, sin brújula.
- Fotos salen del `<canvas>` del video: **2160×4032, sin EXIF**.
- **PENDIENTE: Daniel captura un cuarto con v12** (36 fotos, tripié) → re-armar.
- Cache-bust: `?v=N` en `index.html` (css y js) + `<span class="version">`. Va en **v12**.

### Armado de esferas — `scripts/armar-esfera.sh`
- Modo **CIEGO** (dron / fotos con EXIF): `pto_gen → cpfind --multirow → cpclean →
  autooptimiser -a -m -l -s`. El aéreo del dron de Los Lagos cose **excelente**
  (5760×2880) así — NO se toca.
- Modo **"patrón asistente"** (autodetecta 36 fotos sin EXIF; forzar con
  `PATRON=asistente` / `PATRON=ciego`): **siembra** yaw/pitch de cada foto
  (12 a 0°, 12 a +30°, 12 a −30°; yaw = pos×30°) con `pto_var --set` antes de
  `cpfind --prealigned`, y optimiza **solo yaw/pitch/roll** (`pto_var --opt` +
  `autooptimiser -n`). **NUNCA** `-a` ni liberar el FOV (`v`): degeneran la esfera
  (sin sembrar `-a` la rola ~90°; con FOV libre sale una tira delgada).
- **Interior probado con v11** (33 fotos): esfera derecha y legible, error residual
  ~16 px (paralaje del cuarto chico). Falta probar el patrón v12 con 36 fotos.

### Visor — navegación tipo Street View (v en vivo)
- Hotspots = marcadores con etiqueta (`tipo`: `propiedad` / `destino` / `salir`).
- Barra de escenas **siempre visible**, chips con ícono, contador "2/4 · Fachada".
- **PENDIENTE**: Daniel confirma cuál edificio es la propiedad en la aérea de
  `depto-lagos` (marcador ahora en yaw 8, pitch -40, estimado) → ajustar en
  `proyectos/depto-lagos/proyecto.json`.

## Próximas tareas (orden sugerido)

1. **Daniel captura un cuarto con captura v11** (tripié, 33 fotos: 2 filas ±20° +
   techo) → re-armar la esfera y ver si ahora cosen las filas. Cuarto con textura.
2. **Tapar el nadir con el logo** — ahora prioridad ALTA: v11 no fotografía el
   piso, así que toda esfera interior nace con ~27° de hueco abajo. Script o imagen.
3. Reemplazar placeholders de `depto-lagos` por fotos reales (fachada + cuartos).
4. Ajustar posición del marcador de la propiedad en la aérea.
5. **Página índice** que liste los recorridos (portafolio para brokers).
6. Después (features tipo competencia "La Rosa"): pestaña PLANO 2D, selector de
   unidades/lotes (recuperar de `archivo-nextjs`), toggle amueblado/vacío,
   transiciones más finas.
7. Marketing: embudo social + 1 recorrido demo impecable.

## Decisiones tomadas (no re-litigar)

- Nombre: **Panorámika** (salió "Domo 360" por tema legal).
- Stack: HTML/CSS/Pannellum CDN, sin build. No introducir bundler ni framework.
- Sin cámara 360 dedicada por ahora (no hay capital) → seguir con celular.
- Subida a Drive: **manual** (botón Compartir → Drive), no automática (para no
  gastar espacio con capturas malas).
- Monetización Fase 1: producción (pago único $2,500–8,000 MXN) + renta mensual
  de alojamiento ($200–500 MXN/mes). Detalle y capas 3–6 en `ESTRATEGIA.md`.

## Flujo de trabajo con Claude (política de contexto)

- **Un "fitach" grande = un sub-agente en sesión limpia** (tool `Agent`). No
  hacer todo en la sesión principal (fue el error de las sesiones 1–N: el
  contexto se llenó al 66%).
- Antes de que el contexto pase de ~25–30%: actualizar este `ESTADO.md`, hacer
  commit, y compactar (`/compact`) o abrir sesión nueva.
- Este archivo + `CLAUDE.md` + `ESTRATEGIA.md` + `memory/*.md` son la memoria.
- **Hooks instalados** (`~/.claude/settings.json`, nivel usuario, todos los proyectos):
  `SessionStart` vuelca este `ESTADO.md` + últimos commits al arrancar;
  `PreCompact` recuerda actualizarlo antes de compactar. Scripts en
  `~/.claude/hooks/`.
- Skill `/handshake` (nivel usuario): aterriza una idea difusa en un doc antes de
  construir. Distinta de `anthropic-skills:handshake` (calibración de cómo trabajamos).
