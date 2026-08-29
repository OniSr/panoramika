---
name: add-panorama
description: >-
  Cómo añadir una toma panorámica 360 nueva al visor: colocar la imagen, inicializar
  o extender Pannellum, estructurar el objeto de ESCENAS y configurar los hotspots
  interactivos para saltar de una toma aérea a otra. Úsala cuando Daniel quiera
  sumar una escena, enlazar tomas, o ajustar la posición de un hotspot.
---

# add-panorama — integrar una toma 360

## 1. Preparar la imagen

1. El original del dron (cosido con DJI Fly / Microsoft ICE) va a
   `assets/panoramas/_raw/` (no se versiona).
2. Optimiza a `.webp` con la skill `optimize-assets`
   (`bash scripts/optimizar-panoramas.sh`). El resultado queda en
   `assets/panoramas/<nombre>.webp`.
3. Requisito duro: **proyección equirectangular, proporción 2:1**. Si el original
   no es 2:1, recórtalo antes (ver nota al final de `scripts/optimizar-panoramas.sh`).

## 2. Añadir la escena a `script.js`

En el **PASO 1** del archivo, agrega un objeto al array `ESCENAS`:

```js
{
  id: "jardin",                               // corto, sin espacios, único
  titulo: "Jardín trasero",                   // texto visible
  panorama: "assets/panoramas/jardin.webp",
  hotspots: [
    { yaw: 30, pitch: -5, destino: "sala", texto: "Entrar a la sala" },
  ],
},
```

- Para que abra en esta escena, cambia `ESCENA_INICIAL` a su `id`.
- No hay que tocar nada más: `construirConfigPannellum()`, el selector de botones y
  los eventos ya recorren `ESCENAS` en automático.

## 3. Cómo funciona la config de Pannellum

`construirConfigPannellum()` traduce cada entrada de `ESCENAS` a:

```js
scenes[id] = {
  type: "equirectangular",
  panorama: "<ruta>",
  autoLoad: true,
  hotSpots: [ { pitch, yaw, type: "scene", text, sceneId: "<destino>" } ],
};
```

Y el bloque `default` define escena inicial, fundido, `hfov` (campo de visión),
autorrotación de presentación, etc. Ahí se ajusta el comportamiento global.

## 4. Colocar hotspots (yaw / pitch)

- **yaw**: giro horizontal, `-180` a `180`. `0` mira al centro de la foto,
  valores positivos giran a la derecha.
- **pitch**: inclinación vertical, `-90` (suelo) a `90` (cielo). Para un hotspot
  "a nivel del piso" usa `-2` a `-8`.
- Forma rápida de calibrar: abre el visor, arrastra hasta apuntar donde quieres el
  hotspot, y en la consola del navegador ejecuta:
  ```js
  visor.getYaw(), visor.getPitch()
  ```
  Copia esos números al `hotspot`.
- Un hotspot tipo `scene` salta a `sceneId`. Si necesitas un punto informativo que
  solo muestra texto, usa `type: "info"` (sin `sceneId`).

## 5. Enlazar tomas (recorrido coherente)

- Cada escena debería tener al menos un hotspot de vuelta a donde se llegó, para
  que el usuario nunca quede "atrapado".
- Si `destino` no coincide con ningún `id` de `ESCENAS`, el código lo ignora con un
  `console.warn` (ver `senior-coder`) — pero revísalo, es un error de dato.

## 6. Verificar

- `python -m http.server` y probar: la escena carga, los hotspots saltan en ambos
  sentidos, el botón del selector se marca como activo (`aria-current`).
- Consola sin warnings de proporción ni de `destino` inexistente.
- Probar en móvil (emulador DevTools): el hotspot se puede tocar con el dedo.
