/* ============================================================================
   Asistente de captura 360° — Panorámika
   JavaScript vanilla. Guía la toma de ~36 fotos para armar una esfera con Hugin.

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
   Captura v12 — "3 filas moderadas, sin polos", pensada para TRIPIÉ.
   Se toman 3 vueltas de 360°: una al nivel del HORIZONTE (0°), una un poco hacia
   ARRIBA (+30°) y una un poco hacia ABAJO (−30°). NO hay foto de techo ni de
   piso: los cascos de arriba y abajo (~±20° de pitch) se tapan luego con el
   logo (y en el piso saldría el tripié de todos modos).

   Por qué cambió (v11 → v12): v11 eran 2 filas a ±20° + 1 foto al techo. En
   prueba real ("Cuarto lagos 4", 33 fotos) la esfera cosió y quedó derecha,
   PERO: (a) la foto del techo nunca engancha (techo blanco liso, o agarra a
   alguien) y (b) 2 filas a ±20° dejaban bandas negras de ~40° arriba y abajo —
   demasiado para tapar con logo. v12: una fila MÁS (el horizonte) hace de ancla,
   y las inclinadas suben a ±30° → cobertura hasta ~±65°, bandas de ~20°.

   Se conserva de v8/v11:
   · "Paso denso": el giro entre foto y foto es CHICO (PASO_YAW = 30° → 12 fotos
     por vuelta). Sobra traslape horizontal AUNQUE el giroscopio se equivoque
     ±10°. (v6/v7/v8 fallaban con paso de 45°: dos fotos seguidas de la misma
     fila no traslapaban y Hugin no cosía la fila. 22.5° en v11 funcionó; 30° es
     el término medio: menos fotos, traslape aún de sobra.)
   · "Giro relativo": cada objetivo de yaw = (yaw real de la foto anterior +
     PASO_YAW), NO respecto a un "norte" fijo → la deriva lenta del giroscopio no
     se acumula en huecos. La brújula (webkitCompassHeading) sigue descartada.

   Cobertura vertical (FOV_GUIA_V ≈ 87°, cada fila "ve" ±43° de su centro):
   · Fila 0°   cubre −43°..+43°   ·  Fila +30° cubre −13°..+73°   ·  Fila −30° cubre −73°..+13°
     → se solapan de sobra en el horizonte; sin cubrir queda ~+73°..+90° y
       ~−73°..−90° (±17° de casco en cada polo) → lo tapa el logo. */
const PASO_YAW = 30;             // grados de giro entre foto y foto (12 por vuelta)
const FILAS = [
  { id: "horizonte", nombre: "el horizonte",        pitch:   0, disparos: 12 },
  { id: "arriba",    nombre: "un poco hacia arriba", pitch:  30, disparos: 12 },
  { id: "abajo",     nombre: "un poco hacia abajo",  pitch: -30, disparos: 12 },
];
const POLOS = [];   // v12: sin foto de techo ni piso (nunca enganchan; se tapan con logo)

/** Plan plano de disparos (36 = 12×3): cada uno sabe a qué fila pertenece. */
const PLAN = [];
FILAS.forEach((f) => { for (let i = 0; i < f.disparos; i++) PLAN.push({ tipo: "fila", fila: f, i }); });
POLOS.forEach((p) => PLAN.push({ tipo: "polo", polo: p }));
const TOTAL = PLAN.length;    // 36 — SIEMPRE derivado del PLAN, nunca un número suelto

// Tolerancias flojas: con traslape denso el stitch perdona imprecisión y así
// capturar no desespera.
const TOL_YAW = 10;           // margen horizontal para "alineado"
const TOL_PITCH = 10;         // margen vertical
const TOL_POLO = 16;          // (sin uso en v12: no hay polos; se deja por si vuelven)
const MS_PARA_DISPARAR = 500; // sostener la alineación este tiempo antes de disparar

// FOV de la cámara del iPhone, SOLO para proyectar la diana en la pantalla.
// El <canvas> del vídeo es 2160×4032 (retrato). Tomamos ~54° horizontales y
// derivamos el vertical de esa proporción retrato:
//     tan(V/2) = (4032 / 2160) · tan(H/2)   →   V ≈ 87°
// No necesita ser exactísimo: la diana se DIBUJA con esto, pero el disparo se
// DECIDE con diferencias de ángulo (TOL_YAW / TOL_PITCH), no con píxeles.
const FOV_GUIA_H = 54;
const FOV_GUIA_V = 87;

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
   matriz de rotación del estándar W3C  R = Rz(alpha)·Rx(beta)·Ry(gamma)  sacamos
   los TRES ejes del teléfono llevados al mundo (cada uno es una columna de R):
     · "adelante" (mundoX/Y/Z) = a dónde mira la cámara trasera = −(3ª columna)
     · "derecha"  (derX/Y/Z)   = eje +X del aparato = 1ª columna
     · "arriba"   (arrX/Y/Z)   = eje +Y del aparato = 2ª columna
   De "adelante" salen yaw y pitch. "derecha" y "arriba" se usan en el PASO 5
   para proyectar la diana en perspectiva y para detectar si el teléfono está
   rolado (acostado) de forma estable a cualquier inclinación.

   Se usa SOLO el giroscopio (alpha/beta/gamma). La brújula
   (webkitCompassHeading) se descartó: en interiores brinca por los imanes
   (monitor, bocinas…) y arruinaba la captura. El giroscopio se desvía despacio,
   pero como cada giro es relativo al disparo anterior (PASO 6), no deja huecos.
   ========================================================================== */
let yawTel = 0, pitchTel = 0;
let mundoX = 0, mundoY = 1, mundoZ = 0;   // "adelante": a dónde mira la cámara trasera, en el mundo
let derX = 1, derY = 0, derZ = 0;         // "derecha" del teléfono, en el mundo
let arrX = 0, arrY = 0, arrZ = 1;         // "arriba" del teléfono, en el mundo
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

    // 3ª columna de R = eje Z del aparato en el mundo. La cámara trasera mira a
    // −Z, así que negamos.
    mundoX = -(cA * sG + cG * sA * sB);
    mundoY = -(sA * sG - cA * cG * sB);
    mundoZ = -(cB * cG);

    // 1ª columna de R = eje X del aparato ("derecha") en el mundo.
    derX = cA * cG - sA * sB * sG;
    derY = sA * cG + cA * sB * sG;
    derZ = -(cB * sG);

    // 2ª columna de R = eje Y del aparato ("arriba") en el mundo.
    arrX = -(sA * cB);
    arrY = cA * cB;
    arrZ = sB;

    pitchTel = Math.asin(Math.max(-1, Math.min(1, mundoZ))) * 180 / Math.PI;
    yawTel = Math.atan2(mundoX, mundoY) * 180 / Math.PI;
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
   ----------------------------------------------------------------------------
   Proyección en PERSPECTIVA de verdad: la diana cae bien a CUALQUIER inclinación
   del teléfono. (v10 usaba una proyección lineal que solo servía con el aparato
   casi horizontal; al inclinarlo ±20-40° para las filas de arriba/abajo el yaw
   y el pitch se mezclaban en pantalla y el círculo caía en el sitio equivocado.)

   proyectarObjetivo(objYaw, objPitch):
     1. Arma el vector unitario de la dirección objetivo, mismo convenio que
        yawTel/pitchTel  (yaw = atan2(x, y),  pitch = asin(z)):
          dirX = cos(pitch)·sin(yaw)
          dirY = cos(pitch)·cos(yaw)
          dirZ = sin(pitch)
     2. Lo lleva al marco de la cámara con productos punto contra sus 3 ejes en
        el mundo (adelante / derecha / arriba, del PASO 4):
          camAde = dir·adelante   camDer = dir·derecha   camArr = dir·arriba
     3. camAde ≤ 0  → el objetivo está DETRÁS: no hay diana, se pinta la flecha.
     4. camAde > 0  → proyección gnomónica a fracción [-1, 1] de la semipantalla:
          sx = (camDer / camAde) / tan(FOV_GUIA_H/2)
          sy = (camArr / camAde) / tan(FOV_GUIA_V/2)
        Pantalla:  x = w/2 + sx·w/2 ,  y = h/2 − sy·h/2
   ========================================================================== */
const elDiana = $("diana");
const elFlecha = $("flecha");
const elMira = $("mira"); // referencia visual, no se mueve

const RAD = Math.PI / 180;
const TAN_MEDIO_H = Math.tan(FOV_GUIA_H / 2 * RAD);
const TAN_MEDIO_V = Math.tan(FOV_GUIA_V / 2 * RAD);

function proyectarObjetivo(objYaw, objPitch) {
  const cp = Math.cos(objPitch * RAD), sp = Math.sin(objPitch * RAD);
  const dirX = cp * Math.sin(objYaw * RAD);
  const dirY = cp * Math.cos(objYaw * RAD);
  const dirZ = sp;

  const camAde = dirX * mundoX + dirY * mundoY + dirZ * mundoZ;
  const camDer = dirX * derX   + dirY * derY   + dirZ * derZ;
  const camArr = dirX * arrX   + dirY * arrY   + dirZ * arrZ;

  const delante = camAde > 0.0001;
  const sx = delante ? (camDer / camAde) / TAN_MEDIO_H : 0;
  const sy = delante ? (camArr / camAde) / TAN_MEDIO_V : 0;
  const w = window.innerWidth, h = window.innerHeight;

  return {
    x: w / 2 + sx * w / 2,
    y: h / 2 - sy * h / 2,
    camAde, camDer, camArr,
    detras: !delante,
    // "dentro de cuadro": delante y sin salirse (el vertical un pelín más
    // estricto que el horizontal para no quedar tapada por el HUD de arriba).
    dentro: delante && Math.abs(sx) < 0.9 && Math.abs(sy) < 0.82,
  };
}

function pintarDiana(proy, alineada, forzarDentro) {
  const w = window.innerWidth, h = window.innerHeight;

  if (proy.dentro || forzarDentro) {
    // Si forzamos (polo o 1ª foto de la fila) y la proyección se sale, la
    // pegamos al borde: el usuario ve hacia dónde mover el teléfono.
    const x = Math.max(24, Math.min(w - 24, proy.x));
    const y = Math.max(96, Math.min(h - 130, proy.y));
    elDiana.hidden = false;
    elFlecha.hidden = true;
    elDiana.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px)`;
    elDiana.classList.toggle("--alineada", alineada);
  } else {
    // Fuera de cuadro: flecha apuntando hacia la diana.
    elDiana.hidden = true;
    elFlecha.hidden = false;
    const ang = proy.detras
      // Detrás: orienta por el signo de derecha/arriba en el marco de la cámara.
      ? Math.atan2(-proy.camArr, proy.camDer) * 180 / Math.PI + 90
      // Delante pero fuera de cuadro: orienta por la posición en pantalla.
      : Math.atan2(proy.y - h / 2, proy.x - w / 2) * 180 / Math.PI + 90;
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
      objetivoYaw = (prev == null ? yawTel : prev) + PASO_YAW;  // +PASO_YAW respecto a la foto anterior real
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
  const claveGrupo = esPolo ? "polo-" + p.polo.id : "fila-" + FILAS.indexOf(p.fila);
  if (claveGrupo !== String(filaAnunciada)) {
    filaAnunciada = claveGrupo;
    anuncioHasta = ahora + 1800;
  }

  // ¿Teléfono rolado (acostado)? Miramos la componente vertical del eje "derecha"
  // del aparato (derZ): si pasa de sin(45°) ≈ 0.707, está muy inclinado de lado.
  // Es estable a cualquier pitch — a diferencia de e.gamma, que se desquicia
  // cerca del bloqueo de cardán (beta ≈ ±90°) y saltaba en falso al inclinar el
  // teléfono para las filas de arriba/abajo. En el techo se ignora: apuntando
  // casi vertical el "roll" pierde sentido, basta con acertar el pitch.
  const acostado = !esPolo && Math.abs(derZ) > 0.7071;

  const dpitch = objetivoPitch - pitchTel;
  const dyaw = objetivoYaw == null ? 0 : difAngulo(objetivoYaw, yawTel);

  const alineada = !acostado && (
    (esPolo || objetivoYaw == null)
      ? Math.abs(dpitch) < (esPolo ? TOL_POLO : TOL_PITCH)
      : Math.abs(dyaw) < TOL_YAW && Math.abs(dpitch) < TOL_PITCH
  );

  // Diana en perspectiva (PASO 5). Sin yaw objetivo (polo o 1ª foto de la fila)
  // se proyecta con el yaw ACTUAL del teléfono → la diana queda centrada en
  // horizontal y solo marca el error de pitch; "forzarDentro" evita que
  // desaparezca aunque el pitch esté muy lejos.
  const proy = proyectarObjetivo(objetivoYaw == null ? yawTel : objetivoYaw, objetivoPitch);
  pintarDiana(proy, alineada, objetivoYaw == null);

  // Textos
  if (acostado) {
    avG.hidden = false; avG.textContent = "Pon el teléfono vertical";
  } else if (ahora < anuncioHasta) {
    avG.hidden = false;
    avG.innerHTML = esPolo
      ? `Ahora apunta <strong>${p.polo.nombre}</strong>`
      : (p.i === 0
          ? `Fila ${FILAS.indexOf(p.fila) + 1} de ${FILAS.length} — nivela a <strong>${p.fila.nombre}</strong> y gira`
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
  yawPorDisparo[indice] = yawTel;        // dónde estabas: base del giro (+PASO_YAW) del siguiente
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
   ----------------------------------------------------------------------------
   Objetivo: meter las N fotos capturadas al CARRETE del iPhone de un tirón, con
   UN solo navigator.share({ files: [...todas...] }). En iOS la hoja de compartir
   ofrece "Guardar N imágenes" → un toque y todas caen a Fotos. De ahí el usuario
   las sube a Google Drive él mismo.

   Por qué así: compartir archivos DIRECTO a Drive desde navigator.share() en iOS
   nunca fue fiable, y trocear en "tandas" obligaba a repetir el gesto 4 veces y
   abrir 4 hojas de compartir. Guardar al carrete es un único gesto y no falla;
   desde Fotos, subir a Drive ya funciona sin problema.
   ========================================================================== */
function terminar() {
  bucleActivo = false;
  irA("fin");

  const hechas = fotos.filter(Boolean).length;
  const completa = hechas >= TOTAL;

  ocultarErrorFin();
  $("btnCompartir").textContent = `Guardar las ${hechas} fotos en el carrete`;

  $("finResumen").textContent =
    `Tomaste ${hechas} de ${TOTAL} fotos. ` +
    (completa
      ? "Cobertura completa."
      : "Puedes repetir para completar las que falten.");

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
  // Nombre: <toma>_AAMMDD_NN.jpg. Al guardar en Fotos el nombre se pierde, pero
  // iOS conserva el orden por hora de captura, así que da igual.
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

/* Mensaje de error bajo los botones. Nada de alert() para el flujo normal:
   solo texto en el DOM (#finError). */
function mostrarErrorFin(msg) {
  const el = $("finError");
  el.textContent = msg;
  el.hidden = false;
}
function ocultarErrorFin() {
  $("finError").hidden = true;
}

const MSG_FALLO_COMPARTIR =
  "No se pudo. Usa Safari (no Chrome ni la vista dentro de otra app) y vuelve a intentar.";

/* Un ÚNICO navigator.share con TODAS las fotos. Lo usan los dos botones de la
   pantalla final; la única diferencia es el texto de éxito que dejan puesto. */
async function compartirTodas(btn, textoExito) {
  ocultarErrorFin();
  const fs = archivos();
  if (!fs.length) return;

  // Si el navegador no puede compartir estos archivos, avisar y no seguir.
  if (!(navigator.canShare && navigator.canShare({ files: fs }))) {
    mostrarErrorFin(MSG_FALLO_COMPARTIR);
    return;
  }

  const textoPrevio = btn.textContent;
  try {
    await navigator.share({ files: fs });
    btn.textContent = textoExito;
  } catch (e) {
    // Cancelar la hoja de compartir NO es error: dejar el botón como estaba.
    if (e && e.name === "AbortError") {
      btn.textContent = textoPrevio;
      return;
    }
    console.warn("[Panoramika]", e);
    mostrarErrorFin(MSG_FALLO_COMPARTIR);
  }
}

/* Botón principal: guardar las fotos al carrete (Fotos). */
$("btnCompartir").addEventListener("click", () => {
  compartirTodas($("btnCompartir"), "✓ Enviadas a Fotos — repetir si hace falta");
});

/* Botón secundario chico: misma acción, pensado para mandarlas a Archivos u
   otra app sin mencionar Drive. */
$("btnDescargar").addEventListener("click", () => {
  compartirTodas($("btnDescargar"), "✓ Compartidas — repetir si hace falta");
});

$("btnOtra").addEventListener("click", () => location.reload());

/* Al salir, apagar la cámara. */
window.addEventListener("pagehide", () => {
  if (streamCamara) streamCamara.getTracks().forEach((t) => t.stop());
});
