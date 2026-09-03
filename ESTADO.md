# ESTADO — Panorámika

> Punto de traspaso entre sesiones. Una sesión nueva lee **esto + CLAUDE.md +
> ESTRATEGIA.md** y ya puede continuar sin releer el chat. Se actualiza al cerrar
> cada sesión o antes de compactar contexto. Última actualización: **2026-09-01**.

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

**Proyectos (limpieza 2026-09-02 — commit 0ac4b45):**
- **`depto-lagos`** — LA propiedad-portafolio real (depa de Daniel cerca del Paseo
  de los Lagos). 4 escenas en secuencia: `aerea` (Los Lagos) → `exterior` (video)
  → `cocina` (v17) → `cuarto` (v15). Es `PROYECTO_POR_DEFECTO`.
  - PENDIENTE: ajustar la mira/hotspot de la `aerea` al edificio real (ahora
    apunta a un punto cualquiera). La aérea sale algo OSCURA — subir exposición.
- **`animas`** (público) — Fraccionamiento Las Ánimas (familia de Daniel, ~166
  lotes). ARMADO SIN PULIR (commit 466f307): escena `mapa` (plano de lotificación
  + 2 polígonos PROVISIONALES) + `aerea` (video, recorte 17-45s del dron) + 5
  esferas 360 (P1/PC/PG/CD/EI). **Pendiente:** trazar los lotes reales con
  `?proyecto=animas&editar=1`, ajustar hotspots, capa disponible/vendido (el
  plano viene coloreado por DUEÑO), grado de color.
- **`bodegas`** (público) — 2 esferas (BODEGAYE + PLAZAYE), bodegas en renta.
  Falta la toma con el cartel.
- **`watusco-raul`** / **`watusco-sergio`** (privados, segundo plano) — terrenos
  de los tíos en Huatusco. 1 y 2 esferas. Faltan 360 dentro del lote + contexto.
- **Todas las esferas del dron salieron OSCURAS** (Mini 3 midió para el cielo) →
  se les subió sombras (gamma 0.68). Para los finales, gradado parejo de Daniel.
- **`demo-lotes`** / **`demo-recorrido`** — demos internas de las funciones
  `mapa-lotes` y `video`. Privadas.
- **Selector de propiedades** (`?v=4`, PASO 7b): menú "Propiedades ▾" arriba a la
  izquierda del visor; lista las `publico:true` de `proyectos/proyectos.json`.
- BORRADOS: `xalapa-demo` (etiqueta falsa "Terreno en Las Ánimas" — NO existe tal
  terreno), `prueba-v14/v15/v15-cocina/v17-sala` (pruebas de pipeline; su .webp
  útil pasó a `depto-lagos`).
- **NO hay "Terreno en Las Ánimas".** Si aparece en el portafolio, es de la etapa
  vieja — borrar.

## Estado de cada frente

### Asistente de captura — `capturar/` (v17, en vivo tras push)
- **v17 (commit 01fe1ea)**: `MS_PARA_DISPARAR` 500→900 ms — Daniel veía fotos
  algo borrosas; sostener la alineación más tiempo deja que el teléfono se
  asiente antes de capturar. Cache-bust `?v=17`.
- **v16 (commit f3f7653) — INDICADOR DE NIVEL**: barra tipo burbuja bajo el
  contador en la pantalla de captura. Reusa `derZ` (PASO 4), sin listener nuevo:
  `rollGrados = asin(derZ)`. Verde y discreta a plomo (|roll| ≤ 2°), ámbar +
  "Endereza el teléfono" al inclinarse. **UI pura y aditiva** — no toca `FILAS`,
  `PASO_YAW`, `escucharOrientacion()`, permisos, disparo ni compartir. **Signo de
  la burbuja verificado en el iPhone de Daniel** (cae al lado correcto).
- **v15 (commit 7f5b518) — 3 FILAS 0/+40/−40**: en v14 (2 filas ±28°) los
  objetos CERCANOS al horizonte (escritorio con monitor) se PARTÍAN — el pitch 0°
  caía en la costura entre filas y el paralaje rompía el blend. Fix estilo
  Teleport/Polycam: **anillo de NIVEL (0°) como fila principal** que cubre todo
  el horizonte y los muebles de una pasada, sin costura; +40°/−40° solo rellenan
  techo y piso (donde el paralaje molesta menos). **16 disparos/fila × 3 = 48
  fotos.** Paso 22.5° sin tocar. `?v=15`.
- **v15 PROBADO (captura "15" de Daniel, 48 fotos → `?proyecto=prueba-v15`)**:
  el **escritorio con el monitor YA NO se parte** — la fila de nivel arregló la
  costura. La vuelta cierra, cobertura vertical llena. Sigue habiendo warp en
  objetos MUY cercanos (el closet pegado a la cámara se dobla) — paralaje puro,
  no lo arregla el software. Ligera inclinación (falta el indicador de nivel +
  pulso de Daniel). Algo de fantasma bajo el escritorio (había alguien en la
  cama que se movió entre pasadas).
- **COCINA v17 PROBADA (`?proyecto=prueba-v15-cocina`, 40 fotos SOBRE la barra)**:
  **la mejor esfera interior hasta ahora.** Poner el tripié POR ENCIMA de la barra
  arregló la esquina del mueble/escritorio/paso a la sala que en v15 se "comía"
  (la barra tapaba esa dirección). Monitor entero, alacena y paso legibles, la
  vuelta cierra. El asistente perdió 8 disparos (de 48) y no importó — ver abajo.
- **SALA v17 (`?proyecto=prueba-v17-sala`, 48 fotos)**: el cosido ARMA (sembrado +
  fallback de costuras simples), geometría sana, PERO el cuarto está lleno de
  cajas de mudanza → **no es imagen vendible**. Sirve para validar el pipeline.
  Re-tomar cuando esté despejado; en paredes grandes y lisas colgar algo (cuadro,
  planta) para que Hugin tenga puntos que enganchar.
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
- Modo **"patrón asistente"** (autodetecta **30–50** fotos sin EXIF;
  `PATRON=asistente` / `PATRON=ciego` / `PATRON=v15`): **siembra** yaw/pitch de
  cada foto con `pto_var --set` antes de `cpfind --prealigned`.
  - **La posición sale del NÚMERO del nombre** (`IMG_2468`…), no del orden: si el
    asistente pierde disparos, los huecos se respetan y las demás fotos quedan en
    su yaw/pitch real. Cae a orden secuencial si los nombres no traen número.
  - nº de filas = (posición_máxima // 16) + 1 → **3 → 0/+40/−40 (v15)**, 2 → ±28
    (v14). yaw = columna × 22.5°.
  - **enblend con fallback**: si aborta con "degenerate mask geometry" (paredes
    lisas), reintenta con `--primary-seam-generator=nearest` (costuras simples).
  `FOV_CAMARA=95` (gran angular, afinar con la var de entorno); optimiza
  `y,p,r,b` (`pto_var --opt` + `autooptimiser -n`). **NUNCA** `-a` ni liberar `v`
  (degeneran la esfera). **`b` (distorsión de barril) es clave** para el gran
  angular: sin él, paredes/piso ondulados (RMS ~50); con él, derecha (probado).
  NO usar `pano_modify --straighten` (se probó, EMPEORA: arrastra el techo mal
  cubierto al centro).
- **`scripts/tapar_polos.py`** (nuevo): tapa nadir (disco con glifo de marca) +
  cenit (relleno con el color del techo real: promedia solo el **tercio más
  brillante** de la franja de muestreo, porque las sombras de las costuras
  infladas del techo ensuciaban el promedio simple). `--cenit-color R,G,B` fuerza
  el color a mano.
  Uso: `python scripts/tapar_polos.py <esfera.webp> <final.webp> [--nadir-grados N]
  [--cenit-grados N] [--texto "..."]`. **Por defecto SIN texto** (solo el glifo):
  el texto curvado sale espejado por la proyección polar — `_texto_en_arco` está
  a medias, hay que afinarlo MIRÁNDOLO en el visor (no a ciegas).
- **Flujo de producción v15/v16 completo**:
  1. Capturar con `capturar/` (gran angular, tripié al centro, 48 fotos)
  2. `bash scripts/armar-esfera.sh <carpeta> <esfera.webp>` (detecta 48 → 3 filas)
  3. `python scripts/tapar_polos.py <esfera.webp> <final.webp> --nadir-grados 26 --cenit-grados 36`
     (`--cenit-color R,G,B` si el techo sale de un color raro)
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

> ### ▶ PLAN PARA HOY (acordado 2026-09-01, se ejecuta el 2026-09-02)
> **Objetivo: publicar la maqueta demo de un fraccionamiento real y salir a vender.**
>
> **Daniel:**
> 1. **Vuela 1 esfera 360 de MUESTRA** con el dron (~20 m) — en Valle Dorado desde
>    la carretera Alto Lucero, o en cualquier baldío en zona de dron legal (lejos
>    de El Lencero; checar DJI Fly). Sube las tomas sueltas a Drive.
> 2. Elige el fraccionamiento para la demo (**Valle Dorado / Raíz Noble**,
>    `ESTRATEGIA.md` §10). Screenshot de **Google Earth satélite** de esa zona.
> 3. Lista ~15-20 lotes: número, estatus (mayoría disponible, 2-3 apartado, 2-3
>    vendido), precio ($65k contado / $85k financiado), m² (120 / 8×15).
>
> **Ricardo (sesión nueva):**
> 4. Cose la esfera de muestra (`armar-esfera.sh`, modo ciego/dron).
> 5. `cp -r proyectos/_plantilla proyectos/valle-dorado-demo`; mete la imagen de
>    Google Earth como `mapa/aerea.webp`; escena `"tipo":"mapa-lotes"`.
> 6. Daniel traza los lotes con `?proyecto=valle-dorado-demo&editar=1` → "Copiar
>    JSON" → Ricardo pega y ajusta datos; 2-3 lotes con `"escena"` → la esfera de
>    muestra. Publicar.
> 7. Daniel manda el WhatsApp a los 5 prospectos (`ESTRATEGIA.md` §10) con el link.
>
> **Oferta a comunicar:** mapa interactivo de TODOS los lotes + 360 de los que
> quieran destacar (NO uno por lote). Entrada: 1º al costo ~$6-8k flat.

> **Giro de rumbo (sep 2026):** el producto es *visualización de propiedades*, no
> "un 360". Paquete = aérea + video recorrido + 360 de espacios héroe + foto +
> página de marca. Ver `ESTRATEGIA.md` §2b. No hay clientes; prioridad = arrancar
> a vender **terrenos/lotes en Xalapa** con portafolio demo. Plan y prospectos
> concretos (contactos, pitch, entrada de precio): `ESTRATEGIA.md` §10.

> **Cambio de herramienta de captura interior (sep 2026):** dejamos de pelear el
> asistente `capturar/` propio. Daniel captura interiores con **Travvir** (~$5
> USD/mes) o **Teleport** (gratis) — cosen en el teléfono y exportan la
> equirectangular. El pipeline solo hace WebP + `proyecto.json` + publicar (salta
> Hugin). El asistente propio y las mejoras (poses.json, guía) quedan para "algún
> día". El dron sí sigue con `armar-esfera.sh` (aéreo cose confiable).

### Alturas de dron para 360 de lotes
- **Overview**: 60–100 m sobre el centro del fraccionamiento → 1 escena inicial.
- **Por lote**: 15–25 m sobre cada lote → límites, vecinos, acceso y **la vista**.
- Evitar < 10 m (viento de hélices, sales en cuadro) y > 120 m (techo legal AFAC).
- Hora dorada. Cada 360 = una escena; hotspots lote↔lote.

### Legal dron — El Lencero (antes de facturar)
- México: prohibido volar a < 9.2 km de aeropuerto controlado sin plan de vuelo +
  autorización AFAC. **El Lencero** está en Emiliano Zapata (SE de Xalapa, ~13 km
  del centro). Zonas al SE/S de Xalapa (Las Cruces, hacia Coatepec) pueden caer
  dentro; NW/N (Las Ánimas, Alto Lucero) probablemente libres.
- **Chequeo práctico:** abrir **DJI Fly** en las coordenadas del lote y ver la
  zona GEO (verde/amarillo/rojo). El Mini 3 (249 g) igual respeta la zona.
- Para **cobrar** (uso comercial): registrar el dron en AFAC.

### Fitachs
1. **Escena tipo "video" en el visor ✅** (commit 8301a5d). `"tipo":"video"` +
   `"video"` (URL YouTube/Vimeo o `.mp4` local). Chip `▶`. `visor.resize()` al
   volver. Demo: `?proyecto=demo-recorrido`.
2. **Página portafolio ✅** (commit 420c36b). `portafolio.html` en vivo.
3. **Escena tipo "mapa-lotes" ✅ (LA MAQUETA)** (commit 72ed71c). `"tipo":"mapa-lotes"`
   + `"imagen"` (aérea) + `"lotes"` (polígonos en % de la imagen, `estatus`
   disponible/apartado/vendido, `m2`/`precio`/`nota` opcionales, `escena` opcional
   para saltar a un 360). Toca un lote → panel con datos + botón "Ver en 360".
   Leyenda + zoom. **`?editar=1`** = editor: clic pone vértices, "Copiar JSON"
   vuelca los `lotes` listos para pegar. Demo: `?proyecto=demo-lotes` (y
   `&editar=1`). Cache-bust del visor ahora `?v=3`. Esquema en skill `add-panorama`.
4. **Comprar dominio** (`panoramika.mx` / `.com.mx`) — lo paga Panorámika (§8).
   PENDIENTE.
5. **Poner contacto real** en `portafolio.html` (WhatsApp + correo, `TODO(Daniel)`).

### Flujo para armar una maqueta de lotes (para vender a lotificadores)
1. Imagen base: screenshot de **Google Earth satélite** de la zona (o aérea del
   dron después). Optimizar → `proyectos/<slug>/mapa/aerea.webp`.
2. `cp -r proyectos/_plantilla proyectos/<slug>`, editar `proyecto.json`: 1 escena
   `"tipo":"mapa-lotes"` con `"imagen"` y `"lotes": []`.
3. Abrir `index.html?proyecto=<slug>&editar=1` → trazar cada lote clic a clic →
   "Copiar JSON" → pegar en `lotes`. Ajustar `estatus`/`precio`/`m2`/`nota` a mano.
4. commit + push. Enlace: `?proyecto=<slug>`.
4. **Daniel**: completar el depa portafolio con Travvir/Teleport + re-tomar la
   sala despejada. Video del exterior ya recibido y transcodificado.
5. **FITACH (opcional) — `armar-esfera.sh` aún más robusto:** ya tolera disparos
   perdidos + fallback de costuras; falta avisar qué dirección quedó sin cobertura.
6. Afinar texto curvado del nadir en `tapar_polos.py` (baja prioridad).
7. Reemplazar placeholders de `depto-lagos`; ajustar marcador en la aérea.
8. Después (tipo "La Rosa"): PLANO 2D, **selector de lotes/polígonos**
   (`archivo-nextjs`) ← esto es la "maqueta interactiva" que piden los
   lotificadores, prioridad sube; toggle amueblado/vacío, transiciones finas.
9. Marketing: embudo social + portafolio demo impecable como carta.

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
