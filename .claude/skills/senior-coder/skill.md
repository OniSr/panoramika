---
name: senior-coder
description: >-
  Reglas de desarrollo profesional para cualquier sub-agente técnico que escriba
  código en este proyecto (sitio estático HTML/CSS/Pannellum). Programación
  defensiva: validación de imágenes panorámicas, manejo elegante de errores de
  carga, y carga diferida para rendimiento. Léela antes de escribir o modificar
  código de un "fitach".
---

# Senior coder — manual de desarrollo profesional

Aplica a todo código de este repo. El proyecto lo mantiene alguien que no es
programador experto: el código debe ser **legible, comentado en español paso a
paso, y a prueba de fallos evidentes**.

## 1. Programación defensiva

### Imágenes panorámicas
- **Valida antes de usar.** Nunca pases una ruta de imagen directo a Pannellum sin
  comprobar que carga. Usa el patrón de `precargarImagen()` en `script.js`:
  `new Image()` + `onload`/`onerror` que devuelve una `Promise`.
- **Avisa de proporción incorrecta.** Una equirectangular debe ser 2:1. Si
  `naturalWidth / naturalHeight` se aleja de 2, `console.warn` con el nombre del
  archivo y sus medidas (no bloquees, pero deja rastro).
- **Nunca un lienzo negro mudo.** Si algo falla, el usuario ve
  `mostrarAviso(texto, { error: true })` con un mensaje claro y un botón para
  reintentar.

### Carga de la biblioteca
- Pannellum viene del CDN. Siempre comprueba `window.pannellum` y ten el fallback
  a `vendor/pannellum/` (patrón `asegurarPannellum()`). No asumas que el `<script>`
  del CDN cargó.

### Errores en general
- Envuelve el arranque en `.catch(...)` / `try…catch` y traduce el error a lenguaje
  de usuario. El detalle técnico va a `console.error("[Domo360]", err)`.
- Prefijo `[Domo360]` en todos los `console.*` para poder filtrar.
- Degradación elegante: si un hotspot apunta a un `destino` que no existe en
  `ESCENAS`, no rompas el visor — ignóralo con un `console.warn`.

## 2. Rendimiento

- **Carga diferida real.** No precargues todas las panorámicas. Pannellum solo baja
  la textura de la escena visible; respeta eso. Para miniaturas del selector, usa
  `loading="lazy"` en cualquier `<img>`.
- **Imágenes optimizadas.** El código asume `.webp` < 1.5 MB y proporción 2:1. Si
  recibes un original pesado, el flujo correcto es `optimize-assets`, no cargarlo
  crudo.
- **Sin librerías nuevas.** Cero npm, cero frameworks, cero polyfills salvo que
  Daniel lo apruebe. Si crees que hace falta una dependencia, propónlo primero.
- CSS: anima solo `opacity` y `transform` (baratas para el navegador). Respeta
  `@media (prefers-reduced-motion: reduce)`.

## 3. Estilo

- Español en nombres, comentarios y UI.
- `script.js` se lee de arriba abajo con encabezados `/* PASO N · … */`.
- Funciones pequeñas y con una sola responsabilidad. Nombra por lo que hacen
  (`construirSelector`, `alCambiarEscena`).
- Comenta el **porqué**, no el qué obvio. Explica cada decisión no trivial.
- CSS: nada de valores mágicos sueltos — usa las variables de `:root`.

## 4. Antes de entregar el fitach

- [ ] Probado en `http://localhost` (no `file://`) y en el emulador móvil de DevTools.
- [ ] Sin errores en consola.
- [ ] Funciona con el CDN bloqueado (fallback local).
- [ ] Layout sin scroll horizontal en 375 px de ancho.
- [ ] Código comentado y `CLAUDE.md` actualizado si cambió la arquitectura.
