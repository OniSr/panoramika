# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Sitio estático: HTML5 + CSS3 nativo + JavaScript vanilla. Pannellum 2.5.7 para el
visor 360 (CDN jsDelivr con copia local de respaldo en `vendor/`). Sin
`package.json`, sin bundler, sin framework, sin paso de compilación. Hosting:
GitHub Pages (rama `main`, raíz), deploy = `git push`. Herramientas de sistema
puntuales (`cwebp`, `ffmpeg`, Hugin) no cuentan como dependencia del proyecto.
Restricción deliberada del proyecto — no introducir dependencias nuevas sin
decisión explícita de Daniel.

## Users

**Primario:** brokers e inmobiliarias chicas de Xalapa, Veracruz, y dueños
particulares de propiedades (rentas, reventa, terrenos, lotificadores). Llegan a
la página desde un enlace que Daniel les manda por WhatsApp, casi siempre en el
teléfono, para decidir si contratan a Panorámika para visualizar una propiedad.
No hay login ni cuenta de cliente final.

**Operador:** Daniel (y su pareja), que mantiene el portafolio. Necesita poder
añadir/editar/reordenar los trabajos y ajustar los textos de la página sin
editar JSON a mano — mediante un modo editor en la propia página que vuelca el
JSON listo para pegar y commitear (mismo patrón `?editar=1` que el editor de
mapa-lotes del visor).

## Product Purpose

Panorámika hace que una propiedad que **ya existe** se vea premium y atraiga
visitas más serias, combinando la técnica que mejor le sirva a esa propiedad:
aérea con dron, video recorrido, 360 de espacios héroe, fotografía editada, todo
en un solo enlace compartible con marca Panorámika. Esta página es la **carta de
presentación / portafolio**: su éxito es que un broker que la abre entienda en
segundos qué es, crea que Panorámika domina el oficio, y escriba por WhatsApp.

## Positioning

"Hecho por ti, local y rápido": llamas, van, en ~72 h tienes el link. Cero app
que aprender, cero suscripción para el dueño, un solo pago (+ hospedaje mensual
opcional del link). Aérea + interior en un mismo enlace con marca propia. Frente
a apps DIY (Kuula, CloudPano), Matterport o agencias de CDMX, la diferencia es
el servicio llave en mano a precio de mercado local ($2,500–8,000 MXN por
producción) y el trato cara a cara en Xalapa.

## Operating Context

- El visitante casi siempre abre el enlace en el teléfono, con datos móviles,
  entre otras tareas. Mobile-first no es negociable; la primera pantalla decide.
- El sitio comparte identidad con el visor (`index.html?proyecto=<slug>`): la
  carta y el recorrido deben sentirse el mismo producto.
- Modelo de datos del portafolio: `proyectos/recorridos.json` (manifiesto de
  trabajos). Añadir un trabajo hoy = una línea ahí. Cada trabajo enlaza a un
  recorrido del visor o —tras esta versión— también a una pieza suelta (video,
  aérea, galería, mapa de lotes).
- Producción de un recorrido: captura (dron DJI Mini 3 / iPhone + apps de
  stitching) → WebP 2:1 → `proyecto.json` → commit + push.

## Capabilities and Constraints

- **Editable (nuevo en esta versión):** modo `?editar=1` en la página de
  portafolio que permite gestionar los trabajos (nombre, ubicación, tipo,
  portada, enlace/destino, destacado, próximamente, orden) y editar los textos
  de la página (hero, "qué hacemos", precios, contacto). Sin backend: el editor
  produce el JSON/estado para copiar y commitear. Persistencia por el patrón
  `?editar=1` + "Copiar JSON".
- **Tipos de trabajo:** recorrido 360 navegable **y** piezas sueltas (video
  recorrido, clip aéreo, galería de fotos, mapa de lotes), cada una con su
  enlace o mini-visor.
- Todo el código y la UI en español. `script.js`/`portafolio.js` comentados
  paso a paso — los mantiene alguien que no es programador experto.
- CSS: color / tipografía / espaciado sólo desde variables de `:root`.
  Mobile-first, responsivo, `prefers-reduced-motion` respetado.
- Programación defensiva: validar JSON e imágenes antes de pintarlas; estados de
  error con "Reintentar"; nunca una sección en blanco. `console.*` prefijados
  `[Panoramika]`.
- Esta página SÍ se indexa (`robots: index`); el visor y `capturar/` no.

## Brand Commitments

- **Nombre:** Panorámika (antes "Domo 360"; se cambió por tema legal). Logotipo
  de texto con un punto ámbar (`.marca` / `.marca__punto`).
- **Voz:** español de México, directa y sin humo. Habla de resultados para el
  broker, no de tecnología. Sin exageración publicitaria ("no hype"),
  sin gamificación.
- **Sistema visual heredado (se conserva en esta versión):** fondo casi negro
  `#0d0f12`, acento ámbar/bronce arquitectónico (`--acento #d99a4e`,
  `--acento-claro #e8c27a`), texto `#f4f6f8` / `#b9c0c8` / `#7d858f`. Estatus de
  lote verde/ámbar/teja apagados. Tokens de espaciado `--e-1..--e-9`, radios,
  `--sombra`, `--difuminado`. La paleta y la tipografía NO cambian; la
  estructura y la jerarquía de la página sí.
- **Contacto real:** WhatsApp +52 228 292 4899 · correo Sosarq.contacto@gmail.com.
  (Panorámika opera bajo el estudio SOSArq de Daniel — pendiente confirmar si se
  menciona en la página.)

## Evidence on Hand

Activos reales en el repo (para el portafolio):

- `proyectos/demo-recorrido/` — **trabajo terminado según Daniel**: 360 de cocina
  navegable + clip vertical del exterior. Portada `panoramas/cocina.webp`.
- `proyectos/xalapa-demo/` — aérea 360 real con dron de un terreno en Las Ánimas.
  Bien cosida ("la pieza más fuerte" según notas). Daniel de momento la dejó
  como "próximamente"; **abierta la recomendación de mostrarla como real.**
- `proyectos/prueba-v15-cocina/` — mejor esfera interior hasta ahora, presentable.
- `proyectos/depto-lagos/` — aérea del dron real; fachada/sala/recámara son
  placeholders.
- `proyectos/demo-lotes/` — maqueta de mapa de lotes (aérea sustituta, no real).
- `assets/og-imagen.jpg`, `assets/favicon.svg`.

**No inventar:** clientes, reseñas, número de proyectos entregados, años de
experencia, casos de éxito. No hay clientes todavía. La página se sostiene con
las piezas reales que existan + encuadre honesto ("próximamente", promoción de
arranque a cambio de permiso de portafolio y reseña).

## Product Principles

1. **La obra es el argumento.** Con pocas piezas reales, cada una se muestra con
   la máxima honestidad y craft; nada de rellenar con stats o testimonios falsos.
2. **El teléfono decide.** La primera pantalla, en móvil, tiene que retener y dar
   curiosidad en segundos, y dejar clarísimo qué es y cómo contratar.
3. **Un pago, sin curva, local.** Todo el mensaje gira alrededor de "hecho por ti,
   rápido, a precio de Xalapa" — no alrededor de la tecnología.
4. **Mantenible por un no-experto.** Añadir/editar un trabajo se hace desde la
   propia página; el código se lee de arriba abajo y en español.
5. **Un solo producto.** La carta y el visor comparten paleta, tipografía y marca:
   quien pasa de una al otro no siente un salto.

## Accessibility & Inclusion

Sin requisito formal establecido. Mínimos que la página debe cumplir: contraste
de texto ≥ 4.5:1 sobre el fondo oscuro, foco visible por teclado, objetivos
táctiles ≥ 44 px, `prefers-reduced-motion` respetado, `alt` en imágenes de
trabajo, `lang="es"`. El visitante típico usa un teléfono de gama media con
datos móviles: presupuesto de peso y de red ajustado.
