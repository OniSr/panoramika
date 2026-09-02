/* ============================================================================
   Panorámika — lógica de la PÁGINA DE PORTAFOLIO (portafolio.html)

   JavaScript "vanilla", sin dependencias. Sólo hace dos cosas:
     PASO 1 · Pintar la galería de recorridos leyendo proyectos/recorridos.json
     PASO 2 · Poner el año en el pie

   Filosofía del proyecto: añadir un recorrido al portafolio = añadir una línea
   a recorridos.json, sin tocar este archivo.

   Programación defensiva (skill senior-coder): si el JSON no carga, viene vacío
   o está mal formado, se muestra un aviso claro con botón "Reintentar" — nunca
   una sección en blanco.

   Todos los console.* van prefijados con [Panoramika].
   ========================================================================== */

"use strict";

/* ============================================================================
   PASO 1 · GALERÍA DE RECORRIDOS
   ========================================================================== */

const MANIFIESTO = "proyectos/recorridos.json";

const galeria = document.getElementById("galeria");
const galeriaEstado = document.getElementById("galeriaEstado");

/** Limpia el slug igual que lo hace el visor (script.js · obtenerSlug):
 *  sólo [a-z0-9-], para no generar enlaces raros desde el JSON. */
function limpiarSlug(crudo) {
  return String(crudo || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Escapa texto antes de meterlo en el HTML de una tarjeta. */
function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto == null ? "" : String(texto);
  return d.innerHTML;
}

/** Muestra un mensaje dentro de la galería (estado de carga o de error). */
function mostrarEstadoGaleria(texto, { error = false, reintentar = false } = {}) {
  galeria.setAttribute("aria-busy", "false");
  galeria.innerHTML = "";

  const caja = document.createElement("p");
  caja.className = "galeria__aviso" + (error ? " --error" : "");
  caja.textContent = texto;

  if (reintentar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Reintentar";
    btn.addEventListener("click", cargarRecorridos);
    caja.appendChild(document.createElement("br"));
    caja.appendChild(btn);
  }
  galeria.appendChild(caja);
}

/** Construye una tarjeta de recorrido (un <a> si tiene slug, un <div> si es
 *  "próximamente"). */
function crearTarjeta(item) {
  const nombre = esc(item.nombre || "Recorrido");
  const ubicacion = esc(item.ubicacion || "");
  const tipo = esc(item.tipo || "");

  // --- Tarjeta "Próximamente": sin enlace, atenuada -----------------------
  if (item.proximamente === true) {
    const div = document.createElement("div");
    div.className = "recorrido recorrido--proximamente";
    div.innerHTML = `
      <div class="recorrido__foto"><span class="recorrido__proxlabel">Próximamente</span></div>
      <div class="recorrido__cuerpo">
        ${ubicacion ? `<p class="recorrido__ubicacion">${ubicacion}</p>` : ""}
        <p class="recorrido__nombre">${nombre}</p>
        ${tipo ? `<span class="recorrido__tipo">${tipo}</span>` : ""}
      </div>`;
    return div;
  }

  // --- Tarjeta real: enlace al visor ------------------------------------
  const slug = limpiarSlug(item.slug);
  if (!slug) {
    console.warn("[Panoramika] recorrido sin 'slug' válido, se omite:", item);
    return null;
  }

  const a = document.createElement("a");
  a.className = "recorrido" + (item.destacado === true ? " recorrido--destacado" : "");
  a.href = `index.html?proyecto=${encodeURIComponent(slug)}`;

  // Portada: si el JSON no trae ruta, se deja el degradado de fondo del CSS.
  const portada = item.portada
    ? `<img class="recorrido__foto" src="${esc(item.portada)}" alt="Vista previa de ${nombre}"
           loading="lazy" decoding="async"
           onerror="this.remove()">`
    : `<div class="recorrido__foto" aria-hidden="true"></div>`;

  a.innerHTML = `
    ${portada}
    <span class="recorrido__cta">Ver recorrido &rarr;</span>
    <div class="recorrido__cuerpo">
      ${ubicacion ? `<p class="recorrido__ubicacion">${ubicacion}</p>` : ""}
      <p class="recorrido__nombre">${nombre}</p>
      ${tipo ? `<span class="recorrido__tipo">${tipo}</span>` : ""}
    </div>`;
  return a;
}

/** Ordena: primero los destacados, luego el resto, y las "próximamente" al final. */
function ordenar(lista) {
  const peso = (it) => (it.proximamente ? 2 : it.destacado ? 0 : 1);
  return [...lista].sort((a, b) => peso(a) - peso(b));
}

/** Descarga el manifiesto y pinta las tarjetas. */
async function cargarRecorridos() {
  mostrarEstadoGaleria("Cargando recorridos…");
  galeria.setAttribute("aria-busy", "true");

  let datos;
  try {
    const resp = await fetch(MANIFIESTO, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    datos = await resp.json();
  } catch (err) {
    console.error("[Panoramika] no se pudo cargar recorridos.json:", err);
    mostrarEstadoGaleria(
      "No pudimos cargar los recorridos. Revisa tu conexión e inténtalo de nuevo.",
      { error: true, reintentar: true }
    );
    return;
  }

  if (!Array.isArray(datos) || datos.length === 0) {
    console.warn("[Panoramika] recorridos.json vacío o no es un arreglo.");
    mostrarEstadoGaleria("Todavía no hay recorridos publicados. Vuelve pronto.");
    return;
  }

  const tarjetas = ordenar(datos).map(crearTarjeta).filter(Boolean);

  if (tarjetas.length === 0) {
    mostrarEstadoGaleria("Todavía no hay recorridos publicados. Vuelve pronto.");
    return;
  }

  galeria.innerHTML = "";
  galeria.setAttribute("aria-busy", "false");
  const frag = document.createDocumentFragment();
  tarjetas.forEach((t) => frag.appendChild(t));
  galeria.appendChild(frag);
  console.log(`[Panoramika] portafolio: ${tarjetas.length} tarjeta(s) pintada(s).`);
}

/* ============================================================================
   PASO 2 · AÑO EN EL PIE
   ========================================================================== */
function ponerAnio() {
  const el = document.getElementById("anio");
  if (el) el.textContent = String(new Date().getFullYear());
}

/* ============================================================================
   ARRANQUE
   ========================================================================== */
ponerAnio();
cargarRecorridos();
