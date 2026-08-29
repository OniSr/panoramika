# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El contexto de negocio (quién es Daniel, modelo Domo 360, mercado de Xalapa,
> DJI Mini 3, cómo prefiere trabajar) vive en `../CLAUDE.md`. **Este archivo manda
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

```
index.html   ──carga──>  Pannellum (CDN, con respaldo en vendor/)
     │                    style.css   (tokens de diseño + layout responsivo)
     │                    script.js
     ▼
script.js
  PASO 1  const ESCENAS = [...]        ← ÚNICO lugar que se edita al añadir tomas
  PASO 2  refs al DOM + mostrarAviso/ocultarAviso
  PASO 3  asegurarPannellum()  → CDN o /vendor/ como fallback
          precargarImagen()    → valida la panorámica antes de pintarla
  PASO 4  construirConfigPannellum()   ← traduce ESCENAS al formato de Pannellum
  PASO 5  iniciarVisor() + selector de escenas + hotspots + pista de arrastre
     ▼
assets/panoramas/   tomas 360 (2:1, .webp preferido).  _raw/ = originales del
                    dron, en .gitignore (respaldo local, no se sube)
```

- **`ESCENAS`** en `script.js` es el "modelo de datos" actual. Cada entrada:
  `{ id, titulo, panorama, hotspots: [{ yaw, pitch, destino, texto }] }`.
- **Carga diferida**: nativa de Pannellum — solo descarga la textura de la escena
  visible; las demás se piden al saltar.
- **Programación defensiva** (ver skill `senior-coder`): validar imágenes antes de
  usarlas, mensajes de error visibles (`mostrarAviso(..., { error:true })`), nunca
  un lienzo negro sin explicación.

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

# Optimizar tomas del dron a WebP:
bash scripts/optimizar-panoramas.sh
```

Despliegue: rama por fitach (`fitach/<nombre>`), commits limpios, `git push`, PR
con `gh`. Ver skill **`github-deploy`**. GitHub Pages sirve `main` desde la raíz;
`.nojekyll` evita el procesado Jekyll.

**Pendiente de Daniel:** `gh` (GitHub CLI) no está instalado —
`winget install --id GitHub.cli` y `gh auth login`. Sin eso no se puede crear el
repo remoto ni activar Pages.

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
