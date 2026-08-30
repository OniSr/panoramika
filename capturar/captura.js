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
   Las "dianas" son las direcciones a las que hay que apuntar. yaw = giro
   horizontal (0 = donde empezaste, aumenta al girar tu cuerpo a la derecha).
   pitch = inclinación (0 = horizonte, + = arriba, − = abajo).
   Tres filas con buen traslape + cenit + nadir = 26 tomas. */
function generarDianas() {
  const d = [];
  for (let i = 0; i < 8; i++) d.push({ yaw: i * 45, pitch: 0 });          // fila media
  for (let i = 0; i < 8; i++) d.push({ yaw: i * 45 + 22.5, pitch: 40 });  // fila alta
  for (let i = 0; i < 8; i++) d.push({ yaw: i * 45 + 22.5, pitch: -40 }); // fila baja
  d.push({ yaw: 0, pitch: 88 });   // cenit (cielo)
  d.push({ yaw: 0, pitch: -88 });  // nadir (suelo)
  return d;
}

const DIANAS = generarDianas();

const TOLERANCIA_GRADOS = 7;    // qué tan cerca hay que apuntar para "alinear"
const TOLERANCIA_POLO = 14;     // cenit/nadir: solo importa el pitch
const MS_PARA_DISPARAR = 800;   // hay que sostener la alineación este tiempo
const FOV_GUIA_H = 58;          // grados horizontales que "caben" en la pantalla
const FOV_GUIA_V = 74;          // grados verticales (teléfono vertical)

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
const fotos = new Array(DIANAS.length).fill(null); // Blob por diana
const historial = [];                              // índices en orden de captura (para "rehacer")
let streamCamara = null;
let refYaw = null;          // yaw del teléfono al empezar (cero relativo)
let orientacionOK = false;  // llegan datos de los sensores
let bucleActivo = false;
let alineadaDesde = 0;      // timestamp desde que la diana está alineada
let objetivoActual = -1;    // índice de diana que se está buscando

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
   ========================================================================== */
let yawTel = 0, pitchTel = 0, rollTel = 0;
let ultimoDatoOrient = 0;      // timestamp del último evento válido
let listenerOrientPuesto = false;
let brujulaOK = false;         // ¿tenemos rumbo de brújula (absoluto)?
let brujulaCalibrada = true;   // webkitCompassAccuracy razonable

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
    const mundoZ = -(cB * cG);

    pitchTel = Math.asin(Math.max(-1, Math.min(1, mundoZ))) * 180 / Math.PI;
    rollTel = e.gamma;

    // YAW: la brújula (webkitCompassHeading) es ABSOLUTA y no deriva con el
    // tiempo; e.alpha sí deriva y arruinaba la cobertura. Usamos la brújula
    // cuando está y caemos a la matriz solo si no hay.
    if (typeof e.webkitCompassHeading === "number" && e.webkitCompassHeading >= 0) {
      yawTel = e.webkitCompassHeading;   // 0 = norte, aumenta al girar a la derecha
      brujulaOK = true;
      if (typeof e.webkitCompassAccuracy === "number")
        brujulaCalibrada = e.webkitCompassAccuracy > 0 && e.webkitCompassAccuracy < 25;
    } else {
      const mundoY = -(sA * sG - cA * cG * sB);
      yawTel = Math.atan2(mundoX, mundoY) * 180 / Math.PI;
      brujulaOK = false;
    }
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

$("btnComenzarCaptura").addEventListener("click", () => {
  nombreToma = limpiarNombre($("nombreToma").value);
  irA("captura");
  construirTiras();
  refYaw = null; // se fija en el primer frame del bucle
  bucleActivo = true;
  requestAnimationFrame(bucle);
});

$("btnReiniciar").addEventListener("click", () => {
  if (confirm("¿Reiniciar TODO? Se borran las fotos de esta sesión.")) {
    fotos.fill(null);
    historial.length = 0;
    refYaw = null;
    construirTiras();
  }
});

// Rehacer solo la última foto: la desmarca para volver a apuntar a esa diana.
$("btnRehacer").addEventListener("click", () => {
  const i = historial.pop();
  if (i === undefined) return;
  fotos[i] = null;
  if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  $("instruccion").textContent = "Rehaciendo la última — vuelve a esa posición";
  actualizarProgreso();
});

function construirTiras() {
  const cont = $("tiras");
  cont.innerHTML = "";
  DIANAS.forEach((_, i) => {
    const t = document.createElement("span");
    t.className = "tira";
    t.dataset.i = i;
    cont.appendChild(t);
  });
  actualizarProgreso();
}

function actualizarProgreso() {
  const hechas = fotos.filter(Boolean).length;
  $("progreso").textContent = `${hechas} / ${DIANAS.length}`;
  $("btnRehacer").disabled = historial.length === 0;
  [...$("tiras").children].forEach((t, i) => {
    t.classList.toggle("--hecha", !!fotos[i]);
    t.classList.toggle("--activa", i === objetivoActual && !fotos[i]);
  });
  return hechas;
}

function siguienteObjetivo() {
  // La diana pendiente más cercana a donde apunta el teléfono ahora.
  let mejor = -1, mejorDist = Infinity;
  DIANAS.forEach((d, i) => {
    if (fotos[i]) return;
    const dyaw = difAngulo(d.yaw, yawRelativo());
    const dpitch = d.pitch - pitchTel;
    const dist = dyaw * dyaw + dpitch * dpitch;
    if (dist < mejorDist) { mejorDist = dist; mejor = i; }
  });
  return mejor;
}

function yawRelativo() {
  if (refYaw === null) return yawTel;
  return difAngulo(yawTel, refYaw); // 0 = donde empezaste
}

function bucle(ahora) {
  if (!bucleActivo) return;

  // Sin datos de orientación no hay guía posible: avisar y no seguir el bucle.
  const sinSensor = !orientacionOK || (ahora - ultimoDatoOrient > 2000);
  const avG = $("avisoGiro");
  if (sinSensor) {
    avG.hidden = false;
    avG.innerHTML =
      "No estoy recibiendo la <strong>orientación</strong> del teléfono.<br>" +
      "Sal, recarga la página y vuelve a dar el permiso de movimiento.";
    return requestAnimationFrame(bucle);
  }

  // Avisos que ocupan la capa central (prioridad: acostado > brújula sin calibrar).
  const acostado = Math.abs(rollTel) > 45;
  if (acostado) {
    avG.hidden = false;
    avG.textContent = "Pon el teléfono vertical";
  } else if (brujulaOK && !brujulaCalibrada) {
    avG.hidden = false;
    avG.innerHTML = "Mueve el teléfono en <strong>ocho</strong> para calibrar la brújula";
  } else {
    avG.hidden = true;
  }

  if (refYaw === null && orientacionOK) refYaw = yawTel;

  objetivoActual = siguienteObjetivo();

  if (objetivoActual === -1) return terminar();

  const d = DIANAS[objetivoActual];
  const esPolo = Math.abs(d.pitch) >= 80;
  const dyaw = difAngulo(d.yaw, yawRelativo());
  const dpitch = d.pitch - pitchTel;

  const alineada = esPolo
    ? Math.abs(dpitch) < TOLERANCIA_POLO
    : Math.abs(dyaw) < TOLERANCIA_GRADOS && Math.abs(dpitch) < TOLERANCIA_GRADOS;

  pintarDiana(esPolo ? 0 : dyaw, esPolo ? Math.max(-FOV_GUIA_V/2, Math.min(FOV_GUIA_V/2, dpitch)) : dpitch, alineada, esPolo);

  $("instruccion").textContent = alineada
    ? "¡Quieto! Tomando…"
    : (esPolo
        ? (d.pitch > 0 ? "Apunta al cielo" : "Apunta al suelo")
        : "Alinea el círculo con la mira");

  if (alineada && !acostado) {
    if (!alineadaDesde) alineadaDesde = ahora;
    if (ahora - alineadaDesde >= MS_PARA_DISPARAR) {
      capturarFoto(objetivoActual);
      alineadaDesde = 0;
    }
  } else {
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
  lienzo.toBlob((blob) => {
    if (!blob) return;
    const nueva = !fotos[indice];
    fotos[indice] = blob;
    if (nueva) historial.push(indice);   // solo si no estaba ya hecha
    if (navigator.vibrate) navigator.vibrate(60);
    const dest = $("destello");
    dest.classList.remove("--flash"); void dest.offsetWidth; dest.classList.add("--flash");
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
    `Tomaste ${hechas} de ${DIANAS.length} fotos. ` +
    (hechas < DIANAS.length ? "Puedes repetir para completar las que falten." : "Cobertura completa.") +
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
