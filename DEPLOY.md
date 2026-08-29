# Despliegue — Domo 360

Sitio 100 % estático → **GitHub Pages**. No hay servidor, base de datos ni build.
Publicar = `git push`.

---

## Requisito único: GitHub CLI (una sola vez)

`gh` **no está instalado**. En PowerShell:

```powershell
winget install --id GitHub.cli
```

Cierra y reabre la terminal, luego:

```bash
gh auth login          # GitHub.com · HTTPS · autenticar con el navegador
gh auth status         # debe decir "Logged in"
```

> `gh auth login` abre el navegador para iniciar sesión — eso lo haces tú, no se
> puede automatizar.

---

## Primera publicación (una sola vez)

```bash
# 1. Crear el repo remoto a partir de esta carpeta
gh repo create domo360 --public --source=. --remote=origin --push

# 2. Subir también la rama con el MVP viejo archivado
git push -u origin archivo-nextjs

# 3. Activar GitHub Pages (rama main, carpeta raíz)
gh api -X POST "repos/{owner}/domo360/pages" -f "source[branch]=main" -f "source[path]=/"
```

`{owner}` = tu usuario de GitHub (`gh api user -q .login` lo dice).
Si el paso 3 da error, hazlo por web: **Settings → Pages → Source: Deploy from a
branch → `main` / `/ (root)` → Save**.

En 1–2 minutos el sitio está en:

```
https://<usuario>.github.io/domo360/
```

Enlace de un recorrido concreto:

```
https://<usuario>.github.io/domo360/?proyecto=xalapa-demo
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

1. Compra el dominio (ej. `domo360.mx`).
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
