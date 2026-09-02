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

## Escena de tipo "video" (recorrido caminando / aéreo, no una 360)

Una escena puede ser un video en vez de una panorámica. Se distingue por
`"tipo": "video"` y vive en la misma barra de escenas (chip con ícono ▶):

```json
{
  "id": "exterior",
  "titulo": "Exterior",
  "tipo": "video",
  "video": "https://www.youtube.com/watch?v=XXXX",
  "poster": "panoramas/exterior-poster.webp"
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `id`, `titulo` | `id` sí | igual que una escena normal |
| `tipo` | sí | debe ser `"video"` |
| `video` | sí | URL de YouTube (cualquier forma), URL de Vimeo, o ruta local a un `.mp4` **relativa a la carpeta del proyecto** (igual que `panorama`) |
| `poster` | no | imagen de portada; solo aplica al `.mp4` local |

- YouTube se incrusta vía `youtube-nocookie.com` (sin autoplay, sin videos de
  otros canales). Vimeo con `dnt=1`. El `.mp4` local usa `<video controls>`.
- Una escena de video **no lleva `hotspots`** (se ignoran con `console.warn`).
  Se navega desde la barra. Un hotspot de una escena 360 **sí** puede apuntar a
  una escena de video.
- Si `video` no es válido, esa escena se **omite** con aviso (no rompe el resto).
- El `<iframe>`/`<video>` se crea solo al abrir la escena (carga diferida).

## Escena de tipo "mapa-lotes" (maqueta interactiva de un fraccionamiento)

Foto aérea + un polígono por lote. Vive en la misma barra de escenas (chip ▦):

```json
{
  "id": "mapa",
  "titulo": "Mapa de lotes",
  "tipo": "mapa-lotes",
  "imagen": "mapa/aerea.webp",
  "leyenda": true,
  "lotes": [
    {
      "id": "A-12",
      "puntos": "12.5,20.1 30,20.1 30,44.8 12.5,44.8",
      "estatus": "disponible",
      "m2": 120,
      "precio": "$65,000",
      "nota": "8 x 15 m, a pie de calle",
      "escena": "lote-a12"
    }
  ]
}
```

| Campo | Obligatorio | Nota |
|---|---|---|
| `tipo` | sí | `"mapa-lotes"` |
| `imagen` | sí | foto aérea, ruta relativa a la carpeta del proyecto (no tiene que ser 2:1) |
| `leyenda` | no | `false` oculta la leyenda de colores; cualquier otra cosa la muestra |
| `lotes` | no | lista de polígonos (sin lotes = solo la foto) |
| `lotes[].id` | sí | etiqueta visible del lote |
| `lotes[].puntos` | sí | `"x,y x,y x,y …"` — vértices en **% de la imagen** (0 = borde izq./sup., 100 = der./inf.), mín. 3. Porcentaje = responsivo sin recalcular |
| `lotes[].estatus` | no | `disponible` \| `apartado` \| `vendido` (default `disponible`) |
| `lotes[].m2`, `precio`, `nota` | no | se muestran en el panel del lote |
| `lotes[].escena` | no | id de otra escena (una 360 de ese lote) → botón "Ver este lote en 360" |

- Un lote con `puntos` mal formados se ignora (aviso), los demás se pintan.
- `imagen` inválida → la escena se omite. `escena` inexistente → sin botón (aviso).
- **Editor**: abre `index.html?proyecto=<slug>&editar=1`, ve a la escena del mapa,
  haz clic en la foto para poner vértices, "Cerrar polígono" (pide un id),
  "Copiar JSON" copia el array `lotes` listo para pegar. Nunca se activa sin
  `?editar=1`.

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
