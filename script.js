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
const PROYECTO_POR_DEFECTO = "depto-lagos";
const PANNELLUM_LOCAL_JS = "vendor/pannellum/pannellum.js";

/* Modo editor de polígonos para las escenas "mapa-lotes": SOLO se activa con
   ?editar=1 en la URL. Es una herramienta interna para trazar los lotes; nunca
   debe estorbar al cliente final. Se lee una sola vez al cargar. */
const MODO_EDITOR =
  new URLSearchParams(window.location.search).get("editar") === "1";

/* ============================================================================
   PASO 2 · REFERENCIAS AL DOM Y UTILIDADES DE AVISO
   ========================================================================== */
const $ = (id) => document.getElementById(id);

const $panorama = $("panorama");
const $video = $("video");
const $mapa = $("mapaLotes");
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

/** ¿La escena es de tipo "mapa-lotes" (foto aérea + polígonos de lotes)? */
function esEscenaMapa(e) {
  return !!e && e.tipo === "mapa-lotes";
}

/** ¿La escena es una panorámica 360 "normal" (la que maneja Pannellum)?
 *  Es 360 todo lo que NO es video ni mapa de lotes. */
function esEscena360(e) {
  return !!e && !esEscenaVideo(e) && !esEscenaMapa(e);
}

/**
 * Convierte el campo "puntos" de un lote ("x,y x,y x,y …", en % de la imagen)
 * en un arreglo [[x,y], …]. Devuelve null si el formato es inválido o hay
 * menos de 3 vértices (así validarProyecto() ignora ese lote sin romper el mapa).
 */
function parsearPuntos(str) {
  if (typeof str !== "string" || !str.trim()) return null;
  const pares = str.trim().split(/\s+/);
  const vertices = [];
  for (const par of pares) {
    const coords = par.split(",");
    if (coords.length !== 2) return null;
    const x = Number(coords[0]);
    const y = Number(coords[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    vertices.push([x, y]);
  }
  return vertices.length >= 3 ? vertices : null;
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
    // --- Escenas de video: 'video' válido y sin hotspots ---
    if (esEscenaVideo(e)) {
      if (interpretarVideo(e.video) === null) {
        console.warn(`[Panoramika] La escena de video "${e.id || "(sin id)"}" no tiene un 'video' válido; se omite.`);
        return false;
      }
      if (Array.isArray(e.hotspots) && e.hotspots.length > 0) {
        console.warn(`[Panoramika] La escena de video "${e.id}" trae 'hotspots'; se ignoran (una escena de video se navega desde la barra).`);
        e.hotspots = [];
      }
      return true;
    }
    // --- Escenas de mapa de lotes: 'imagen' válida; los lotes se depuran uno a uno ---
    if (esEscenaMapa(e)) {
      if (typeof e.imagen !== "string" || !e.imagen.trim()) {
        console.warn(`[Panoramika] La escena mapa-lotes "${e.id || "(sin id)"}" no tiene 'imagen'; se omite.`);
        return false;
      }
      if (Array.isArray(e.hotspots) && e.hotspots.length > 0) {
        console.warn(`[Panoramika] La escena mapa-lotes "${e.id}" trae 'hotspots'; se ignoran (se navega desde la barra).`);
        e.hotspots = [];
      }
      // Cada lote con 'puntos' mal formados se ignora; los demás se pintan igual.
      const entrada = Array.isArray(e.lotes) ? e.lotes : [];
      e.lotes = entrada.filter((l) => {
        const vertices = parsearPuntos(l && l.puntos);
        if (!vertices) {
          console.warn(`[Panoramika] El lote "${(l && l.id) || "(sin id)"}" de "${e.id}" tiene 'puntos' inválidos (mín. 3 vértices "x,y"); se ignora.`);
          return false;
        }
        l._vertices = vertices;   // caché ya parseada para PASO 6c
        return true;
      });
      if (e.lotes.length === 0)
        console.warn(`[Panoramika] La escena mapa-lotes "${e.id}" no tiene lotes válidos; se mostrará solo la foto aérea.`);
      return true;
    }
    return true;   // escena 360 normal
  });
  if (p.escenas.length === 0) throw new Error("El proyecto no tiene escenas válidas.");

  for (const e of p.escenas) {
    if (esEscenaVideo(e) || esEscenaMapa(e)) {
      if (!e.id) throw new Error(`Una escena de ${e.tipo} no tiene 'id' (${JSON.stringify(e)}).`);
    } else if (!e.id || !e.panorama) {
      throw new Error(`Una escena no tiene 'id' o 'panorama' (${JSON.stringify(e)}).`);
    }
  }

  const ids = new Set(p.escenas.map((e) => e.id));
  if (p.escenaInicial && !ids.has(p.escenaInicial))
    throw new Error(`escenaInicial "${p.escenaInicial}" no existe en las escenas.`);
  // Hotspots (solo en escenas 360) que apuntan a escenas inexistentes: aviso, no error.
  for (const e of p.escenas) {
    if (!esEscena360(e)) continue;
    for (const h of e.hotspots || []) {
      if (!ids.has(h.destino))
        console.warn(`[Panoramika] Hotspot en "${e.id}" apunta a "${h.destino}", que no existe.`);
    }
  }
  // Lotes que enlazan a una escena inexistente: se anula el enlace (sin botón "Ver en 360"), con aviso.
  for (const e of p.escenas) {
    if (!esEscenaMapa(e)) continue;
    for (const l of e.lotes) {
      if (l.escena && !ids.has(l.escena)) {
        console.warn(`[Panoramika] El lote "${l.id}" enlaza a la escena "${l.escena}", que no existe; se omite el botón "Ver en 360".`);
        l.escena = null;
      }
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
  if (!esEscena360(escena))
    escena = proyecto.escenas.find(esEscena360);
  if (!escena) return Promise.resolve();   // recorrido solo de video / mapa
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

/** id de la escena 360 con la que debe arrancar Pannellum (nunca video ni mapa). */
function primeraEscena360Id() {
  const inicial = escenaPorId(proyecto.escenaInicial);
  if (esEscena360(inicial)) return inicial.id;
  const primera = proyecto.escenas.find(esEscena360);
  return primera ? primera.id : null;
}

function construirConfigPannellum() {
  const idsValidos = new Set(proyecto.escenas.map((x) => x.id));
  const scenes = {};
  // Solo las escenas 360 se registran en Pannellum; las de tipo "video" (PASO 6b)
  // y "mapa-lotes" (PASO 6c) se muestran aparte. Sus ids siguen en idsValidos
  // para que un hotspot de una 360 pueda saltar a ellas.
  for (const e of proyecto.escenas.filter(esEscena360)) {
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
  const hay360 = proyecto.escenas.some(esEscena360);
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

  // Arranca en la escena inicial. Si es video o mapa de lotes, irAEscena() la
  // muestra encima del visor; si es 360, alCambiarEscena() basta (Pannellum ya
  // la cargó como firstScene).
  if (esEscena360(escenaPorId(inicialId))) alCambiarEscena(inicialId);
  else irAEscena(inicialId);
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
  ocultarMapaLotes();
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

  if (esEscenaMapa(e)) {
    mostrarMapaLotes(e);
    alCambiarEscena(id);
    return;
  }

  // Escena 360: se restaura Pannellum.
  ocultarVideo();
  ocultarMapaLotes();
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
   PASO 6c · ESCENAS DE TIPO "mapa-lotes"
   ----------------------------------------------------------------------------
   Una escena puede ser el mapa de lotes de un fraccionamiento: una foto aérea
   con un polígono por lote encima. Vive en la misma barra de escenas (chip ▦).
   Igual que el video (PASO 6b), NO usa Pannellum y todo se crea al activar la
   escena (carga diferida) y se destruye al salir.

   ALINEACIÓN SVG ↔ IMAGEN
     El <img> y el <svg> van dentro de un contenedor `position:relative` que se
     ajusta al tamaño de la imagen (inline-block). El <svg> usa
       viewBox="0 0 100 100"  preserveAspectRatio="none"
     así su sistema de coordenadas se ESTIRA exacto al cuadro de la imagen: el
     punto "50,50" es el centro de la foto en cualquier pantalla y proporción,
     sin recalcular nada. Por eso los "puntos" de un lote van en % (0..100) del
     ancho/alto. El estiramiento no es uniforme, así que los polígonos llevan
     vector-effect="non-scaling-stroke" para que el borde no se deforme.

   FORMATO DE "puntos"
     "x,y x,y x,y …"  — vértices separados por espacio, cada uno "x,y" con x e y
     en % de la imagen (0 = borde izq./sup., 100 = borde der./inf.). Mínimo 3.
   ========================================================================== */

const SVG_NS = "http://www.w3.org/2000/svg";
const ESTATUS_LOTE = ["disponible", "apartado", "vendido"];
const ETIQUETA_ESTATUS = { disponible: "Disponible", apartado: "Apartado", vendido: "Vendido" };

let mapaLimpieza = [];       // funciones para soltar listeners al salir del mapa
let mapaHuboArrastre = false; // el último gesto sobre el mapa fue un arrastre (no abrir panel)
let panelLote = null;        // { fondo, panel, poly } del panel de lote abierto

/** Escapa texto que se inyecta como HTML (ids, notas y precios vienen del JSON). */
function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Normaliza el estatus de un lote a uno válido (default "disponible", con aviso). */
function estatusLote(l) {
  if (ESTATUS_LOTE.includes(l.estatus)) return l.estatus;
  if (l.estatus != null)
    console.warn(`[Panoramika] El lote "${l.id}" tiene estatus "${l.estatus}" no reconocido; se usa "disponible".`);
  return "disponible";
}

/** Centro aproximado de un polígono (promedio de vértices), en % de la imagen. */
function centroPuntos(vertices) {
  let sx = 0, sy = 0;
  for (const [x, y] of vertices) { sx += x; sy += y; }
  return [sx / vertices.length, sy / vertices.length];
}

/** Construye y muestra la escena de mapa de lotes sobre el área del visor. */
function mostrarMapaLotes(escena) {
  cerrarPanelLote();
  desmontarMapa();
  $mapa.innerHTML = "";

  // Estructura: viewport (recorta) > lienzo (se mueve/zoom) > img + svg.
  const viewport = document.createElement("div");
  viewport.className = "mapa-lotes__viewport";
  const lienzo = document.createElement("div");
  lienzo.className = "mapa-lotes__lienzo";

  const img = document.createElement("img");
  img.className = "mapa-lotes__img";
  img.alt = "Vista aérea de " + (escena.titulo || "el fraccionamiento");
  img.decoding = "async";
  img.draggable = false;
  img.addEventListener("error", () => {
    console.error(`[Panoramika] No se pudo cargar la imagen del mapa de lotes: ${img.src}`);
    mostrarAviso("No se pudo cargar la imagen del mapa de lotes.", { error: true });
  });
  img.src = baseProyecto + escena.imagen;   // misma resolución de ruta que las panorámicas

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "mapa-lotes__svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  if (MODO_EDITOR) svg.classList.add("mapa-lotes__svg--editor");

  lienzo.append(img, svg);
  viewport.appendChild(lienzo);
  $mapa.appendChild(viewport);

  // Un polígono (+ etiqueta con el id) por lote válido.
  const lotes = Array.isArray(escena.lotes) ? escena.lotes : [];
  for (const lote of lotes) {
    const est = estatusLote(lote);

    const poly = document.createElementNS(SVG_NS, "polygon");
    poly.setAttribute("points", lote._vertices.map((p) => p.join(",")).join(" "));
    poly.setAttribute("class", `mapa-lote mapa-lote--${est}`);
    poly.setAttribute("vector-effect", "non-scaling-stroke");
    if (!MODO_EDITOR) {
      poly.setAttribute("tabindex", "0");
      poly.setAttribute("role", "button");
      poly.setAttribute("aria-label", `Lote ${lote.id}: ${ETIQUETA_ESTATUS[est]}`);
      poly.addEventListener("click", () => {
        if (!mapaHuboArrastre) abrirPanelLote(lote, est, poly);
      });
      poly.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrirPanelLote(lote, est, poly); }
      });
    }
    svg.appendChild(poly);

    // Etiqueta con el id: un <span> en % (un <text> del SVG se deformaría con
    // preserveAspectRatio="none").
    const [cx, cy] = centroPuntos(lote._vertices);
    const tag = document.createElement("span");
    tag.className = "mapa-lote__tag";
    tag.textContent = lote.id;
    tag.style.left = cx + "%";
    tag.style.top = cy + "%";
    lienzo.appendChild(tag);
  }

  if (escena.leyenda !== false) $mapa.appendChild(construirLeyenda());

  // Fuera del editor: zoom + paneo. En el editor: el click coloca vértices.
  if (MODO_EDITOR) montarEditorLotes(lienzo, img, svg);
  else activarZoomPaneo(viewport, lienzo);

  // Oculta 360 y video (sin destruir Pannellum: al volver se reutiliza).
  if (visor) { try { visor.stopMovement(); } catch (e) { /* seguimos */ } }
  ocultarVideo();
  $panorama.hidden = true;
  $pista.classList.remove("--visible");
  $mapa.hidden = false;
  ocultarAviso();
}

/** Oculta el mapa y suelta sus listeners (para no acumular basura entre escenas). */
function ocultarMapaLotes() {
  if ($mapa.hidden && $mapa.childElementCount === 0) return;
  cerrarPanelLote();
  desmontarMapa();
  $mapa.hidden = true;
  $mapa.innerHTML = "";
}

/** Ejecuta y vacía la lista de "des-montadores" registrados por el mapa activo. */
function desmontarMapa() {
  for (const soltar of mapaLimpieza) { try { soltar(); } catch (e) { /* nada */ } }
  mapaLimpieza = [];
  mapaHuboArrastre = false;
}

/** Leyenda de colores disponible / apartado / vendido. */
function construirLeyenda() {
  const ley = document.createElement("div");
  ley.className = "mapa-lotes__leyenda";
  for (const est of ESTATUS_LOTE) {
    const item = document.createElement("span");
    item.className = "mapa-lotes__leyenda-item";
    const punto = document.createElement("i");
    punto.className = `mapa-lotes__punto mapa-lotes__punto--${est}`;
    item.append(punto, document.createTextNode(ETIQUETA_ESTATUS[est]));
    ley.appendChild(item);
  }
  return ley;
}

/* --- Panel de detalle de un lote ------------------------------------------- */
function abrirPanelLote(lote, estatus, poly) {
  cerrarPanelLote();
  if (poly) poly.classList.add("mapa-lote--activo");

  const fondo = document.createElement("div");
  fondo.className = "lote-panel__fondo";
  fondo.addEventListener("click", cerrarPanelLote);

  const panel = document.createElement("aside");
  panel.className = "lote-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", `Lote ${lote.id}`);

  const bloques = [
    `<button class="lote-panel__cerrar" type="button" aria-label="Cerrar">✕</button>`,
    `<p class="lote-panel__id">Lote ${escaparHtml(lote.id)}</p>`,
    `<span class="lote-panel__estatus lote-panel__estatus--${estatus}">${ETIQUETA_ESTATUS[estatus]}</span>`,
  ];
  const datos = [];
  if (lote.m2 != null && lote.m2 !== "")
    datos.push(`<div class="lote-panel__dato"><dt>Superficie</dt><dd>${escaparHtml(lote.m2)} m²</dd></div>`);
  if (lote.precio)
    datos.push(`<div class="lote-panel__dato"><dt>Precio</dt><dd>${escaparHtml(lote.precio)}</dd></div>`);
  if (datos.length) bloques.push(`<dl class="lote-panel__datos">${datos.join("")}</dl>`);
  if (lote.nota) bloques.push(`<p class="lote-panel__nota">${escaparHtml(lote.nota)}</p>`);
  if (lote.escena) bloques.push(`<button class="lote-panel__ver btn-primario" type="button">Ver este lote en 360</button>`);
  panel.innerHTML = bloques.join("");

  panel.querySelector(".lote-panel__cerrar").addEventListener("click", cerrarPanelLote);
  const ver = panel.querySelector(".lote-panel__ver");
  if (ver) ver.addEventListener("click", () => {
    const destino = lote.escena;
    cerrarPanelLote();
    irAEscena(destino);
  });

  document.body.append(fondo, panel);
  panelLote = { fondo, panel, poly };
}

function cerrarPanelLote() {
  if (!panelLote) return;
  panelLote.fondo.remove();
  panelLote.panel.remove();
  if (panelLote.poly) panelLote.poly.classList.remove("mapa-lote--activo");
  panelLote = null;
}

/* --- Zoom (+/−, rueda, pellizco) y paneo (arrastre) ----------------------- */
function activarZoomPaneo(viewport, lienzo) {
  const MIN = 1, MAX = 4;
  let escala = 1, tx = 0, ty = 0;

  const aplicar = () => { lienzo.style.transform = `translate(${tx}px, ${ty}px) scale(${escala})`; };
  const limitar = () => {
    // No dejar que el lienzo se despegue del viewport al panear.
    const maxX = Math.max(0, (lienzo.offsetWidth * escala - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (lienzo.offsetHeight * escala - viewport.clientHeight) / 2);
    tx = Math.min(maxX, Math.max(-maxX, tx));
    ty = Math.min(maxY, Math.max(-maxY, ty));
  };
  const zoomA = (nueva) => {
    escala = Math.min(MAX, Math.max(MIN, nueva));
    if (escala === 1) { tx = 0; ty = 0; }
    limitar(); aplicar();
    viewport.classList.toggle("--ampliado", escala > 1);
  };

  // Botones +/−
  const zoom = document.createElement("div");
  zoom.className = "mapa-lotes__zoom";
  const btnMas = document.createElement("button");
  btnMas.type = "button"; btnMas.className = "mapa-lotes__zoom-btn";
  btnMas.setAttribute("aria-label", "Acercar"); btnMas.textContent = "+";
  const btnMenos = document.createElement("button");
  btnMenos.type = "button"; btnMenos.className = "mapa-lotes__zoom-btn";
  btnMenos.setAttribute("aria-label", "Alejar"); btnMenos.textContent = "−";
  btnMas.addEventListener("click", () => zoomA(escala * 1.4));
  btnMenos.addEventListener("click", () => zoomA(escala / 1.4));
  zoom.append(btnMas, btnMenos);
  $mapa.appendChild(zoom);

  // Rueda del ratón
  const alRodar = (e) => { e.preventDefault(); zoomA(escala * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); };
  viewport.addEventListener("wheel", alRodar, { passive: false });

  // Arrastre (1 puntero) + pellizco (2 punteros)
  const punteros = new Map();
  let distPrev = 0, x0 = 0, y0 = 0, movido = 0, arrastrando = false;

  const alBajar = (e) => {
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 1) {
      arrastrando = true; movido = 0; x0 = e.clientX; y0 = e.clientY;
      mapaHuboArrastre = false;
    } else if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      distPrev = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const alMover = (e) => {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size >= 2) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (distPrev > 0) zoomA(escala * (d / distPrev));
      distPrev = d;
      mapaHuboArrastre = true;
      return;
    }
    if (!arrastrando || escala <= 1) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = e.clientX; y0 = e.clientY;
    movido += Math.abs(dx) + Math.abs(dy);
    if (movido > 6) {
      mapaHuboArrastre = true;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    }
    tx += dx; ty += dy; limitar(); aplicar();
  };
  const alSoltar = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) distPrev = 0;
    if (punteros.size === 0) arrastrando = false;
  };
  viewport.addEventListener("pointerdown", alBajar);
  viewport.addEventListener("pointermove", alMover);
  viewport.addEventListener("pointerup", alSoltar);
  viewport.addEventListener("pointercancel", alSoltar);

  mapaLimpieza.push(() => {
    viewport.removeEventListener("wheel", alRodar);
    viewport.removeEventListener("pointerdown", alBajar);
    viewport.removeEventListener("pointermove", alMover);
    viewport.removeEventListener("pointerup", alSoltar);
    viewport.removeEventListener("pointercancel", alSoltar);
  });
}

/* --- MODO EDITOR (?editar=1): trazar los polígonos clic a clic ------------ */
function montarEditorLotes(lienzo, img, svg) {
  let enCurso = [];       // vértices del polígono en curso: [[x,y], …]
  const creados = [];     // lotes cerrados en esta sesión: [{ id, puntos, estatus }]
  const redondear = (n) => Math.round(n * 10) / 10;

  const capa = document.createElementNS(SVG_NS, "g");
  svg.appendChild(capa);

  const barra = document.createElement("div");
  barra.className = "editor-lotes";
  barra.innerHTML =
    `<p class="editor-lotes__titulo">Editor de lotes</p>` +
    `<p class="editor-lotes__ayuda"></p>` +
    `<div class="editor-lotes__btns">` +
      `<button type="button" data-acc="deshacer">Deshacer punto</button>` +
      `<button type="button" data-acc="cerrar">Cerrar polígono</button>` +
      `<button type="button" data-acc="borrar">Borrar último lote</button>` +
      `<button type="button" data-acc="copiar">Copiar JSON</button>` +
    `</div>` +
    `<ol class="editor-lotes__lista"></ol>`;
  $mapa.appendChild(barra);
  const ayuda = barra.querySelector(".editor-lotes__ayuda");
  const lista = barra.querySelector(".editor-lotes__lista");

  const redibujar = () => {
    capa.innerHTML = "";
    creados.forEach((l) => {
      const p = document.createElementNS(SVG_NS, "polygon");
      p.setAttribute("points", l.puntos);
      p.setAttribute("class", "editor-poly editor-poly--hecho");
      p.setAttribute("vector-effect", "non-scaling-stroke");
      capa.appendChild(p);
    });
    if (enCurso.length) {
      const linea = document.createElementNS(SVG_NS, "polyline");
      linea.setAttribute("points", enCurso.map((v) => v.join(",")).join(" "));
      linea.setAttribute("class", "editor-poly editor-poly--curso");
      linea.setAttribute("vector-effect", "non-scaling-stroke");
      capa.appendChild(linea);
      enCurso.forEach(([x, y]) => {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", "0.8");
        c.setAttribute("class", "editor-vertice");
        c.setAttribute("vector-effect", "non-scaling-stroke");
        capa.appendChild(c);
      });
    }
    ayuda.textContent = enCurso.length
      ? `${enCurso.length} vértice(s). Enter o "Cerrar polígono" para terminar.`
      : "Clic en la foto para poner vértices.";
    lista.innerHTML = creados.map((l) => `<li>${escaparHtml(l.id)} · ${l.estatus}</li>`).join("");
  };

  const alClic = (e) => {
    const r = img.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    enCurso.push([redondear(x), redondear(y)]);
    redibujar();
  };

  const cerrarPol = () => {
    if (enCurso.length < 3) { window.alert("Un lote necesita al menos 3 vértices."); return; }
    let id = "";
    try {
      id = (window.prompt("Id del lote (ej. A-12):", "L-" + (creados.length + 1)) || "").trim();
    } catch (e) {
      // Algún entorno sin prompt(): usamos un id automático para no perder el trazo.
      id = "L-" + (creados.length + 1);
      console.warn("[Panoramika] prompt() no disponible; id automático:", id);
    }
    if (!id) return;
    creados.push({ id, puntos: enCurso.map((v) => v.join(",")).join(" "), estatus: "disponible" });
    enCurso = [];
    redibujar();
  };

  const copiarJson = () => {
    const json = JSON.stringify(creados, null, 2);
    console.log("[Panoramika] lotes (editor):\n" + json);
    const btn = barra.querySelector('[data-acc="copiar"]');
    const prev = btn.textContent;
    const avisar = (t) => { btn.textContent = t; window.setTimeout(() => { btn.textContent = prev; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(json).then(() => avisar("¡Copiado!"), () => avisar("Ver consola"));
    else avisar("Ver consola");
  };

  const alTecla = (e) => { if (e.key === "Enter") { e.preventDefault(); cerrarPol(); } };

  barra.querySelector(".editor-lotes__btns").addEventListener("click", (e) => {
    const acc = e.target.dataset.acc;
    if (acc === "deshacer") { enCurso.pop(); redibujar(); }
    else if (acc === "cerrar") cerrarPol();
    else if (acc === "borrar") { creados.pop(); redibujar(); }
    else if (acc === "copiar") copiarJson();
  });
  lienzo.addEventListener("click", alClic);
  document.addEventListener("keydown", alTecla);
  redibujar();

  mapaLimpieza.push(() => {
    lienzo.removeEventListener("click", alClic);
    document.removeEventListener("keydown", alTecla);
  });
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
const ICONO_MAPA = "▦";    // chip de una escena de tipo "mapa-lotes"

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
    const esMapa = esEscenaMapa(e);
    if (esVideo) btn.classList.add("nav-escena--video");
    if (esMapa) btn.classList.add("nav-escena--mapa");
    const ico = esVideo ? ICONO_VIDEO
      : esMapa ? ICONO_MAPA
      : (ICONO_ESCENA[e.id] || String(i + 1));
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
