---
name: add-panorama
description: >-
  Cómo añadir una toma 360 nueva o un recorrido/proyecto nuevo al visor: colocar
  la imagen optimizada, estructurar proyecto.json (escenas + hotspots), y probar.
  Cada recorrido es una carpeta en proyectos/<slug>/ y se abre con
  index.html?proyecto=<slug>. Úsala cuando Daniel quiera sumar una escena, un
  proyecto, enlazar tomas o ajustar un hotspot.
---

# add-panorama — añadir tomas y recorridos

## Arquitectura (recordatorio)

```
proyectos/<slug>/
  proyecto.json          ← metadatos + escenas + hotspots
  panoramas/*.webp       ← las tomas 360 de ESE recorrido (2:1)
```

`script.js` NO se toca: lee `?proyecto=<slug>` de la URL, descarga
`proyectos/<slug>/proyecto.json`, y arma el visor. Si no hay `?proyecto=`, usa
`PROYECTO_POR_DEFECTO` (`xalapa-demo`).

## A) Añadir una escena a un recorrido que ya existe

1. Optimiza la toma a la carpeta del proyecto:
   ```bash
   # deja el original en assets/panoramas/_raw/  y luego:
   python scripts/optimizar_panoramas.py proyectos/<slug>/panoramas
   ```
2. Abre `proyectos/<slug>/proyecto.json` y agrega un objeto a `escenas`:
   ```json
   {
     "id": "jardin",
     "titulo": "Jardín trasero",
     "panorama": "panoramas/jardin.webp",
     "miradaInicial": { "yaw": 0, "pitch": -5 },
     "hotspots": [
       { "yaw": 30, "pitch": -5, "destino": "sala", "texto": "Entrar a la sala" }
     ]
   }
   ```
3. Añade en las OTRAS escenas un hotspot con `"destino": "jardin"` para poder llegar.

## B) Crear un recorrido/proyecto nuevo

```bash
cp -r proyectos/_plantilla proyectos/<slug>     # slug: solo minúsculas, números y -
```

1. Pon las tomas optimizadas en `proyectos/<slug>/panoramas/`.
2. Edita `proyectos/<slug>/proyecto.json`:
   - `nombre`, `ubicacion`, `descripcion` → se ven en la pantalla de bienvenida.
   - `portada` → imagen de fondo de esa pantalla (una de las panorámicas).
   - `escenaInicial` → `id` de la escena con la que abre.
   - `escenas[]` → ver formato arriba.
3. Enlace para compartir: `.../index.html?proyecto=<slug>`

## Campos de una escena

| Campo | Obligatorio | Nota |
|---|---|---|
| `id` | sí | corto, sin espacios, único dentro del proyecto |
| `titulo` | no | texto del botón y de la barra; si falta usa `id` |
| `panorama` | sí | ruta relativa a la carpeta del proyecto |
| `miradaInicial` | no | `{ yaw, pitch }` hacia dónde mira al entrar |
| `hotspots` | no | lista de saltos a otras escenas |

## Colocar hotspots (yaw / pitch)

- **yaw**: horizontal, `-180..180`. `0` = centro de la foto, positivo gira a la derecha.
- **pitch**: vertical, `-90` (suelo) a `90` (cielo). A nivel de piso: `-2` a `-8`.
- Calibración rápida: abre el visor, apunta a donde quieres el hotspot y en la
  consola del navegador ejecuta `visor.getYaw(), visor.getPitch()`. Copia los valores.
- Si `destino` no existe en el proyecto, `script.js` ignora ese hotspot y deja un
  `console.warn` (no rompe el visor) — pero corrígelo, es un error de dato.

## Verificar (obligatorio antes de dar por hecho el fitach)

- Servir con `python -m http.server` (no `file://`).
- `index.html?proyecto=<slug>`: carga la bienvenida, "Iniciar" entra al visor,
  los hotspots saltan en ambos sentidos, el botón activo del selector se marca.
- Consola sin warnings de proporción (imagen 2:1) ni de `destino` inexistente.
- Probar en el emulador móvil de DevTools: sin scroll horizontal, hotspots
  tocables con el dedo.
- Probar `?proyecto=xxx` inexistente: debe mostrar el aviso de error, no una
  pantalla en blanco.
