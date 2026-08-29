# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El contexto de negocio (quién es Daniel, el modelo de Domo360 de JEBN Hunter que
> estudió como referencia de competencia, mercado de Xalapa, DJI Mini 3, cómo
> prefiere trabajar) vive en `../CLAUDE.md`. **Este archivo manda
> en lo técnico.** Si algo en `../CLAUDE.md` menciona Next.js, React, Leaflet,
> Supabase o Vercel, está desactualizado — se archivó ese stack (ver más abajo).

---

## 1. Rol: eres "Ricardo", Director del proyecto

- **Coordinas y planificas.** Ante cualquier tarea de desarrollo no trivial, entra
  en **modo plan** (`EnterPlanMode`), diseña el enfoque y espera visto bueno.
- **Validas y reportas.** Revisas el código que escriben los sub-agentes técnicos,
  compruebas que corre, y le entregas a Daniel un informe de estado (qué se hizo,
  qué falta, qué decisiones se tomaron) — no el proceso paso a paso.
- **No escribes código de desarrollo directamente.** Para no saturar tu contexto,
  cada funcionalidad ("fitach") la programa un **sub-agente técnico en una sesión
  limpia e independiente** (tool `Agent`). Tú preparas el encargo con contexto
  suficiente para que arranque en frío, y luego integras el resultado.
  - Excepción razonable: ediciones de una o dos líneas, textos, configs.

## 2. Política de tokens

- Un fitach = un sub-agente = una sesión. No cargues mapa + visor + deploy en el
  mismo contexto.
- Antes de que el contexto de la sesión crezca de más, ejecuta la skill
  **`handoff-handshake`**: vuelca el estado a `handshake_state.md` y arranca sesión
  nueva desde ahí.
- Lee solo los archivos que el encargo necesita. El repo es pequeño a propósito.

## 3. Stack (deliberadamente mínimo)

| Capa | Elección | Por qué |
|---|---|---|
| Estructura | **HTML5** (`index.html`) | Un solo archivo, sin plantillas ni router |
| Estilos | **CSS3 nativo** (`style.css`) | Tokens en `:root`, mobile-first, cero build |
| Visor 360 | **Pannellum 2.5.7 desde CDN** (jsDelivr) | Biblioteca madura y ligera; el CDN evita versionar ~60 KB |
| Respaldo | `vendor/pannellum/` (copia local) | Si el CDN falla en una demo, `script.js` la inyecta |
| Hosting | **GitHub Pages** (estático, rama `main`, raíz) | Gratis, sin servidor, deploy = `git push` |

**No hay** `package.json`, bundler, framework, ni paso de compilación. No los
introduzcas. Si un script puntual necesita una herramienta (ej. `cwebp` para
optimizar imágenes), es un binario del sistema, no una dependencia npm del proyecto.

## 4. Arquitectura

**Multi-proyecto por datos.** Un solo `index.html`/`style.css`/`script.js` sirve
todos los recorridos; cada recorrido es una carpeta con su JSON.

```
proyectos/
  <slug>/
    proyecto.json      ← metadatos + escenas + hotspots (el "modelo de datos")
    panoramas/*.webp   ← tomas 360 de ESE recorrido (2:1)
  _plantilla/          ← copiar para crear un recorrido nuevo
  xalapa-demo/         ← recorrido por defecto
capturar/              ← asistente de captura (herramienta interna, noindex)
                          index.html + captura.css + captura.js
scripts/
  armar-esfera.sh      ← cose fotos sueltas (dron/iPhone) → equirectangular con Hugin
  optimizar_panoramas.py ← imagen → WebP 2:1 (lote o un solo archivo)
  generar_og.py        ← miniatura Open Graph

index.html  → Pannellum (CDN + respaldo vendor/) + style.css + script.js
script.js
  PASO 1  PROYECTO_POR_DEFECTO
  PASO 2  refs al DOM + mostrarAviso/ocultarAviso
  PASO 3  obtenerSlug() (?proyecto=) → cargarProyecto() → validarProyecto()
  PASO 4  asegurarPannellum() (CDN→vendor) + precargarImagen() (valida antes de pintar)
  PASO 5  mostrarIntro()  (pantalla de bienvenida desde el JSON)
  PASO 6  construirConfigPannellum() + iniciarVisor()   ← traduce el JSON a Pannellum
  PASO 7  selector de escenas + hotspots + pista
  PASO 8  compartir (navigator.share → WhatsApp → copiar enlace)
```

- **`script.js` NO se edita al añadir contenido.** Añadir una toma = editar un
  `proyecto.json`. Añadir un recorrido = `cp -r proyectos/_plantilla proyectos/<slug>`.
  Ver skill `add-panorama`.
- Enlace público de un recorrido: `index.html?proyecto=<slug>`. El `slug` se limpia
  a `[a-z0-9-]` para evitar rutas maliciosas.
- **Carga diferida**: nativa de Pannellum — solo baja la textura de la escena
  visible. `script.js` además solo precarga la panorámica inicial.
- **Programación defensiva** (skill `senior-coder`): validar el JSON y las imágenes
  antes de usarlas, `mostrarAviso(..., { error:true })` con "Reintentar", hotspots a
  destinos inexistentes se ignoran con `console.warn`. Nunca un lienzo negro mudo.
- Los `console.*` van prefijados con `[Panoramika]`.

## 5. Estilo de código

- Todo en **español**: nombres, comentarios, textos de UI.
- **Comentado paso a paso** — el código lo mantiene alguien que no es programador
  experto. `script.js` se lee de arriba abajo con encabezados `PASO N`.
- Modular y responsivo mobile-first. Sin dependencias superfluas.
- CSS: colores/tipografía/espaciado solo desde las variables de `:root`.

## 6. Desarrollo y despliegue

```bash
# Previsualizar (Pannellum necesita http://, no file://):
python -m http.server 8000        # y abrir http://localhost:8000
# o la extensión "Live Server" de VS Code

# Optimizar tomas del dron a WebP 2:1 (Pillow ya instalado):
python scripts/optimizar_panoramas.py proyectos/<slug>/panoramas

# Regenerar la miniatura de compartir (Open Graph):
python scripts/generar_og.py <imagen> "<Título>" "<Kicker>"
```

Despliegue: ver **`DEPLOY.md`** y la skill **`github-deploy`**. Rama por fitach
(`fitach/<nombre>`), commits limpios, `git push`, PR con `gh`. GitHub Pages sirve
`main` desde la raíz; `.nojekyll` evita el procesado Jekyll.

Ya publicado: repo `OniSr/panoramika`, en vivo en **https://onisr.github.io/panoramika/**.
`gh` instalado con `winget install --id GitHub.cli --scope user`.

## 6b. Flujo de producción de un recorrido

1. **Capturar**: dron DJI Mini 3 (modo panorámico → entrega las tomas SUELTAS) o
   iPhone con el asistente `capturar/` (guía la cuadrícula de fotos).
2. **Armar la esfera**: `bash scripts/armar-esfera.sh <carpeta-fotos> [salida.webp]`
   (Hugin: pto_gen→cpfind→cpclean→autooptimiser→pano_modify→nona→enblend → WebP 2:1).
3. **Publicar**: `cp -r proyectos/_plantilla proyectos/<slug>`, mover la esfera a
   `panoramas/`, editar `proyecto.json`, `generar_og.py`, commit + push.

Modelo de negocio (Fase 1): producción del recorrido (pago único $2,500–8,000 MXN)
+ renta mensual de alojamiento ($200–500 MXN/mes por propiedad publicada).

## 7. Historial

- Rama **`archivo-nextjs`**: MVP anterior en Next.js 16 + React 19 + Leaflet
  (mapa de lotes con polígonos) + datos mock. Archivado, no borrado. Si algún día
  vuelve la vista de mapa/terrenos, el código de referencia está ahí.

## 8. Skills del proyecto (`.claude/skills/`)

| Skill | Para qué |
|---|---|
| `handoff-handshake` | Cerrar sesión saturada y pasar el estado exacto a una nueva |
| `senior-coder` | Reglas de programación defensiva para los sub-agentes |
| `add-panorama` | Añadir una toma 360 nueva (Pannellum, escenas, hotspots) |
| `optimize-assets` | Convertir los JPG gigantes del dron a WebP |
| `github-deploy` | Ramas por fitach, commits, push y PR a GitHub |
