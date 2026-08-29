# Despliegue — Panorámika

Sitio 100 % estático → **GitHub Pages**. No hay servidor, base de datos ni build.
Publicar = `git push`.

## Estado actual (ya publicado)

| | |
|---|---|
| Repo | https://github.com/OniSr/panoramika (público) |
| Cuenta | `OniSr` |
| Sitio en vivo | **https://onisr.github.io/panoramika/** |
| Recorrido demo | https://onisr.github.io/panoramika/?proyecto=xalapa-demo |
| Asistente de captura | https://onisr.github.io/panoramika/capturar/ |
| Rama que sirve Pages | `main`, carpeta raíz |
| MVP Next.js archivado | rama `archivo-nextjs` |

`gh` quedó instalado con `winget install --id GitHub.cli --scope user`.
Hugin (armado de esferas) con `winget install --id Hugin.Hugin`.
El repo se creó como `tours360` y se renombró a `panoramika` con `gh repo rename`.

---

## Cómo se hizo la primera publicación (referencia)

```bash
gh repo create tours360 --public --source=. --remote=origin --push
git push -u origin archivo-nextjs
gh api -X POST "repos/OniSr/tours360/pages" -f "source[branch]=main" -f "source[path]=/"
gh repo rename panoramika --repo OniSr/tours360 --yes
```

---

## Cada cambio nuevo (rutina por "fitach")

```bash
git checkout main && git pull --ff-only
git checkout -b fitach/<nombre-corto>

#   ...trabajo (nuevo proyecto, escena, ajuste de diseño)...

git add -A
git commit -m "<qué cambia, en presente>"
git push -u origin fitach/<nombre-corto>
gh pr create --fill --base main
gh pr merge --squash --delete-branch
```

Al hacer merge a `main`, Pages redepliega solo. Detalle en
`.claude/skills/github-deploy/`.

---

## Dominio propio (opcional, más adelante)

1. Compra el dominio (ej. `panoramika.mx`).
2. `Settings → Pages → Custom domain` → escribe el dominio → Save.
3. En tu proveedor DNS: un registro `CNAME` de `www` → `<usuario>.github.io`, y
   los 4 registros `A` de GitHub Pages para el dominio raíz.
4. Marca **Enforce HTTPS**.

---

## Miniatura al compartir (WhatsApp / Facebook)

`index.html` trae etiquetas Open Graph **genéricas** (`assets/og-imagen.jpg`).
Para una miniatura por proyecto hace falta una página HTML por proyecto con sus
propias etiquetas — pendiente para cuando haya varios recorridos. Mientras tanto,
el enlace `?proyecto=<slug>` funciona igual, solo la miniatura es la genérica.

Regenerar la genérica:

```bash
python scripts/generar_og.py proyectos/xalapa-demo/panoramas/aerea-xalapa.webp \
  "Terreno en Xalapa" "Recorrido aéreo 360°"
```
