/* ============================================================================
   Asistente de captura 360° — Panorámika
   JavaScript vanilla. Guía la toma de ~26 fotos para armar una esfera con Hugin.

   Orden de lectura:
     PASO 1 · Configuración (dianas, tolerancias, cámara)
     PASO 2 · Referencias al DOM + navegación entre pantallas
     PASO 3 · Permisos (cámara + sensores de movimiento)
     PASO 4 · Orientación del teléfono → hacia dónde apunta la cámara
     PASO 5 · Proyección: dónde dibujar cada diana en la pantalla
     PASO 6 · Bucle de captura: alinear → foto → siguiente
     PASO 7 · Pantalla final: revisar, compartir/guardar
   ========================================================================== */
"use strict";

/* ============================================================================
   PASO 1 · CONFIGURACIÓN
   ============================================================================
   La captura va por FILAS: primero el horizonte girando 360°, luego una fila
   inclinada hacia arriba, otra hacia abajo, y al final techo y piso.

   Clave del diseño (v8): el giro entre foto y foto es RELATIVO a la foto
   anterior (giras ~45° más), NO a un "norte" fijo. El giroscopio se desvía
   despacio, pero como cada paso es relativo, esa desviación no deja huecos.
   La brújula (que sí falla en interiores por los imanes) ya no se usa. */
const PASO_YAW = 45;              // grados de giro entre foto y foto
const FILAS = [
  { id: "horizonte", nombre: "el horizonte",       pitch:   0, disparos: 8 },
  { id: "arriba",    nombre: "un poco hacia arriba", pitch:  33, disparos: 8 },
  { id: "abajo",     nombre: "un poco hacia abajo",  pitch: -33, disparos: 8 },
];
const POLOS = [
  { id: "techo", nombre: "al techo", pitch:  82 },
  { id: "piso",  nombre: "al piso",  pitch: -82 },
];

/** Plan plano de disparos (26): cada uno sabe a qué fila/polo pertenece. */
const PLAN = [];
FILAS.forEach((f) => { for (let i = 0; i < f.disparos; i++) PLAN.push({ tipo: "fila", fila: f, i }); });
POLOS.forEach((p) => PLAN.push({ tipo: "polo", polo: p }));
const TOTAL = PLAN.length;

const TOL_YAW = 8;             // margen horizontal para "alineado"
const TOL_PITCH = 9;           // margen vertical
const TOL_POLO = 16;           // techo/piso: solo importa el pitch
const MS_PARA_DISPARAR = 700;  // sostener la alineación este tiempo
const FOV_GUIA_H = 58;         // grados horizontales que "caben" en la pantalla
const FOV_GUIA_V = 74;         // grados verticales (teléfono vertical)

/* ============================================================================
   PASO 2 · DOM + NAVEGACIÓN
   ========================================================================== */
const $ = (id) => document.getElementById(id);
const video = $("video");
const lienzo = $("lienzo");

const PANTALLAS = {
  intro: $("pantallaIntro"),
  permisos: $("pantallaPermisos"),
  tips: $("pantallaTips"),
  captura: $("pantallaCaptura"),
  fin: $("pantallaFin"),
};
function irA(nombre) {
  for (const [k, el] of Object.entries(PANTALLAS)) el.hidden = k !== nombre;
}

/* Estado */
const fotos = new Array(TOTAL).fill(null);  // Blob por disparo
const historial = [];                       // índices en orden de captura (para "rehacer")
let streamCamara = null;
let orientacionOK = false;  // llegan datos de los sensores
let bucleActivo = false;
let alineadaDesde = 0;      // timestamp desde que el objetivo está alineado

let idx = 0;                // disparo actual (0 .. TOTAL-1)
let objetivoYaw = null;     // yaw (marco del teléfono) donde va el círculo; null = "el que tengas ahora"
let objetivoPitch = 0;      // inclinación objetivo del disparo actual
let yawUltimoDisparo = 0;   // yaw del teléfono en el último disparo (para encadenar el siguiente)
let filaAnunciada = -1;     // para mostrar el cartel de "Fila N" una sola vez

/* ============================================================================
   PASO 3 · PERMISOS
   ========================================================================== */
const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const necesitaPermisoOrientacion =
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission === "function";

$("notaEscritorio").hidden = esMovil;

$("btnEmpezar").addEventListener("click", () => irA("permisos"));

/* iOS pide el permiso de orientación con un POPUP en JS (ya no hay interruptor en
   Ajustes desde iOS 16.4). requestPermission() SOLO funciona llamado dentro del
   gesto y antes de cualquier `await`. Va en su propio botón, separado del de la
   cámara, y es "best-effort": si falla, igual se puede continuar y probar. */

$("btnPermMovimiento").addEventListener("click", async () => {
  $("errorPermisos").hidden = true;
  const b = $("btnPermMovimiento");
  b.disabled = true;
  b.textContent = "1 · Activando…";

  if (necesitaPermisoOrientacion) {
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== "granted") mostrarAyuda();
    } catch (e) {
      console.warn("[Panoramika] requestPermission:", e);
      mostrarAyuda();
    }
  }
  escucharOrientacion();

  // ¿De verdad están llegando datos del sensor?
  setTimeout(() => {
    $("btnPermCamara").disabled = false;
    if (orientacionOK) {
      b.textContent = "1 · Movimiento ✓";
    } else {
      b.textContent = "1 · Reintentar movimiento";
      b.disabled = false;
      falloPermisos(
        necesitaPermisoOrientacion
          ? "Aún no llega la orientación. Toca de nuevo este botón; si sigue igual, continúa con la cámara igualmente."
          : "Este teléfono/navegador no está mandando la orientación."
      );
    }
  }, 1300);
});

$("btnPermCamara").addEventListener("click", async () => {
  $("errorPermisos").hidden = true;
  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 4096 },
        height: { ideal: 2160 },
      },
      audio: false,
    });
    video.srcObject = streamCamara;
    await video.play().catch(() => {});
  } catch (e) {
    mostrarAyuda();
    return falloPermisos("No se pudo abrir la cámara: " + textoError(e));
  }
  irA("tips");
});

function falloPermisos(msg) {
  const el = $("errorPermisos");
  el.textContent = msg;
  el.hidden = false;
}
function mostrarAyuda() { $("ayudaPermisos").hidden = false; }
function textoError(e) { return e && e.message ? e.message : String(e); }

/* ============================================================================
   PASO 4 · ORIENTACIÓN DEL TELÉFONO
   ----------------------------------------------------------------------------
   El evento deviceorientation da alpha/beta/gamma (giro del aparato). Con la
   matriz de rotación del estándar W3C sacamos hacia dónde mira la cámara
   TRASERA (vector (0,0,−1) del aparato, llevado al mundo) y de ahí yaw y pitch.

   Se usa SOLO el giroscopio (alpha/beta/gamma). La brújula
   (webkitCompassHeading) se descartó: en interiores brinca por los imanes
   (monitor, bocinas…) y arruinaba la captura. El giroscopio se desvía despacio,
   pero como en v8 cada giro es relativo al disparo anterior, no deja huecos.
   ========================================================================== */
let yawTel = 0, pitchTel = 0, rollTel = 0;
let ultimoDatoOrient = 0;      // timestamp del último evento válido
let listenerOrientPuesto = false;

function escucharOrientacion() {
  if (listenerOrientPuesto) return;   // no duplicar al reintentar
  listenerOrientPuesto = true;
  window.addEventListener("deviceorientation", (e) => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    orientacionOK = true;
    ultimoDatoOrient = performance.now();

    const a = e.alpha * Math.PI / 180;
    const b = e.beta * Math.PI / 180;
    const g = e.gamma * Math.PI / 180;
    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    // Tercera columna de R = Rz(a)·Rx(b)·Ry(g)  →  eje Z del aparato en el mundo.
    // La cámara trasera mira a −Z, así que negamos.
    const mundoX = -(cA * sG + cG * sA * sB);
    const mundoY = -(sA * sG - cA * cG * sB);
    const mundoZ = -(cB * cG);

    pitchTel = Math.asin(Math.max(-1, Math.min(1, mundoZ))) * 180 / Math.PI;
    yawTel = Math.atan2(mundoX, mundoY) * 180 / Math.PI;
    rollTel = e.gamma;
  }, true);
}

/** Diferencia de ángulos normalizada a −180..180. */
function difAngulo(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/* ============================================================================
   PASO 5 · PROYECCIÓN (dónde dibujar la diana)
   ========================================================================== */
const elDiana = $("diana");
const elFlecha = $("flecha");
const elMira = $("mira"); // referencia visual, no se mueve

function pintarDiana(dyaw, dpitch, alineada, esPolo) {
  const w = window.innerWidth, h = window.innerHeight;
  // grados → fracción de pantalla
  let x = w / 2 + (dyaw / FOV_GUIA_H) * w;
  let y = h / 2 - (dpitch / FOV_GUIA_V) * h;

  const dentro = x > 20 && x < w - 20 && y > 90 && y < h - 120;

  if (dentro || esPolo) {
    elDiana.hidden = false;
    elFlecha.hidden = true;
    elDiana.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px)`;
    elDiana.classList.toggle("--alineada", alineada);
  } else {
    // Fuera de cuadro: flecha apuntando hacia la diana.
    elDiana.hidden = true;
    elFlecha.hidden = false;
    const ang = Math.atan2(y - h / 2, x - w / 2) * 180 / Math.PI + 90;
    elFlecha.style.transform = `rotate(${ang}deg) translateY(-70px)`;
  }
}

/* ============================================================================
   PASO 6 · BUCLE DE CAPTURA
   ========================================================================== */
let nombreToma = "toma";

function limpiarNombre(txt) {
  return ((txt || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)) || "toma";
}

const yawPorDisparo = new Array(TOTAL).fill(null);  // yaw del teléfono en cada disparo hecho
let anuncioHasta = 0;                               // ms hasta cuándo mostrar el cartel de fila
let capturando = false;                             // evita disparos dobles mientras toBlob resuelve

$("btnComenzarCaptura").addEventListener("click", () => {
  nombreToma = limpiarNombre($("nombreToma").value);
  irA("captura");
  construirTiras();
  idx = 0;
  filaAnunciada = -1;
  entrarEnDisparo(0);
  bucleActivo = true;
  requestAnimationFrame(bucle);
});

$("btnReiniciar").addEventListener("click", () => {
  if (confirm("¿Reiniciar TODO? Se borran las fotos de esta sesión.")) {
    fotos.fill(null);
    yawPorDisparo.fill(null);
    historial.length = 0;
    idx = 0;
    filaAnunciada = -1;
    entrarEnDisparo(0);
    construirTiras();
  }
});

// Rehacer la última foto: la desmarca y vuelve a apuntar a esa posición.
$("btnRehacer").addEventListener("click", () => {
  const i = historial.pop();
  if (i === undefined) return;
  fotos[i] = null;
  yawPorDisparo[i] = null;
  idx = i;
  entrarEnDisparo(i);
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  actualizarProgreso();
});

/** Prepara el objetivo (pitch + yaw) del disparo i. */
function entrarEnDisparo(i) {
  const p = PLAN[i];
  alineadaDesde = 0;
  if (!p) return;
  if (p.tipo === "polo") {
    objetivoPitch = p.polo.pitch;
    objetivoYaw = null;                 // en los polos el giro no importa
  } else {
    objetivoPitch = p.fila.pitch;
    if (p.i === 0) {
      objetivoYaw = null;               // primera foto de la fila: donde apuntes
    } else {
      const prev = yawPorDisparo[i - 1];
      objetivoYaw = (prev == null ? yawTel : prev) + PASO_YAW;  // +45° respecto a la anterior
    }
  }
}

function construirTiras() {
  const cont = $("tiras");
  cont.innerHTML = "";
  PLAN.forEach((p, i) => {
    const t = document.createElement("span");
    t.className = "tira";
    // separación visual al empezar fila/polo nuevo
    if (i > 0 && grupoDe(p) !== grupoDe(PLAN[i - 1])) t.classList.add("--separa");
    cont.appendChild(t);
  });
  actualizarProgreso();
}
function grupoDe(p) { return p.tipo === "polo" ? p.polo.id : p.fila.id; }

function actualizarProgreso() {
  const hechas = fotos.filter(Boolean).length;
  $("progreso").textContent = `${hechas} / ${TOTAL}`;
  $("btnRehacer").disabled = historial.length === 0;
  [...$("tiras").children].forEach((t, i) => {
    t.classList.toggle("--hecha", !!fotos[i]);
    t.classList.toggle("--activa", i === idx && !fotos[i]);
  });
}

function bucle(ahora) {
  if (!bucleActivo) return;

  const avG = $("avisoGiro");

  // Sin datos de orientación no hay guía posible.
  if (!orientacionOK || ahora - ultimoDatoOrient > 2000) {
    avG.hidden = false;
    avG.innerHTML =
      "No llega la <strong>orientación</strong> del teléfono.<br>" +
      "Sal, recarga y vuelve a dar el permiso de movimiento.";
    return requestAnimationFrame(bucle);
  }

  if (idx >= TOTAL) return terminar();
  const p = PLAN[idx];
  const esPolo = p.tipo === "polo";

  // Cartel al cambiar de fila / entrar a un polo.
  const grupoIdx = FILAS.length + (esPolo ? POLOS.indexOf(p.polo) : 0);
  const claveGrupo = esPolo ? "polo-" + p.polo.id : "fila-" + FILAS.indexOf(p.fila);
  if (claveGrupo !== String(filaAnunciada)) {
    filaAnunciada = claveGrupo;
    anuncioHasta = ahora + 1800;
  }

  const acostado = Math.abs(rollTel) > 45;

  // dpitch y (si aplica) dyaw
  const dpitch = objetivoPitch - pitchTel;
  const dyaw = objetivoYaw == null ? 0 : difAngulo(objetivoYaw, yawTel);

  const alineada = !acostado && (
    esPolo || objetivoYaw == null
      ? Math.abs(dpitch) < (esPolo ? TOL_POLO : TOL_PITCH)
      : Math.abs(dyaw) < TOL_YAW && Math.abs(dpitch) < TOL_PITCH
  );

  pintarDiana(
    objetivoYaw == null ? 0 : dyaw,
    Math.max(-FOV_GUIA_V / 2, Math.min(FOV_GUIA_V / 2, dpitch)),
    alineada,
    esPolo || objetivoYaw == null
  );

  // Textos
  if (acostado) {
    avG.hidden = false; avG.textContent = "Pon el teléfono vertical";
  } else if (ahora < anuncioHasta) {
    avG.hidden = false;
    avG.innerHTML = esPolo
      ? `Ahora apunta <strong>${p.polo.nombre}</strong>`
      : (p.i === 0
          ? `Fila ${FILAS.indexOf(p.fila) + 1} de 3 — nivela a <strong>${p.fila.nombre}</strong> y gira`
          : "");
    if (!avG.innerHTML) avG.hidden = true;
  } else {
    avG.hidden = true;
  }

  $("instruccion").textContent =
    alineada ? "Quieto… tomando"
    : esPolo ? `Apunta ${p.polo.nombre}`
    : objetivoYaw == null ? `Nivela a ${p.fila.nombre}`
    : dyaw > TOL_YAW ? "Gira despacio a la derecha"
    : dyaw < -TOL_YAW ? "Te pasaste — regresa un poco a la izquierda"
    : Math.abs(dpitch) > TOL_PITCH ? (dpitch > 0 ? "Sube un poco el teléfono" : "Baja un poco el teléfono")
    : "Quieto";

  if (alineada && !capturando) {
    if (!alineadaDesde) alineadaDesde = ahora;
    if (ahora - alineadaDesde >= MS_PARA_DISPARAR) { capturarFoto(idx); alineadaDesde = 0; }
  } else if (!alineada) {
    alineadaDesde = 0;
  }

  actualizarProgreso();
  requestAnimationFrame(bucle);
}

function capturarFoto(indice) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  lienzo.width = vw;
  lienzo.height = vh;
  lienzo.getContext("2d").drawImage(video, 0, 0, vw, vh);
  yawPorDisparo[indice] = yawTel;        // dónde estabas: base del +45° del siguiente
  capturando = true;

  lienzo.toBlob((blob) => {
    capturando = false;
    if (!blob) return;
    const nueva = !fotos[indice];
    fotos[indice] = blob;
    if (nueva) historial.push(indice);
    if (navigator.vibrate) navigator.vibrate(60);
    const dest = $("destello");
    dest.classList.remove("--flash"); void dest.offsetWidth; dest.classList.add("--flash");
    // avanzar al siguiente disparo pendiente
    while (idx < TOTAL && fotos[idx]) idx++;
    if (idx < TOTAL) entrarEnDisparo(idx);
    actualizarProgreso();
  }, "image/jpeg", 0.92);
}

/* ============================================================================
   PASO 7 · PANTALLA FINAL
   ========================================================================== */
function terminar() {
  bucleActivo = false;
  irA("fin");

  const hechas = fotos.filter(Boolean).length;
  tandaActual = 0;
  const totalTandas = Math.ceil(hechas / TANDA);
  $("btnCompartir").textContent =
    totalTandas > 1 ? `Compartir a Drive (tanda 1 de ${totalTandas})` : "Compartir a Drive";

  $("finResumen").textContent =
    `Tomaste ${hechas} de ${TOTAL} fotos. ` +
    (hechas < TOTAL ? "Puedes repetir para completar las que falten." : "Cobertura completa.") +
    (totalTandas > 1 ? ` Se comparten en ${totalTandas} tandas: toca el botón, elige Drive, y repite.` : "");

  const vw = video.videoWidth || 0;
  $("finCalidad").textContent = vw >= 2400
    ? `Resolución por foto: ${vw}px de ancho. Suficiente para un buen recorrido.`
    : `Resolución por foto: ${vw || "?"}px de ancho — algo baja. Para máxima calidad, ` +
      `usa la cámara nativa siguiendo las mismas posiciones y súbelas manualmente.`;

  const g = $("galeria");
  g.innerHTML = "";
  fotos.forEach((b) => {
    if (!b) return;
    const img = document.createElement("img");
    img.src = URL.createObjectURL(b);
    img.loading = "lazy";
    g.appendChild(img);
  });
}

function archivos() {
  // Nombre: <toma>_AAMMDD_NN.jpg  → fácil de identificar y de ordenar.
  const d = new Date();
  const fecha = d.getFullYear().toString().slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return fotos
    .map((b, i) => b && new File(
      [b],
      `${nombreToma}_${fecha}_${String(i + 1).padStart(2, "0")}.jpg`,
      { type: "image/jpeg" }
    ))
    .filter(Boolean);
}

/* iOS falla al compartir 26 archivos de golpe (Drive rechaza el lote). Se manda
   en TANDAS: cada toque del botón comparte la siguiente tanda. */
const TANDA = 8;
let tandaActual = 0;

$("btnCompartir").addEventListener("click", async () => {
  const fs = archivos();
  const totalTandas = Math.ceil(fs.length / TANDA);
  const btn = $("btnCompartir");

  if (tandaActual >= totalTandas) {   // ya se mandaron todas → reiniciar contador
    tandaActual = 0;
  }

  const lote = fs.slice(tandaActual * TANDA, (tandaActual + 1) * TANDA);

  if (!(navigator.canShare && navigator.canShare({ files: lote }))) {
    alert('Tu navegador no permite compartir fotos. Usa Safari en el iPhone, o el botón "Descargar".');
    return;
  }

  try {
    await navigator.share({ files: lote, title: `Fotos 360 (${tandaActual + 1}/${totalTandas})` });
    tandaActual++;
    if (tandaActual >= totalTandas) {
      btn.textContent = "✓ Todas compartidas — repetir";
    } else {
      btn.textContent = `Compartir siguiente tanda (${tandaActual + 1} de ${totalTandas})`;
    }
  } catch (e) {
    // Cancelar no es error; cualquier otra cosa sí.
    if (e && e.name !== "AbortError") {
      btn.textContent = `Reintentar tanda ${tandaActual + 1} de ${totalTandas}`;
    }
  }
});

$("btnDescargar").addEventListener("click", () => {
  // En iOS baja de una en una y las guarda en "Descargas". Luego se suben a Drive.
  archivos().forEach((f, i) => {
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, i * 500);
  });
});

$("btnOtra").addEventListener("click", () => location.reload());

/* Al salir, apagar la cámara. */
window.addEventListener("pagehide", () => {
  if (streamCamara) streamCamara.getTracks().forEach((t) => t.stop());
});
