---
name: github-deploy
description: >-
  Rutina de control de versiones y despliegue: revisar diferencias, crear una rama
  descriptiva por cada "fitach", hacer commits limpios, subir a GitHub y publicar
  en GitHub Pages. Úsala al terminar un fitach o cuando Daniel pida "sube esto",
  "haz el deploy" o "crea el PR".
---

# github-deploy — versionado y publicación

## Requisito previo (una sola vez)

`gh` (GitHub CLI) debe estar instalado y autenticado:

```bash
winget install --id GitHub.cli    # Windows
gh auth login                      # elegir GitHub.com + HTTPS + navegador
```

Comprobar: `gh auth status`. Si no está, **detente y pídeselo a Daniel** — no
intentes push sin remoto.

## Crear el repositorio remoto (una sola vez)

```bash
gh repo create panoramika --private --source=. --remote=origin
git push -u origin main
git push -u origin archivo-nextjs      # conservar el MVP Next.js archivado
```

## Rutina por cada fitach

```bash
# 1. Partir de main al día
git checkout main && git pull --ff-only

# 2. Rama descriptiva
git checkout -b fitach/<nombre-corto>     # ej. fitach/selector-miniaturas

# 3. (trabajo del sub-agente técnico) …

# 4. Revisar TODO antes de commitear
git status
git diff

# 5. Commits limpios y atómicos (uno por cambio coherente), mensaje en español
git add <archivos>
git commit -m "<verbo en presente>: <qué y por qué breve>"
#   ej: "agrega selector con miniaturas de cada escena"

# 6. Subir y abrir PR
git push -u origin fitach/<nombre-corto>
gh pr create --fill --base main
```

### Reglas de commit

- Un commit = un cambio con sentido. No mezcles "arregla bug" con "añade feature".
- Mensaje: qué cambia y, si no es obvio, por qué. Español, minúscula inicial.
- No commitees `handshake_state.md`, `assets/panoramas/_raw/*`, ni `node_modules/`
  (ya están en `.gitignore`; verifica con `git status`).
- Nunca `git push --force` sobre `main` ni `archivo-nextjs`.

## Publicar en GitHub Pages (una sola vez)

```bash
gh api -X POST repos/:owner/panoramika/pages -f 'source[branch]=main' -f 'source[path]=/'
```

O por interfaz: **Settings → Pages → Source: Deploy from a branch → `main` / `/root`**.

- El sitio es estático en la raíz, así que Pages lo sirve tal cual.
- `.nojekyll` (ya en el repo) evita que Pages procese los archivos con Jekyll.
- URL resultante: `https://<usuario>.github.io/panoramika/`. Tras cada merge a `main`,
  Pages redepliega solo en 1–2 min.

## Merge

```bash
gh pr merge --squash --delete-branch
```

Squash mantiene el historial de `main` legible (un commit por fitach).

## Verificar el deploy

1. `gh run list` / la pestaña Actions: el build de Pages en verde.
2. Abrir la URL de Pages en móvil y escritorio.
3. Con DevTools, bloquear `jsdelivr` y recargar: el visor sigue con el fallback local.
