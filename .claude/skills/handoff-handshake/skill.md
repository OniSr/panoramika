---
name: handoff-handshake
description: >-
  Procedimiento de "handoff" para cerrar una sesión con el contexto saturado y
  pasar el estado exacto a una sesión nueva sin perder el hilo. Úsalo cuando el
  contexto de la sesión esté creciendo demasiado (respuestas más lentas, riesgo
  de que el harness compacte y se pierda detalle), antes de un cambio grande de
  tarea, o cuando Daniel lo pida ("haz un handoff", "handshake", "pasa el
  estado"). Genera el archivo handshake_state.md.
---

# Handoff / Handshake — gestión de contexto senior

## Cuándo dispararlo

- El contexto de la sesión se siente pesado o el harness ya avisó de compactación.
- Vas a cambiar de un fitach a otro muy distinto.
- Terminaste un bloque grande de trabajo y conviene un punto de guardado limpio.
- Daniel lo pide explícitamente.

> Nota: `/usage` mide el consumo de tu **plan** (límites de facturación), no el
> porcentaje de la ventana de contexto de la sesión. No existe un comando que
> devuelva ese porcentaje, así que el disparo es por criterio, no por un número
> exacto. El harness ya compacta solo cuando hace falta; este handoff es para
> hacerlo **tú**, de forma controlada y sin perder granularidad.

## Qué hacer

1. Escribe (o sobrescribe) **`handshake_state.md`** en la raíz del repo con la
   plantilla de abajo. Sé ultra-preciso y concreto: rutas de archivo reales,
   nombres de función, números de línea si ayudan.
2. Verifica que todo lo terminado esté commiteado (`git status` limpio) o anota
   exactamente qué queda sin commitear y por qué.
3. Dile a Daniel: *"Estado volcado en `handshake_state.md`. Abre una sesión nueva
   y pásame ese archivo para continuar."*
4. `handshake_state.md` está en `.gitignore` — es un archivo de traspaso, no
   historia del proyecto.

## Plantilla de `handshake_state.md`

```markdown
# Handshake — <fecha y hora> — sesión <breve etiqueta>

## 1. Objetivo del fitach en curso
<Una frase: qué se está construyendo y para qué.>

## 2. Estado del código
- Rama actual: <nombre> (¿limpia? ¿qué hay sin commitear?)
- Último commit relevante: <hash corto> — <mensaje>
- Archivos tocados en esta sesión:
  - `ruta/archivo` — <qué se cambió>

## 3. Dependencias / entorno
- Herramientas del sistema necesarias: <cwebp / gh / python -m http.server ...>
- Estado de `gh`: <instalado y autenticado / no>
- Nada de npm (proyecto sin package.json).

## 4. Hecho en esta sesión
- [x] <tarea concreta>

## 5. Bugs / pendientes conocidos
- [ ] <descripción precisa + archivo + cómo reproducir>

## 6. Siguientes pasos inmediatos (en orden)
1. <acción concreta y pequeña>
2. ...

## 7. Decisiones tomadas (para no re-litigar)
- <decisión> — <razón en una línea>

## 8. Contexto que NO está en el repo y hace falta saber
- <cualquier cosa dicha en chat que no quedó escrita en código o CLAUDE.md>
```

## Al abrir la sesión nueva

1. Lee `handshake_state.md` completo y `CLAUDE.md`.
2. Confirma con `git status` / `git log --oneline -5` que el estado coincide.
3. Retoma desde "Siguientes pasos inmediatos". No repitas exploración ya hecha.
4. Cuando el traspaso esté confirmado y estable, borra `handshake_state.md`.
