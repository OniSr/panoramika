/* ============================================================================
   Panorámika — lógica del visor
   JavaScript "vanilla" (sin frameworks). Solo depende de Pannellum, cargado
   desde el CDN en index.html (con respaldo local en /vendor/).

   Cada recorrido vive en  proyectos/<slug>/proyecto.json  y se abre con
   index.html?proyecto=<slug>.  Añadir un recorrido = crear una carpeta, sin
   tocar este archivo (ver skill add-panorama).

   Orden de lectura:
     PASO 1 · Configuración
     PASO 2 · Referencias al DOM y utilidades de aviso
     PASO 3 · Cargar el proyecto (JSON) y validarlo
     PASO 4 · Carga defensiva de Pannellum y de las imágenes
     PASO 5 · Pantalla de bienvenida
     PASO 6 · Construir la configuración de Pannellum y arrancar el visor
     PASO 7 · Interfaz del visor (barra, selector, hotspots, pista)
     PASO 8 · Compartir (WhatsApp / copiar enlace)
   ========================================================================== */

"use strict";

/* ============================================================================
   PASO 1 · CONFIGURACIÓN
   ========================================================================== */
const PROYECTO_POR_DEFECTO = "xalapa-demo";
const PANNELLUM_LOCAL_JS = "vendor/pannellum/pannellum.js";

/* ============================================================================
   PASO 2 · REFERENCIAS AL DOM Y UTILIDADES DE AVISO
   ========================================================================== */
const $ = (id) => document.getElementById(id);

const $panorama = $("panorama");
const $barra = $("barraSuperior");
const $escenaActual = $("escenaActual");
const $selector = $("selectorEscenas");
const $intro = $("intro");
const $aviso = $("aviso");
const $avisoTexto = $("avisoTexto");
const $avisoReintentar = $("avisoReintentar");
const $pista = $("pistaArrastre");

let visor = null;       // instancia de Pannellum (PASO 6)
let proyecto = null;    // datos del JSON (PASO 3)
let baseProyecto = "";  // ruta a la carpeta del proyecto, p. ej. "proyectos/xalapa-demo/"

/**
 * Muestra la capa de aviso a pantalla completa.
 * @param {string} texto
 * @param {{error?: boolean}} opciones  error:true → estado de fallo + "Reintentar".
 */
function mostrarAviso(texto, opciones = {}) {
  $avisoTexto.textContent = texto;
  $aviso.hidden = false;
  $aviso.classList.remove("--oculto");
  $aviso.classList.toggle("--error", opciones.error === true);
  $avisoReintentar.hidden = opciones.error !== true;
}

function ocultarAviso() {
  $aviso.classList.add("--oculto");
  window.setTimeout(() => { $aviso.hidden = true; }, 320);
}

/* ============================================================================
   PASO 3 · CARGAR EL PROYECTO
   ========================================================================== */

/** Lee el slug de la URL (?proyecto=algo). Si no viene, usa el de por defecto.
 *  Se limpia a [a-z0-9-] para no permitir rutas raras (../). */
function obtenerSlug() {
  const crudo = new URLSearchParams(window.location.search).get("proyecto") || "";
  const limpio = crudo.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return limpio || PROYECTO_POR_DEFECTO;
}

/** Comprueba que el JSON tenga la forma mínima esperada. Lanza si no. */
function validarProyecto(p) {
  if (!p || typeof p !== "object") throw new Error("El proyecto.json no es un objeto.");
  if (!Array.isArray(p.escenas) || p.escenas.length === 0)
    throw new Error("El proyecto no tiene escenas.");
  for (const e of p.escenas) {
    if (!e.id || !e.panorama)
      throw new Error(`Una escena no tiene 'id' o 'panorama' (${JSON.stringify(e)}).`);
  }
  const ids = new Set(p.escenas.map((e) => e.id));
  if (p.escenaInicial && !ids.has(p.escenaInicial))
    throw new Error(`escenaInicial "${p.escenaInicial}" no existe en las escenas.`);
  // Hotspots que apuntan a escenas inexistentes: aviso, no error (se ignoran luego).
  for (const e of p.escenas) {
    for (const h of e.hotspots || []) {
      if (!ids.has(h.destino))
        console.warn(`[Panoramika] Hotspot en "${e.id}" apunta a "${h.destino}", que no existe.`);
    }
  }
  return p;
}

/** Descarga y valida proyectos/<slug>/proyecto.json */
async function cargarProyecto(slug) {
  baseProyecto = `proyectos/${slug}/`;
  let resp;
  try {
    resp = await fetch(baseProyecto + "proyecto.json", { cache: "no-cache" });
  } catch {
    throw new Error("No se pudo leer el proyecto (¿estás abriendo con http://, no file://?).");
  }
  if (!resp.ok) throw new Error(`No se encontró el recorrido "${slug}" (HTTP ${resp.status}).`);
  return validarProyecto(await resp.json());
}

/* ============================================================================
   PASO 4 · CARGA DEFENSIVA
   ========================================================================== */

/** Garantiza que window.pannellum exista; si no, inyecta la copia local. */
function asegurarPannellum() {
  return new Promise((resolver, rechazar) => {
    if (window.pannellum) return resolver();
    console.warn("[Panoramika] Pannellum no llegó del CDN. Probando copia local…");
    const s = document.createElement("script");
    s.src = PANNELLUM_LOCAL_JS;
    s.onload = () => (window.pannellum ? resolver() : rechazar(new Error("Pannellum local no inicializó.")));
    s.onerror = () => rechazar(new Error("No se pudo cargar Pannellum ni del CDN ni de /vendor/."));
    document.head.appendChild(s);
  });
}

/** Verifica que una panorámica exista y se decodifique antes de dársela a Pannellum. */
function precargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => {
      const prop = img.naturalWidth / img.naturalHeight;
      if (Math.abs(prop - 2) > 0.06)
        console.warn(`[Panoramika] "${src}" es ${img.naturalWidth}×${img.naturalHeight} (${prop.toFixed(2)}:1). Debe ser 2:1.`);
      resolver();
    };
    img.onerror = () => rechazar(new Error(`No cargó la imagen: ${src}`));
    img.src = src;
  });
}

/** Precarga solo la panorámica de la escena inicial (las demás van bajo demanda). */
function validarImagenInicial() {
  const inicial = proyecto.escenaInicial || proyecto.escenas[0].id;
  const escena = proyecto.escenas.find((e) => e.id === inicial);
  return precargarImagen(baseProyecto + escena.panorama);
}

/* ============================================================================
   PASO 5 · PANTALLA DE BIENVENIDA
   ========================================================================== */
function mostrarIntro() {
  $("introTitulo").textContent = proyecto.nombre || "Recorrido 360°";
  $("introUbicacion").textContent = proyecto.ubicacion || "";
  $("introDescripcion").textContent = proyecto.descripcion || "";

  if (proyecto.portada) {
    $intro.style.setProperty("--portada", `url("${baseProyecto + proyecto.portada}")`);
  }
  document.title = `${proyecto.nombre} · Panorámika`;

  $intro.hidden = false;
  ocultarAviso();

  $("btnIniciar").addEventListener("click", () => {
    $intro.classList.add("--saliendo");
    window.setTimeout(() => { $intro.hidden = true; }, 450);
    mostrarAviso("Cargando la primera toma…");
    iniciarVisor();
  }, { once: true });
}

/* ============================================================================
   PASO 6 · CONFIGURACIÓN DE PANNELLUM Y ARRANQUE DEL VISOR
   ----------------------------------------------------------------------------
   Carga diferida: Pannellum solo descarga la textura de la escena visible; las
   demás se piden al saltar a ellas. No precargamos todas de golpe.
   ========================================================================== */
/** Dibuja el contenido de un marcador (hotspot) dentro del div que da Pannellum. */
const FLECHA_TIPO = { destino: "→", salir: "←", propiedad: "" };
function crearMarcador(div, h) {
  div.classList.add("marcador");
  const pastilla = document.createElement("span");
  pastilla.className = "marcador__pastilla";
  const flecha = FLECHA_TIPO[h.tipo] ?? "→";
  const linea = document.createElement("span");
  linea.className = "marcador__linea";
  linea.textContent = (flecha ? flecha + "  " : "") + (h.texto || "Ir");
  pastilla.appendChild(linea);
  if (h.detalle) {
    const d = document.createElement("span");
    d.className = "marcador__detalle";
    d.textContent = h.detalle;
    pastilla.appendChild(d);
  }
  div.appendChild(pastilla);
}

function construirConfigPannellum() {
  const idsValidos = new Set(proyecto.escenas.map((x) => x.id));
  const scenes = {};
  for (const e of proyecto.escenas) {
    scenes[e.id] = {
      type: "equirectangular",
      panorama: baseProyecto + e.panorama,
      autoLoad: true,
      yaw: e.miradaInicial?.yaw ?? 0,
      pitch: e.miradaInicial?.pitch ?? 0,
      hotSpots: (e.hotspots || [])
        .filter((h) => idsValidos.has(h.destino))
        .map((h) => ({
          pitch: h.pitch,
          yaw: h.yaw,
          cssClass: "hs hs--" + (h.tipo || "destino"),
          createTooltipFunc: crearMarcador,
          createTooltipArgs: h,
          clickHandlerFunc: () => { if (visor && visor.getScene() !== h.destino) visor.loadScene(h.destino); },
        })),
    };
  }
  return {
    default: {
      firstScene: proyecto.escenaInicial || proyecto.escenas[0].id,
      sceneFadeDuration: 700,
      autoLoad: true,
      autoRotate: -2,
      autoRotateInactivityDelay: 4000,
      compass: false,
      showZoomCtrl: false,   // el zoom con pellizco/rueda sigue; quitamos los +/−
      keyboardZoom: true,
      hfov: 100,
      minHfov: 55,
      maxHfov: 120,
    },
    scenes,
  };
}

function iniciarVisor() {
  visor = window.pannellum.viewer($panorama, construirConfigPannellum());

  visor.on("load", () => {
    ocultarAviso();
    $barra.hidden = false;
    $selector.hidden = false;
    gestionarPista();
  });
  visor.on("scenechange", alCambiarEscena);
  visor.on("error", (msg) => {
    console.error("[Panoramika] Pannellum:", msg);
    mostrarAviso("No se pudo mostrar esta toma en tu dispositivo. Prueba con otra o desde una computadora.", { error: true });
  });

  construirSelector();
  alCambiarEscena(proyecto.escenaInicial || proyecto.escenas[0].id);
}

/* ============================================================================
   PASO 7 · INTERFAZ DEL VISOR
   ----------------------------------------------------------------------------
   Navegación: (1) marcadores dentro de la escena (estilo Street View) y
   (2) barra inferior SIEMPRE visible con todas las escenas. Nunca hace falta
   recargar para cambiar de vista.
   ========================================================================== */
const ICONO_ESCENA = { aerea: "◎", fachada: "⌂", exterior: "⌂" };

function construirSelector() {
  $selector.innerHTML = "";
  // Siempre se construye, aunque haya una sola escena (así el control es
  // predecible y se ve desde el principio).
  proyecto.escenas.forEach((e, i) => {
    const btn = document.createElement("button");
    btn.className = "nav-escena";
    btn.type = "button";
    btn.dataset.escena = e.id;
    const ico = ICONO_ESCENA[e.id] || String(i + 1);
    btn.innerHTML =
      `<span class="nav-escena__ico">${ico}</span>` +
      `<span class="nav-escena__txt">${(e.titulo || e.id).replace(/</g, "&lt;")}</span>`;
    btn.addEventListener("click", () => {
      if (visor && visor.getScene() !== e.id) visor.loadScene(e.id);
    });
    $selector.appendChild(btn);
  });
}

function alCambiarEscena(idEscena) {
  const e = proyecto.escenas.find((x) => x.id === idEscena);
  const idx = proyecto.escenas.findIndex((x) => x.id === idEscena);
  $escenaActual.textContent = e
    ? `${idx + 1}/${proyecto.escenas.length} · ${e.titulo || e.id}`
    : "";
  for (const btn of $selector.children) {
    const activa = btn.dataset.escena === idEscena;
    btn.setAttribute("aria-current", String(activa));
    if (activa) btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }
}

function gestionarPista() {
  $pista.classList.add("--visible");
  const esconder = () => $pista.classList.remove("--visible");
  $panorama.addEventListener("pointerdown", esconder, { once: true });
  window.setTimeout(esconder, 4500);
}

/* ============================================================================
   PASO 8 · COMPARTIR
   ========================================================================== */
function configurarCompartir() {
  const $btn = $("btnCompartir");
  const $hoja = $("hojaCompartir");
  const enlace = () => window.location.href;
  const mensaje = () =>
    `Mira este recorrido 360° de ${proyecto?.nombre || "la propiedad"}: `;

  const abrir = () => {
    // En móvil, si el sistema tiene menú de compartir nativo, se usa ese.
    if (navigator.share) {
      navigator.share({ title: proyecto?.nombre, text: mensaje(), url: enlace() }).catch(() => {});
      return;
    }
    $("compWhatsApp").href =
      "https://wa.me/?text=" + encodeURIComponent(mensaje() + enlace());
    $hoja.hidden = false;
  };
  const cerrar = () => { $hoja.hidden = true; };

  $btn.addEventListener("click", abrir);
  $("hojaFondo").addEventListener("click", cerrar);
  $("compCerrar").addEventListener("click", cerrar);
  $("compCopiar").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(enlace());
      $("compCopiar").textContent = "¡Enlace copiado!";
      window.setTimeout(() => ($("compCopiar").textContent = "Copiar enlace"), 1800);
    } catch {
      $("compCopiar").textContent = "Copia manual: " + enlace();
    }
  });
}

/* ============================================================================
   ARRANQUE
   ========================================================================== */
async function arrancar() {
  mostrarAviso("Preparando el recorrido…");
  try {
    await asegurarPannellum();
    proyecto = await cargarProyecto(obtenerSlug());
    configurarCompartir();
    await validarImagenInicial();
    mostrarIntro();
  } catch (err) {
    console.error("[Panoramika]", err);
    mostrarAviso(err.message || "No se pudo iniciar el recorrido.", { error: true });
  }
}

$avisoReintentar.addEventListener("click", () => window.location.reload());
arrancar();
