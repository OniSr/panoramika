# ESTADO — Panorámika

> Punto de traspaso entre sesiones. Una sesión nueva lee **esto + CLAUDE.md +
> ESTRATEGIA.md** y ya puede continuar sin releer el chat. Se actualiza al cerrar
> cada sesión o antes de compactar contexto. Última actualización: **2026-08-31**.

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

### Asistente de captura — `capturar/` (v14, en vivo tras push)
- **Pantalla final (commit 5221165)**: compartir a Drive desde iOS NUNCA fue
  fiable. Ahora **un solo `navigator.share` con todas las fotos** → "Guardar
  imágenes" al carrete → Daniel las sube a Drive desde Fotos. Sin tandas.
- **Diagnóstico del stitching (cerrado)**: v6/v7/v8 no cosían — paso de giro 45°
  dejaba **0 puntos de control** entre fotos seguidas. Solución: **paso chico**.
  v12 (paso 30°) NO cerraba la vuelta: 12 disparos taparon ~220° (el giroscopio
  de iOS se adelanta con pasos grandes). **22.5° es el único paso probado que
  cierra la vuelta** (v11 lo hizo). NO subirlo.
- **Bugs ya resueltos (v11)**: verticalidad (`acostado = |derZ| > sin45°`, no
  `e.gamma`); diana (**proyección gnomónica** `proyectarObjetivo()`, PASO 5).
- **Piezas que NO se tocan**: matriz W3C con 3 ejes en `escucharOrientacion()`,
  giro relativo (`objetivoYaw = yaw real anterior + PASO_YAW`), 2 botones de
  permiso + `requestPermission()` síncrono, brújula descartada.
- **v14 (este commit) — LENTE GRAN ANGULAR**: copia de Teleport/Polycam. En
  `#btnPermCamara`: `getUserMedia` temporal → `enumerateDevices` → busca el lente
  ultra-wide por **etiqueta** (`ETIQUETAS_GRAN_ANGULAR`, prioriza las que digan
  "ultra") → reabre con `deviceId:{exact}`. Si falla, sigue con el normal y
  muestra `#avisoLente` (no bloqueante). `console.log("[Panoramika] lente:…")` en
  `loadedmetadata` para **calibrar el FOV real**.
  - Geometría: **2 filas a pitch ±28°**, 16 disparos, paso 22.5° = **32 fotos**.
    `POLOS = []`. `FOV_GUIA_H/V` = 90/110 (estimado gran angular retrato).
  - El gran angular NO baja el conteo (las apps hacen 16 con ARKit, que la web no
    tiene) — mejora traslape/robustez del cosido y achica los cascos a ~±7-12°.
- Fotos del `<canvas>` del video: **2160×4032, sin EXIF**.
- **v14 PROBADO — el gran angular SÍ funciona** (captura "V14" de Daniel, 32 fotos):
  agarró el ultra-wide, la vuelta cerró (360° completo, sin cuña), cobertura
  vertical llena. Es la mejor esfera interior de toda la saga. Navegable:
  `?proyecto=prueba-v14`.
- **PENDIENTE (Daniel dijo)**: 1 captura más en el cuarto tomando el teléfono
  DERECHO (la esfera salía algo inclinada), luego probar la COCINA.
- Cache-bust: `?v=14` en `index.html` (css y js) + `<span class="version">`.
- **v15 pendiente**: indicador de nivel (barra tipo burbuja, verde a ±2°) —
  reusa `derZ` que ya se calcula, es UI pura, no rompe nada. Daniel lo pidió.

### Armado de esferas — `scripts/armar-esfera.sh`
- Modo **CIEGO** (dron / fotos con EXIF): `pto_gen → cpfind --multirow → cpclean →
  autooptimiser -a -m -l -s`. El aéreo del dron cose **excelente** así — NO tocar.
- Modo **"patrón asistente"** (autodetecta 32 fotos sin EXIF; `PATRON=asistente` /
  `PATRON=ciego` / `PATRON=v14`): **siembra** yaw/pitch de cada foto (16 a +28°,
  16 a −28°; yaw = pos×22.5°) con `pto_var --set` antes de `cpfind --prealigned`;
  `FOV_CAMARA=95` (gran angular, afinar con la var de entorno); optimiza
  `y,p,r,b` (`pto_var --opt` + `autooptimiser -n`). **NUNCA** `-a` ni liberar `v`
  (degeneran la esfera). **`b` (distorsión de barril) es clave** para el gran
  angular: sin él, paredes/piso ondulados (RMS ~50); con él, derecha (probado).
  NO usar `pano_modify --straighten` (se probó, EMPEORA: arrastra el techo mal
  cubierto al centro).
- **`scripts/tapar_polos.py`** (nuevo): tapa nadir (disco con glifo de marca) +
  cenit (relleno con el color del techo real, muestreado por debajo del hueco).
  Uso: `python scripts/tapar_polos.py <esfera.webp> <final.webp> [--nadir-grados N]
  [--cenit-grados N] [--texto "..."]`. **Por defecto SIN texto** (solo el glifo):
  el texto curvado sale espejado por la proyección polar — `_texto_en_arco` está
  a medias, hay que afinarlo MIRÁNDOLO en el visor (no a ciegas).
- **Flujo de producción v14 completo**:
  1. Capturar con `capturar/` v14 (gran angular, tripié, 32 fotos)
  2. `bash scripts/armar-esfera.sh <carpeta> <esfera.webp>` (detecta el patrón solo)
  3. `python scripts/tapar_polos.py <esfera.webp> <final.webp> --nadir-grados 22 --cenit-grados 24`
  4. `python scripts/optimizar_panoramas.py` si hace falta re-comprimir, mover a
     `proyectos/<slug>/panoramas/`, editar `proyecto.json`, commit+push.
- **OJO**: `scripts/generar_og.py` SOBREESCRIBE `assets/og-imagen.jpg` (la imagen
  OG del sitio). NO usarlo con fotos de prueba — o revertir después.

### Visor — navegación tipo Street View (v en vivo)
- Hotspots = marcadores con etiqueta (`tipo`: `propiedad` / `destino` / `salir`).
- Barra de escenas **siempre visible**, chips con ícono, contador "2/4 · Fachada".
- **PENDIENTE**: Daniel confirma cuál edificio es la propiedad en la aérea de
  `depto-lagos` (marcador ahora en yaw 8, pitch -40, estimado) → ajustar en
  `proyectos/depto-lagos/proyecto.json`.

## Próximas tareas (orden sugerido)

1. **Daniel: 1 captura v14 más en el cuarto** (teléfono derecho) + probar la
   COCINA. Armar ambas con el flujo v14 y juzgar calidad.
2. **v15: indicador de nivel** en `capturar/` (UI pura, reusa `derZ`).
3. Afinar el texto curvado del nadir en `tapar_polos.py` mirándolo en el visor
   (baja prioridad — el glifo solo ya se ve bien).
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
