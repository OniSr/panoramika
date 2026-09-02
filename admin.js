/* ============================================================================
   Panorámika — lógica del PANEL INTERNO (admin.html)

   JavaScript "vanilla", sin dependencias. Hace cuatro cosas:
     PASO 1 · Utilidades (limpiar slug, escapar HTML, avisos)
     PASO 2 · Pintar la lista de recorridos desde proyectos/proyectos.json,
              agrupada por tipo y filtrable con chips
     PASO 3 · Detectar qué proyectos tienen escena "mapa-lotes" (fetch de cada
              proyecto.json, con tolerancia a fallos) para mostrar el botón de editar
     PASO 4 · Botones "copiar" de la referencia + fecha + año del pie

   Programación defensiva (skill senior-coder): si proyectos.json no carga, viene
   vacío o mal formado -> aviso claro con "Reintentar", nunca sección en blanco.
   Si el fetch de un proyecto.json concreto falla -> esa ficha se pinta igual,
   sin el botón de editar, con un console.warn.

   Todos los console.* van prefijados con [Panoramika].
   ========================================================================== */

"use strict";

/* ============================================================================
   PASO 1 · UTILIDADES
   ========================================================================== */

const MANIFIESTO = "proyectos/proyectos.json";

/* Orden en que se muestran los grupos. Cualquier tipo que no esté aquí cae en
   "Otro". Los terrenos van primero: es la prioridad de venta ahora mismo. */
const ORDEN_TIPOS = ["Terreno", "Departamento", "Casa", "Hotel", "Otro"];

const lista = document.getElementById("lista");
const listaEstado = document.getElementById("listaEstado");
const filtrosCaja = document.getElementById("filtros");

/** Limpia el slug igual que el visor (script.js · obtenerSlug) y el portafolio:
 *  sólo [a-z0-9-], para no generar enlaces raros desde el JSON. */
function limpiarSlug(crudo) {
  return String(crudo || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Escapa texto antes de meterlo como HTML. */
function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

/** Normaliza el tipo a uno de ORDEN_TIPOS (lo desconocido -> "Otro"). */
function normalizarTipo(crudo) {
  const t = String(crudo || "").trim().toLowerCase();
  const encontrado = ORDEN_TIPOS.find((op) => op.toLowerCase() === t);
  return encontrado || "Otro";
}

/** Muestra un mensaje dentro de la lista (estado de carga o de error). */
function mostrarEstado(texto, { error = false, reintentar = false } = {}) {
  lista.setAttribute("aria-busy", "false");
  lista.innerHTML = "";
  filtrosCaja.innerHTML = "";

  const caja = document.createElement("p");
  caja.className = "aviso" + (error ? " --error" : "");
  caja.textContent = texto;

  if (reintentar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Reintentar";
    btn.addEventListener("click", cargarProyectos);
    caja.appendChild(document.createElement("br"));
    caja.appendChild(btn);
  }
  lista.appendChild(caja);
}

/* ============================================================================
   PASO 2 · LISTA DE RECORRIDOS
   ========================================================================== */

/** Construye la ficha (<li>) de un proyecto. El botón "Editar mapa de lotes"
 *  se añade después, cuando sepamos si tiene escena mapa-lotes (PASO 3). */
function crearFicha(item) {
  const slug = limpiarSlug(item.slug);
  if (!slug) {
    console.warn("[Panoramika] proyecto sin 'slug' válido, se omite:", item);
    return null;
  }

  const nombre = esc(item.nombre || slug);
  const tipo = normalizarTipo(item.tipo);
  const esPublico = item.publico === true;
  const nota = item.nota ? `<p class="ficha__nota">${esc(item.nota)}</p>` : "";

  const li = document.createElement("li");
  li.className = "ficha";
  li.dataset.slug = slug;
  li.dataset.tipo = tipo;

  li.innerHTML = `
    <div class="ficha__cabeza">
      <span class="ficha__nombre">${nombre}</span>
      <span class="ficha__slug">${esc(slug)}</span>
    </div>
    <div class="ficha__badges">
      <span class="badge badge--tipo">${esc(tipo)}</span>
      <span class="badge badge--${esPublico ? "publico" : "privado"}">
        ${esPublico ? "Público" : "Privado"}
      </span>
    </div>
    ${nota}
    <code class="ficha__ruta">proyectos/${esc(slug)}/proyecto.json</code>
    <div class="ficha__acciones">
      <a class="accion accion--ver" href="index.html?proyecto=${encodeURIComponent(slug)}"
         target="_blank" rel="noopener">Ver &nearr;</a>
    </div>`;

  return li;
}

/** Pinta los chips de filtro según los tipos presentes en los datos. */
function pintarFiltros(tiposPresentes) {
  filtrosCaja.innerHTML = "";

  const opciones = ["Todos", ...ORDEN_TIPOS.filter((t) => tiposPresentes.has(t))];

  opciones.forEach((op, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filtro";
    btn.textContent = op;
    btn.dataset.tipo = op;
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    btn.addEventListener("click", () => aplicarFiltro(op));
    filtrosCaja.appendChild(btn);
  });
}

/** Muestra u oculta los grupos según el filtro elegido. */
function aplicarFiltro(tipo) {
  filtrosCaja.querySelectorAll(".filtro").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.tipo === tipo ? "true" : "false");
  });
  lista.querySelectorAll(".grupo").forEach((g) => {
    g.hidden = tipo !== "Todos" && g.dataset.tipo !== tipo;
  });
}

/** Descarga el manifiesto maestro y pinta las fichas agrupadas por tipo. */
async function cargarProyectos() {
  mostrarEstado("Cargando proyectos…");
  lista.setAttribute("aria-busy", "true");

  let datos;
  try {
    const resp = await fetch(MANIFIESTO, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    datos = await resp.json();
  } catch (err) {
    console.error("[Panoramika] no se pudo cargar proyectos.json:", err);
    mostrarEstado(
      "No pudimos cargar la lista de proyectos (proyectos/proyectos.json). " +
      "Revisa que el archivo exista y sea JSON válido.",
      { error: true, reintentar: true }
    );
    return;
  }

  if (!Array.isArray(datos) || datos.length === 0) {
    console.warn("[Panoramika] proyectos.json vacío o no es un arreglo.");
    mostrarEstado("proyectos.json no tiene ningún proyecto todavía.", { error: true });
    return;
  }

  // Agrupar por tipo, respetando ORDEN_TIPOS.
  const porTipo = new Map();
  datos.forEach((item) => {
    const ficha = crearFicha(item);
    if (!ficha) return;
    const tipo = ficha.dataset.tipo;
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push(ficha);
  });

  if (porTipo.size === 0) {
    mostrarEstado("Ningún proyecto del JSON tiene un 'slug' válido.", { error: true });
    return;
  }

  lista.innerHTML = "";
  lista.setAttribute("aria-busy", "false");

  const tiposPresentes = new Set();
  ORDEN_TIPOS.forEach((tipo) => {
    const fichas = porTipo.get(tipo);
    if (!fichas || fichas.length === 0) return;
    tiposPresentes.add(tipo);

    const grupo = document.createElement("div");
    grupo.className = "grupo";
    grupo.dataset.tipo = tipo;
    grupo.innerHTML = `<h3 class="grupo__titulo">${esc(tipo)} · ${fichas.length}</h3>`;

    const ul = document.createElement("ul");
    ul.className = "grupo__lista";
    fichas.forEach((f) => ul.appendChild(f));
    grupo.appendChild(ul);
    lista.appendChild(grupo);
  });

  pintarFiltros(tiposPresentes);
  console.log(`[Panoramika] panel: ${datos.length} proyecto(s) en el manifiesto.`);

  // PASO 3: ahora que están pintadas, averigua cuáles tienen mapa de lotes.
  detectarMapasDeLotes();
}

/* ============================================================================
   PASO 3 · ¿QUÉ PROYECTOS TIENEN ESCENA "mapa-lotes"?
   Se hace DESPUÉS de pintar la lista para no bloquear el render. Cada fetch
   es independiente: si uno falla, esa ficha se queda sin botón de editar.
   ========================================================================== */

async function tieneMapaDeLotes(slug) {
  try {
    const resp = await fetch(`proyectos/${encodeURIComponent(slug)}/proyecto.json`, {
      cache: "no-cache",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const proyecto = await resp.json();
    const escenas = Array.isArray(proyecto.escenas) ? proyecto.escenas : [];
    return escenas.some((e) => e && e.tipo === "mapa-lotes");
  } catch (err) {
    console.warn(`[Panoramika] no se pudo leer proyecto.json de "${slug}":`, err);
    return false;
  }
}

function detectarMapasDeLotes() {
  lista.querySelectorAll(".ficha").forEach(async (ficha) => {
    const slug = ficha.dataset.slug;
    if (!slug) return;
    if (!(await tieneMapaDeLotes(slug))) return;

    const acciones = ficha.querySelector(".ficha__acciones");
    if (!acciones) return;

    const a = document.createElement("a");
    a.className = "accion accion--editar";
    a.href = `index.html?proyecto=${encodeURIComponent(slug)}&editar=1`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Editar mapa de lotes";
    acciones.appendChild(a);
  });
}

/* ============================================================================
   PASO 4 · BOTONES "COPIAR" + FECHA + AÑO
   ========================================================================== */

/** Copia texto al portapapeles con respaldo para navegadores viejos / http. */
async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (err) {
    console.warn("[Panoramika] clipboard API falló, uso respaldo:", err);
  }
  // Respaldo: textarea temporal + execCommand.
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error("[Panoramika] no se pudo copiar:", err);
    return false;
  }
}

function montarBotonesCopiar() {
  document.querySelectorAll("[data-copiar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const destino = document.getElementById(btn.dataset.copiar);
      if (!destino) return;
      // textContent respeta las entidades &lt; &gt; &amp; ya decodificadas.
      const ok = await copiarTexto(destino.textContent.trim());
      const original = btn.textContent;
      btn.textContent = ok ? "Copiado" : "Falló";
      btn.classList.toggle("--ok", ok);
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("--ok");
      }, 1600);
    });
  });
}

function ponerFechaYAnio() {
  const hoy = new Date();
  const elFecha = document.getElementById("fecha");
  if (elFecha) {
    try {
      // En español el día y el mes van en minúscula; sólo capitalizamos la
      // primera letra de toda la frase.
      const txt = hoy.toLocaleDateString("es-MX", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      elFecha.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
    } catch {
      elFecha.textContent = hoy.toISOString().slice(0, 10);
    }
  }
  const elAnio = document.getElementById("anio");
  if (elAnio) elAnio.textContent = String(hoy.getFullYear());
}

/* ============================================================================
   ARRANQUE
   ========================================================================== */
ponerFechaYAnio();
montarBotonesCopiar();
cargarProyectos();
