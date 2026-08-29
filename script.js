/* ============================================================================
   Domo 360 — lógica del visor
   JavaScript "vanilla" (sin frameworks). Solo depende de Pannellum, que ya viene
   cargado desde el CDN en index.html (con respaldo local en /vendor/).

   Se lee de arriba abajo:
     PASO 1 · Datos del recorrido (lo único que editas al añadir tomas)
     PASO 2 · Referencias al DOM y utilidades de aviso
     PASO 3 · Carga defensiva de Pannellum y de las imágenes
     PASO 4 · Construcción de la configuración de Pannellum
     PASO 5 · Arranque del visor y interfaz (botones, hotspots, pista)
   ========================================================================== */

"use strict";

/* ============================================================================
   PASO 1 · DATOS DEL RECORRIDO
   ----------------------------------------------------------------------------
   Cada objeto de ESCENAS es una toma 360 equirectangular (relación 2:1).
   - id        : identificador corto y sin espacios (se usa internamente).
   - titulo    : texto visible en la barra y en el botón.
   - panorama  : ruta a la imagen dentro de assets/panoramas/.
   - hotspots  : puntos clicables que saltan a otra escena.
       · yaw   → giro horizontal en grados (-180 a 180). 0 = centro de la foto.
       · pitch → inclinación vertical en grados (-90 abajo, 90 arriba).
       · destino → id de la escena a la que salta.
       · texto → etiqueta del hotspot.

   Para AÑADIR una toma nueva: copia un bloque, cambia id/titulo/panorama y
   ajusta los hotspots. No hay que tocar nada más abajo.
   ========================================================================== */
const ESCENAS = [
  {
    id: "cocina",
    titulo: "Cocina",
    panorama: "assets/panoramas/pano-cocina.jpg",
    hotspots: [
      { yaw: 120, pitch: -3, destino: "sala", texto: "Ir a la sala" },
    ],
  },
  {
    id: "sala",
    titulo: "Sala",
    panorama: "assets/panoramas/pano-sala.jpg",
    hotspots: [
      { yaw: -60, pitch: -3, destino: "cocina", texto: "Volver a la cocina" },
    ],
  },
];

/* Escena con la que abre el recorrido (debe existir un id igual en ESCENAS). */
const ESCENA_INICIAL = "cocina";

/* Ruta a la copia local de Pannellum, por si el CDN falla. */
const PANNELLUM_LOCAL_JS = "vendor/pannellum/pannellum.js";

/* ============================================================================
   PASO 2 · REFERENCIAS AL DOM Y UTILIDADES DE AVISO
   ========================================================================== */
const $panorama       = document.getElementById("panorama");
const $escenaActual   = document.getElementById("escenaActual");
const $selector       = document.getElementById("selectorEscenas");
const $aviso          = document.getElementById("aviso");
const $avisoTexto     = document.getElementById("avisoTexto");
const $avisoReintentar = document.getElementById("avisoReintentar");
const $pista          = document.getElementById("pistaArrastre");

let visor = null; // instancia de Pannellum, se rellena en el PASO 5

/**
 * Muestra la capa de aviso a pantalla completa.
 * @param {string} texto  Mensaje para el usuario.
 * @param {{error?: boolean}} opciones  error:true pinta el estado de fallo
 *        (sin spinner) y enseña el botón "Reintentar".
 */
function mostrarAviso(texto, opciones = {}) {
  $avisoTexto.textContent = texto;
  $aviso.hidden = false;
  $aviso.classList.remove("--oculto");
  $aviso.classList.toggle("--error", opciones.error === true);
  $avisoReintentar.hidden = opciones.error !== true;
}

/** Oculta la capa de aviso con una transición suave. */
function ocultarAviso() {
  $aviso.classList.add("--oculto");
  // Espera a que termine el fundido antes de sacarlo del flujo.
  window.setTimeout(() => { $aviso.hidden = true; }, 320);
}

/* ============================================================================
   PASO 3 · CARGA DEFENSIVA
   ========================================================================== */

/**
 * Garantiza que window.pannellum exista.
 * El <script> del CDN en index.html ya debería haberlo definido; si no
 * (CDN caído, sin internet, bloqueado), inyectamos la copia local.
 * @returns {Promise<void>}
 */
function asegurarPannellum() {
  return new Promise((resolver, rechazar) => {
    if (window.pannellum) return resolver();

    console.warn("[Domo360] Pannellum no llegó del CDN. Probando copia local…");
    const s = document.createElement("script");
    s.src = PANNELLUM_LOCAL_JS;
    s.onload = () =>
      window.pannellum
        ? resolver()
        : rechazar(new Error("La copia local de Pannellum cargó pero no se inicializó."));
    s.onerror = () =>
      rechazar(new Error("No se pudo cargar Pannellum ni del CDN ni de /vendor/."));
    document.head.appendChild(s);
  });
}

/**
 * Comprueba que una imagen panorámica exista y se pueda decodificar ANTES de
 * pasársela a Pannellum. Así damos un mensaje claro en vez de un lienzo negro.
 * @param {string} src  Ruta de la imagen.
 * @returns {Promise<void>}
 */
function precargarImagen(src) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => {
      // Aviso útil, no bloqueante: una equirectangular debe ser 2:1.
      const proporcion = img.naturalWidth / img.naturalHeight;
      if (Math.abs(proporcion - 2) > 0.15) {
        console.warn(
          `[Domo360] "${src}" mide ${img.naturalWidth}×${img.naturalHeight} ` +
          `(proporción ${proporcion.toFixed(2)}:1). Lo ideal es 2:1.`
        );
      }
      resolver();
    };
    img.onerror = () => rechazar(new Error(`No se encontró o no cargó la imagen: ${src}`));
    img.src = src;
  });
}

/** Valida todas las panorámicas en paralelo. Rechaza si falta alguna. */
function validarImagenes() {
  return Promise.all(ESCENAS.map((e) => precargarImagen(e.panorama)));
}

/* ============================================================================
   PASO 4 · CONFIGURACIÓN DE PANNELLUM
   ----------------------------------------------------------------------------
   Traducimos nuestro array ESCENAS al formato que espera Pannellum:
   un objeto { idEscena: { type, panorama, hotSpots: [...] } }.

   Sobre la "carga diferida": Pannellum solo descarga la textura de la escena
   que se está viendo. Las demás se piden al saltar a ellas. Es decir, el lazy
   loading es nativo: no precargamos las 3 tomas de golpe.
   ========================================================================== */
function construirConfigPannellum() {
  const scenes = {};

  for (const escena of ESCENAS) {
    scenes[escena.id] = {
      type: "equirectangular",
      panorama: escena.panorama,
      autoLoad: true,
      hotSpots: escena.hotspots.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "scene",     // hotspot que cambia de escena
        text: h.texto,
        sceneId: h.destino,
      })),
    };
  }

  return {
    default: {
      firstScene: ESCENA_INICIAL,
      sceneFadeDuration: 700,     // fundido entre tomas
      autoLoad: true,             // abre sin pedir un clic previo
      autoRotate: -2,             // giro suave de presentación (grados/seg)
      autoRotateInactivityDelay: 3500, // se reanuda si el usuario no toca nada
      compass: false,
      showZoomCtrl: true,
      keyboardZoom: true,
      hfov: 110,                  // campo de visión inicial (sensación amplia)
    },
    scenes,
  };
}

/* ============================================================================
   PASO 5 · ARRANQUE DEL VISOR E INTERFAZ
   ========================================================================== */

/** Dibuja un botón en la barra inferior por cada escena. */
function construirSelector() {
  $selector.innerHTML = "";
  for (const escena of ESCENAS) {
    const btn = document.createElement("button");
    btn.className = "selector-escenas__btn";
    btn.type = "button";
    btn.textContent = escena.titulo;
    btn.dataset.escena = escena.id;
    btn.setAttribute("aria-current", String(escena.id === ESCENA_INICIAL));
    btn.addEventListener("click", () => {
      if (visor && visor.getScene() !== escena.id) visor.loadScene(escena.id);
    });
    $selector.appendChild(btn);
  }
}

/** Sincroniza barra superior + botón activo cuando cambia la escena. */
function alCambiarEscena(idEscena) {
  const escena = ESCENAS.find((e) => e.id === idEscena);
  $escenaActual.textContent = escena ? escena.titulo : "";
  for (const btn of $selector.children) {
    btn.setAttribute("aria-current", String(btn.dataset.escena === idEscena));
  }
}

/** Muestra la pista "Arrastra para mirar" y la esconde a la primera interacción. */
function gestionarPista() {
  $pista.classList.add("--visible");
  const esconder = () => {
    $pista.classList.remove("--visible");
    $panorama.removeEventListener("pointerdown", esconder);
  };
  $panorama.addEventListener("pointerdown", esconder, { once: true });
  window.setTimeout(esconder, 4500); // o sola tras unos segundos
}

/** Crea la instancia de Pannellum y conecta sus eventos. */
function iniciarVisor() {
  visor = window.pannellum.viewer($panorama, construirConfigPannellum());

  visor.on("load", () => {
    ocultarAviso();
    gestionarPista();
  });

  visor.on("scenechange", alCambiarEscena);

  // Error interno de Pannellum (p. ej. textura demasiado grande para el equipo).
  visor.on("error", (msg) => {
    console.error("[Domo360] Pannellum:", msg);
    mostrarAviso(
      "No se pudo mostrar esta toma en tu dispositivo. Prueba con otra o desde una computadora.",
      { error: true }
    );
  });

  construirSelector();
  alCambiarEscena(ESCENA_INICIAL);
}

/* --- Secuencia de arranque -------------------------------------------------- */
function arrancar() {
  mostrarAviso("Preparando el recorrido…");

  asegurarPannellum()
    .then(validarImagenes)
    .then(iniciarVisor)
    .catch((err) => {
      console.error("[Domo360]", err);
      mostrarAviso(
        "No se pudo iniciar el recorrido. Revisa tu conexión e inténtalo de nuevo.",
        { error: true }
      );
    });
}

/* El botón "Reintentar" recarga la página: la forma más simple y fiable de
   volver a un estado limpio si algo falló a medias. */
$avisoReintentar.addEventListener("click", () => window.location.reload());

arrancar();
