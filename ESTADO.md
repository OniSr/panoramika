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

### Asistente de captura — `capturar/` (v10, en vivo tras push)
- **Pantalla final (v9, commit 5221165)**: compartir a Drive desde el navegador
  iOS NUNCA fue fiable. Ahora **un solo `navigator.share` con todas las fotos** →
  "Guardar imágenes" al carrete → Daniel las sube a Drive desde la app Fotos (ese
  flujo sí funciona). Fuera las tandas de 8 y el bucle de descargas.
- **Captura v10 (commit 4ec95df) — "paso denso"**: v6/v7/v8 fallaban todas igual.
  Diagnóstico cerrado con la prueba real "Cuarto lagos 3" (26 fotos v8): entre
  fotos consecutivas de una fila → **0 puntos de control** en Hugin (traslape
  horizontal nulo). Re-armar con FOV 50 vs 63 no cambió nada → el FOV no era la
  causa, el **paso de giro de 45° era demasiado grande**.
  - v10: `PASO_YAW` 45 → **22.5** (16 disparos/fila, **50 en total**), filas
    inclinadas ±33 → ±40, polos ±82 → ±72, tolerancias más flojas
    (`TOL_YAW`/`TOL_PITCH` 10, `MS_PARA_DISPARAR` 500). Giro relativo de v8 intacto.
  - Tips + `.recordatorio` anti-paralaje (girar sobre los pies, no mover brazos —
    los "fantasmas" de la esfera vienen de mover la cámara de sitio).
- Fotos salen del `<canvas>` del video: **2160×4032, sin EXIF**.
- **PENDIENTE: Daniel recaptura un cuarto con v10** y se re-arma la esfera. Si
  aún sale con pocos puntos de control en las filas horizontales, el siguiente
  paso NO es tocar parámetros: es **sembrar un `.pto` con las posiciones
  yaw/pitch que el asistente ya conoce** (en vez de que `cpfind` adivine) — pero
  eso choca con el flujo "guardar al carrete" (se pierden nombres/sidecar); habría
  que resolver cómo pasar los ángulos junto a las fotos.
- Cache-bust: subir `?v=N` en `index.html` (css y js) y en `<span class="version">`.
  Va en **v10**.

### Armado de esferas — `scripts/armar-esfera.sh` (funciona para dron; interior pendiente)
- Detecta lente: dron (modelo `FC*`) → 82°, iPhone/canvas (sin EXIF) → 63°
  (aproximado, da igual 50-63). Salida equirectangular 2:1 → `optimizar_panoramas.py`.
- El aéreo del dron de Los Lagos quedó **excelente** (5760×2880).
- **Interior aún sin validar**: las capturas v6 y v8 no cosían (problema de
  captura, no del script). Umbral de aviso de puntos de control subido a 40.

### Visor — navegación tipo Street View (v en vivo)
- Hotspots = marcadores con etiqueta (`tipo`: `propiedad` / `destino` / `salir`).
- Barra de escenas **siempre visible**, chips con ícono, contador "2/4 · Fachada".
- **PENDIENTE**: Daniel confirma cuál edificio es la propiedad en la aérea de
  `depto-lagos` (marcador ahora en yaw 8, pitch -40, estimado) → ajustar en
  `proyectos/depto-lagos/proyecto.json`.

## Próximas tareas (orden sugerido)

1. **Daniel recaptura un cuarto con captura v10** (paso denso, 50 fotos) → re-armar
   la esfera y ver si ahora cose. Cuarto con textura; girar sobre los pies.
2. Reemplazar placeholders de `depto-lagos` por fotos reales (fachada + cuartos).
3. Ajustar posición del marcador de la propiedad en la aérea.
4. **Tapar el nadir** (hueco de abajo) con el logo — script o imagen.
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
