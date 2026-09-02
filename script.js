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
     PASO 6b · Escenas de tipo "video" (YouTube / Vimeo / .mp4 local)
     PASO 7 · Interfaz del visor (barra, selector, hotspots, pista)
     PASO 8 · Compartir (WhatsApp / copiar enlace)

   Tipos de escena:
     - Panorámica 360 (por defecto, o "tipo": "panorama"): la maneja Pannellum.
     - Video ("tipo": "video"): un recorrido caminando / aéreo con dron que vive
       en la misma barra de escenas. NO usa Pannellum ni hotspots; se navega
       desde la barra. Ver PASO 6b.
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
const $video = $("video");
const $barra = $("barraSuperior");
const $escenaActual = $("escenaActual");
const $selector = $("selectorEscenas");
const $intro = $("intro");
const $aviso = $("aviso");
const $avisoTexto = $("avisoTexto");
const $avisoReintentar = $("avisoReintentar");
const $pista = $("pistaArrastre");

let visor = null;          // instancia de Pannellum (PASO 6)
let proyecto = null;       // datos del JSON (PASO 3)
let baseProyecto = "";     // ruta a la carpeta del proyecto, p. ej. "proyectos/xalapa-demo/"
let escenaActualId = null; // id de la escena visible (360 o video); lo fija alCambiarEscena()

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

/** ¿La escena es de tipo "video" (un recorrido en video, no una panorámica 360)? */
function esEscenaVideo(e) {
  return !!e && e.tipo === "video";
}

/** Busca una escena por su id dentro del proyecto ya cargado (o null). */
function escenaPorId(id) {
  return proyecto ? proyecto.escenas.find((e) => e.id === id) || null : null;
}

/** Comprueba que el JSON tenga la forma mínima esperada. Lanza si no. */
function validarProyecto(p) {
  if (!p || typeof p !== "object") throw new Error("El proyecto.json no es un objeto.");
  if (!Array.isArray(p.escenas) || p.escenas.length === 0)
    throw new Error("El proyecto no tiene escenas.");

  // Escenas de video mal formadas (sin 'video' válido): se OMITEN con aviso, no
  // rompen el recorrido. interpretarVideo() (PASO 6b) devuelve null si la fuente
  // no es YouTube, Vimeo ni una ruta local.
  p.escenas = p.escenas.filter((e) => {
    if (!esEscenaVideo(e)) return true;
    if (interpretarVideo(e.video) === null) {
      console.warn(`[Panoramika] La escena de video "${e.id || "(sin id)"}" no tiene un 'video' válido; se omite.`);
      return false;
    }
    if (Array.isArray(e.hotspots) && e.hotspots.length > 0) {
      console.warn(`[Panoramika] La escena de video "${e.id}" trae 'hotspots'; se ignoran (una escena de video se navega desde la barra).`);
      e.hotspots = [];
    }
    return true;
  });
  if (p.escenas.length === 0) throw new Error("El proyecto no tiene escenas válidas.");

  for (const e of p.escenas) {
    if (esEscenaVideo(e)) {
      if (!e.id) throw new Error(`Una escena de video no tiene 'id' (${JSON.stringify(e)}).`);
    } else if (!e.id || !e.panorama) {
      throw new Error(`Una escena no tiene 'id' o 'panorama' (${JSON.stringify(e)}).`);
    }
  }

  const ids = new Set(p.escenas.map((e) => e.id));
  if (p.escenaInicial && !ids.has(p.escenaInicial))
    throw new Error(`escenaInicial "${p.escenaInicial}" no existe en las escenas.`);
  // Hotspots (solo en escenas 360) que apuntan a escenas inexistentes: aviso, no error.
  for (const e of p.escenas) {
    if (esEscenaVideo(e)) continue;
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

/** Precarga solo la panorámica de la escena inicial (las demás van bajo demanda).
 *  Si la escena inicial es un video, precarga la primera 360 que haya; si el
 *  recorrido es solo-video, no hay nada que precargar. */
function validarImagenInicial() {
  const inicialId = proyecto.escenaInicial || proyecto.escenas[0].id;
  let escena = proyecto.escenas.find((e) => e.id === inicialId);
  if (!escena || esEscenaVideo(escena))
    escena = proyecto.escenas.find((e) => !esEscenaVideo(e));
  if (!escena) return Promise.resolve();
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

/** id de la escena 360 con la que debe arrancar Pannellum (nunca una de video). */
function primeraEscena360Id() {
  const inicial = escenaPorId(proyecto.escenaInicial);
  if (inicial && !esEscenaVideo(inicial)) return inicial.id;
  const primera = proyecto.escenas.find((e) => !esEscenaVideo(e));
  return primera ? primera.id : null;
}

function construirConfigPannellum() {
  const idsValidos = new Set(proyecto.escenas.map((x) => x.id));
  const scenes = {};
  // Solo las escenas 360 se registran en Pannellum; las de tipo "video" se
  // muestran aparte (PASO 6b). Sus ids siguen en idsValidos para que un hotspot
  // de una 360 pueda saltar a un video.
  for (const e of proyecto.escenas.filter((x) => !esEscenaVideo(x))) {
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
          // irAEscena() decide si el destino es otra 360 o una escena de video.
          clickHandlerFunc: () => { if (h.destino !== escenaActualId) irAEscena(h.destino); },
        })),
    };
  }
  return {
    default: {
      firstScene: primeraEscena360Id(),
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
  const hay360 = proyecto.escenas.some((e) => !esEscenaVideo(e));
  const inicialId = proyecto.escenaInicial || proyecto.escenas[0].id;

  if (hay360) {
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
  } else {
    // Recorrido solo-video: no se crea Pannellum.
    ocultarAviso();
    $barra.hidden = false;
    $selector.hidden = false;
  }

  construirSelector();

  // Arranca en la escena inicial. Si es un video, se muestra encima del visor.
  if (esEscenaVideo(escenaPorId(inicialId))) irAEscena(inicialId);
  else alCambiarEscena(inicialId);
}

/* ============================================================================
   PASO 6b · ESCENAS DE TIPO "VIDEO"
   ----------------------------------------------------------------------------
   Una escena puede ser un video en vez de una panorámica 360. Vive en la misma
   barra de escenas. El <iframe>/<video> se crea SOLO al activar la escena
   (carga diferida) y se destruye al salir (para cortar la reproducción).

   El campo "video" del JSON admite:
     - YouTube (cualquier forma: watch?v=, youtu.be/, /embed/, /shorts/)
     - Vimeo (vimeo.com/123, player.vimeo.com/video/123…)
     - ruta local a un .mp4, relativa a proyectos/<slug>/ (igual que "panorama")
   ========================================================================== */

/** Extrae el id (11 car.) de un video de YouTube de cualquier forma de URL. */
function idYouTube(url) {
  const patrones = [
    /[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)/,
    /youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    /\/embed\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
    /\/shorts\/([A-Za-z0-9_-]{11})(?:[?&#/]|$)/,
  ];
  for (const re of patrones) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Extrae el id numérico de un video de Vimeo. */
function idVimeo(url) {
  const m = url.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/i);
  return m ? m[1] : null;
}

/**
 * Interpreta el campo "video" de una escena.
 * @returns {{plataforma:"youtube"|"vimeo"|"archivo", embed?:string, src?:string}|null}
 *          null si la fuente no es válida (así validarProyecto() omite la escena).
 */
function interpretarVideo(ref) {
  if (typeof ref !== "string" || !ref.trim()) return null;
  const v = ref.trim();

  if (/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(v)) {
    const id = idYouTube(v);
    // youtube-nocookie + rel=0 (sin videos de otros canales) + sin autoplay.
    return id
      ? { plataforma: "youtube", embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` }
      : null;
  }
  if (/vimeo\.com/i.test(v)) {
    const id = idVimeo(v);
    return id ? { plataforma: "vimeo", embed: `https://player.vimeo.com/video/${id}?dnt=1` } : null;
  }
  // Otra URL http(s) cualquiera no está soportada (solo YouTube/Vimeo o archivo local).
  if (/^https?:\/\//i.test(v)) {
    console.warn(`[Panoramika] URL de video no reconocida (usa YouTube, Vimeo o un .mp4 local): ${v}`);
    return null;
  }
  // Ruta local, relativa a la carpeta del proyecto (se resuelve con baseProyecto al usarla).
  return { plataforma: "archivo", src: v.replace(/^\/+/, "") };
}

/** Construye el reproductor y lo muestra ocupando el área del visor. */
function mostrarVideo(escena) {
  const info = interpretarVideo(escena.video);
  if (!info) {
    console.error(`[Panoramika] La escena de video "${escena.id}" no tiene una fuente válida.`);
    mostrarAviso("No se pudo cargar el video de esta escena.", { error: true });
    return;
  }

  // Carga diferida: el <iframe>/<video> nace aquí, no al cargar el recorrido.
  $video.innerHTML = "";
  const marco = document.createElement("div");
  // --embed = proporción fija 16:9 (YouTube/Vimeo); --archivo = se ajusta al
  // video real (un .mp4 a pulso puede ser vertical).
  const esArchivo = info.plataforma === "archivo";
  marco.className = "video__marco " + (esArchivo ? "video__marco--archivo" : "video__marco--embed");

  let media;
  if (info.plataforma === "youtube" || info.plataforma === "vimeo") {
    media = document.createElement("iframe");
    media.src = info.embed;
    media.loading = "lazy";
    media.allow = "fullscreen; picture-in-picture";
    media.setAttribute("allowfullscreen", "");
    media.referrerPolicy = "strict-origin-when-cross-origin";
    media.title = escena.titulo || "Video del recorrido";
  } else {
    media = document.createElement("video");
    media.src = baseProyecto + info.src;   // misma resolución de ruta que las panorámicas
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
    if (escena.poster) media.poster = baseProyecto + escena.poster;
    media.addEventListener("error", () => {
      console.error(`[Panoramika] No se pudo cargar el video: ${media.src}`);
      mostrarAviso("No se pudo cargar el video de esta escena.", { error: true });
    });
  }
  media.className = "video__media";
  marco.appendChild(media);
  $video.appendChild(marco);

  // Pausa cualquier inercia del visor y lo oculta (no lo destruye: al volver a
  // una 360 se reutiliza la misma instancia de Pannellum).
  if (visor) { try { visor.stopMovement(); } catch (e) { /* sin efecto: seguimos */ } }
  $panorama.hidden = true;
  $pista.classList.remove("--visible");
  $video.hidden = false;
  ocultarAviso();
}

/** Oculta el video y libera el reproductor (corta la reproducción). */
function ocultarVideo() {
  if ($video.hidden && $video.childElementCount === 0) return;
  $video.hidden = true;
  $video.innerHTML = "";
}

/**
 * Punto ÚNICO de navegación entre escenas: lo usan la barra (PASO 7) y los
 * hotspots (PASO 6). Decide entre mostrar un video o una panorámica 360.
 */
function irAEscena(id) {
  const e = escenaPorId(id);
  if (!e) { console.warn(`[Panoramika] Se pidió una escena inexistente: "${id}".`); return; }

  if (esEscenaVideo(e)) {
    mostrarVideo(e);
    alCambiarEscena(id);
    return;
  }

  // Escena 360: se restaura Pannellum.
  ocultarVideo();
  $panorama.hidden = false;
  if (visor) {
    visor.resize();                       // el contenedor pudo estar oculto (ancho 0)
    if (visor.getScene() === id) alCambiarEscena(id);   // ya estaba en esa escena
    else visor.loadScene(id);             // dispara "scenechange" → alCambiarEscena
  } else {
    alCambiarEscena(id);
  }
}

/* ============================================================================
   PASO 7 · INTERFAZ DEL VISOR
   ----------------------------------------------------------------------------
   Navegación: (1) marcadores dentro de la escena (estilo Street View) y
   (2) barra inferior SIEMPRE visible con todas las escenas. Nunca hace falta
   recargar para cambiar de vista.
   ========================================================================== */
const ICONO_ESCENA = { aerea: "◎", fachada: "⌂", exterior: "⌂" };
const ICONO_VIDEO = "▶";   // chip de una escena de tipo "video" (distinto al de las 360)

function construirSelector() {
  $selector.innerHTML = "";
  // Siempre se construye, aunque haya una sola escena (así el control es
  // predecible y se ve desde el principio).
  proyecto.escenas.forEach((e, i) => {
    const btn = document.createElement("button");
    btn.className = "nav-escena";
    btn.type = "button";
    btn.dataset.escena = e.id;
    const esVideo = esEscenaVideo(e);
    if (esVideo) btn.classList.add("nav-escena--video");
    const ico = esVideo ? ICONO_VIDEO : (ICONO_ESCENA[e.id] || String(i + 1));
    btn.innerHTML =
      `<span class="nav-escena__ico" aria-hidden="true">${ico}</span>` +
      `<span class="nav-escena__txt">${(e.titulo || e.id).replace(/</g, "&lt;")}</span>`;
    btn.addEventListener("click", () => {
      if (e.id !== escenaActualId) irAEscena(e.id);
    });
    $selector.appendChild(btn);
  });
}

function alCambiarEscena(idEscena) {
  escenaActualId = idEscena;
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
