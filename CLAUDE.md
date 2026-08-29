# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> El contexto de negocio, el alcance de la v1 y las preferencias de trabajo de Daniel
> viven en `../CLAUDE.md` (carpeta padre). Este archivo cubre solo lo técnico del repo.

## Comandos

```bash
npm run dev      # servidor de desarrollo (Daniel lo corre; tú no lo lanzas)
npm run build    # build de producción — úsalo para verificar que compila
npm run lint     # eslint (flat config, eslint-config-next)
npm start        # sirve el build de producción
```

No hay suite de tests ni configuración de testing en el repo. No hay `npm test`.
Para verificar un cambio: `npm run build` + que Daniel lo mire en `npm run dev`.

Next.js **16.3.3** con React **19.2.8**. Esta versión de Next tiene breaking changes
respecto al conocimiento previo (ver `AGENTS.md`): antes de escribir código de Next,
lee la guía correspondiente en `node_modules/next/dist/docs/` (`01-app`, `03-architecture`).
Ejemplo ya presente en el código: `params` de una página es ahora `Promise<...>` y se
`await`ea (ver `app/tour/[cliente]/[proyecto]/page.tsx`).

## Arquitectura

Flujo de datos de una sola dirección, pensado para cambiar la fuente sin tocar la UI:

```
data/proyectos-mock.ts   (fuente de datos — HOY mock hardcodeado, MAÑANA Supabase)
        │  getProyecto(cliente, proyecto) / listarProyectos()
        ▼
lib/types.ts             (contrato: union Proyecto = ProyectoTerreno | ProyectoPropiedad)
        ▼
app/tour/[cliente]/[proyecto]/page.tsx   (server component; await params; notFound() si no existe)
        │  switch por proyecto.tipo
        ├── "terreno"   → components/TerrenoMap.tsx
        └── "propiedad" → components/PanoramaViewer.tsx
```

Puntos clave:

- **`lib/types.ts` es el contrato.** La migración a Supabase debe llenar estos mismos
  tipos; si los componentes siguen recibiendo `ProyectoTerreno` / `ProyectoPropiedad`
  igual, no hay que reescribir UI. No cambies estas interfaces sin una razón fuerte.
- **`proyecto.tipo`** (`"terreno"` | `"propiedad"`) es el discriminador de la union y
  decide qué visor se renderiza. Un proyecto es un mapa de lotes **o** un recorrido 360,
  no ambos.
- **Rutas:** cada proyecto es una URL pública compartible `/tour/{cliente}/{proyecto}`,
  sin login del cliente final. `/` lista los proyectos demo.
- **Coordenadas:** todo en `[lat, lng]` (orden de Leaflet, no GeoJSON). `bounds` de la
  imagen aérea es `[[latSur, lngOeste], [latNorte, lngEste]]`. Son coordenadas reales
  de Xalapa (~19.53, -96.93).

### Los dos visores

**`TerrenoMap.tsx` / `TerrenoMapClient.tsx`** — Leaflet vía `react-leaflet`.
- Split en dos archivos a propósito: Leaflet toca `window` al importarse, así que
  `TerrenoMap` hace `dynamic(() => import("./TerrenoMapClient"), { ssr: false })`.
  Todo componente nuevo que use Leaflet va dentro del cliente, no del wrapper.
- Hoy: `ImageOverlay` (foto aérea) + un `Polygon` por lote, color por `estatus`
  (verde/amarillo/rojo). **Pendiente (tarea inmediata en `../CLAUDE.md`):** capa base
  satelital real detrás del overlay — evaluar Esri World Imagery (gratis, sin API key)
  vs Mapbox (requiere token). Dilo antes de implementar.
- Overlays de UI (leyenda, panel de lote) van sobre el mapa con `z-[1000]` — Leaflet
  usa z-index altos internamente.

**`PanoramaViewer.tsx`** — Pannellum vanilla, NO el paquete npm.
- El paquete `pannellum-react` se descartó (exige React 16, choca con React 19).
- La librería se carga como script estático desde `public/vendor/pannellum/`
  (`pannellum.js` + `pannellum.css`) vía `next/script` con `strategy="afterInteractive"`,
  y se habla con ella por `window.pannellum` una vez que `onLoad` marca `scriptListo`.
- El viewer se crea una sola vez en un `useEffect` y se `destroy()`ea en el cleanup.
  Las escenas y hotspots del tipo `Escena` se traducen a la config de Pannellum ahí.

## Estado actual: todo es demo

- `data/proyectos-mock.ts` — 2 proyectos hardcodeados (`demo/terreno-1`, `demo/casa-1`).
- `public/demo/*.jpg` — imágenes placeholder generadas por código (fondo verde con
  cuadrícula que dice "REEMPLAZAR"). **Es intencional, no es un bug.** Se sustituyen
  por fotos reales del DJI Mini 3 (aérea normal) y panoramas equirectangulares 2:1.
- Aún no hay Supabase, ni panel admin, ni Auth. Ese es el siguiente trabajo grande
  (ver alcance v1 en `../CLAUDE.md`).

## Convenciones

- **Idioma:** todo el código, nombres de variables, comentarios y UI en **español**.
  Mantén ese estilo.
- Import alias `@/*` → raíz del repo.
- Tailwind v4 (config vía `@import "tailwindcss"` en `app/globals.css`, sin
  `tailwind.config.js`).
- Comentarios: explican el *por qué* de decisiones no obvias (por qué el split de
  Leaflet, por qué Pannellum vanilla). Sigue esa densidad, no comentes lo obvio.
