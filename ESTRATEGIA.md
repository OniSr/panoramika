# Estrategia — Panorámika

> Documento vivo. El objetivo: máximo rendimiento monetario + escalable, sin
> pretender "comernos" a la competencia. Se actualiza conforme avanza.

---

## 1. La competencia que preocupó a Daniel (video "Residencial La Rosa")

**Qué es:** una plataforma de *showroom virtual para preventa* (obra nueva).
Un desarrollador vende departamentos **antes de construirlos**, así que usan
**renders 3D (archviz)** convertidos en recorridos 360, no fotos.

**Su set de funciones (lo que se ve en el video):**
1. Vista aérea con dron del edificio y la zona.
2. **Selector 3D tipo "casa de muñecas"**: cortas el edificio por piso → eliges
   la unidad (701, 702…) → entras a su recorrido.
3. Recorrido 360 por unidad, con marcadores de piso estilo Street View.
4. Toggle **amueblado / sin amueblar** (dos versiones del render).
5. Pestañas **360 / PLANO (2D) / GALERÍA**.
6. Embudo social: "comenta SHOWROOM y te lo enviamos" (lead-gen por DM).

**Conclusión clave: NO es nuestro competidor directo.**
Ellos juegan en preventa de obra nueva, con presupuesto de marketing de
desarrolladora (un render de depto cuesta miles de USD; ellos lo amortizan
vendiendo 200 unidades). Nosotros jugamos en **propiedades que YA existen**:
rentas, reventa, terrenos, dueños particulares y agencias chicas de Xalapa.

Su *tecnología* es la misma categoría que Panorámika (recorridos 360 + planos +
toggles). Su ventaja son 3 cosas, **todas alcanzables**:
- imágenes fuente mejores (renders) → es un tema de cámara/fuente, no de plataforma;
- el selector 3D de unidades → es el mismo "mapa de lotes con polígonos" que ya
  estuvo en el MVP viejo (rama `archivo-nextjs`), aplicado a pisos;
- el embudo social → es marketing, no producto.

---

## 2. Por qué nos van a comprar a nosotros (y no otra app/página)

El cliente de Panorámika (dueño de una renta en Xalapa, agencia local, dueño de
un terreno) tiene estas alternativas:

| Alternativa | Por qué pierde contra nosotros |
|---|---|
| **Nada / solo fotos** (el 95% de los anuncios en Xalapa hoy) | Un recorrido 360 es un salto enorme de percepción de valor. Aquí está el mercado real. |
| **Apps DIY** (Kuula, CloudPano free, etc.) | El dueño tendría que aprender la herramienta, capturar él mismo y pagar mensualidad. Nosotros = **hecho por ti**, un pago, sin curva de aprendizaje. |
| **Matterport** | Necesita cámara de +$6,000 MXN, suscripción, y alguien que la opere. Sobrado y caro para una renta. |
| **Agencias grandes de CDMX** | Caras, lentas para Xalapa, sin trato local. |

**Nuestras ventajas concretas ("por qué nosotros"):**

1. **Hecho por ti + local + rápido.** Llamas, vamos, en 2 días tienes el link.
   Cero app que aprender, cero suscripción para el dueño. *Esta es la razón #1
   por la que un cliente chico compra.*
2. **Precio para el mercado local.** $2,500–8,000 MXN por producción es accesible
   para una renta o venta en Xalapa. Los renders y Matterport no lo son.
3. **Aéreo + interior en un solo link.** El dron da contexto de zona y "entras
   desde el cielo" a la propiedad. La mayoría de los tours DIY son solo interior.
   Es diferenciador real y ya probamos que funciona.
4. **La plataforma es nuestra.** El cliente recibe un link limpio y con nuestra
   marca; nosotros controlamos features, hosting y precio. No dependemos de que
   Kuula cierre su tier gratis.
5. **Relación y confianza.** Trato local, cara a cara, en un mercado donde eso
   pesa mucho.

---

## 2b. Qué vendemos: **visualización de propiedades**, no una sola técnica

> Decisión de Daniel (sep 2026): *"la idea es vender la visualización, todos los
> servicios; no nos podemos cerrar a solo 360, o solo IA, o solo edición y
> fotografía."*

El producto no es "un recorrido 360". Es **hacer que una propiedad se vea
premium y traiga visitas más serias**, con la técnica que mejor le sirva a ESA
propiedad. Un broker no compra una tecnología, compra un resultado.

**El paquete (todo en un link con marca Panorámika, `?proyecto=<slug>`):**

| Pieza | Herramienta (lo que YA hay) | Para qué sirve | Dónde brilla |
|---|---|---|---|
| **Aérea** | DJI Mini 3 | Contexto de zona, "entrar desde el cielo" | Todo. Es el punto más fuerte hoy |
| **Video recorrido** | iPhone 15 Pro **a pulso** (Daniel graba) + edición propia | El *flujo* y las *proporciones reales* | Depas chicos, donde el 360 deforma |
| **360 de espacios héroe** | Asistente v17 + Hugin | Explorar libremente 2-3 espacios | Sala, recámara principal, terraza, azotea, exteriores |
| **Fotografía fija editada** | iPhone + edición/IA | Portada del anuncio, fichas | Siempre |
| **Página de marca** | El sitio estático (ya existe) | Un solo enlace compartible, sin login | Siempre |

**Reglas de composición (para no romper la demo):**
- Depa chico → **video + aérea al frente**, 360 solo en 1-2 espacios que aguanten.
  Nunca forzar 360 donde se ve mal.
- Trípode 360: **más alto que barras/muebles y al centro**; en espacios en "L" o
  largos, capturar desde 2 puntos y unirlos con hotspot.
- **Sin gimbal por ahora.** La estabilización del iPhone 15 Pro caminando despacio
  (talón-punta, brazos pegados) alcanza para un listing. Gimbal y cámara 360 usada
  salen del 1º-2º cobro, no antes.

**Estado (sep 2026):** no hay clientes todavía y el kit ya está comprado (dron +
iPhone). Prioridad: **1-2 propiedades-portafolio** (el depa de Daniel + otra de
respaldo) → salir a vender con ese link. El depa de Daniel se completa; se
documenta una segunda "por si las dudas".

---

## 3. Modelo de monetización — por capas (de lo viable hoy a lo escalable)

| Capa | Qué es | Precio orientativo | Cuándo |
|---|---|---|---|
| **1. Producción** | Cobro único por hacer el recorrido de una propiedad | $2,500–8,000 MXN | **Ahora** |
| **2. Alojamiento** | Renta mensual mientras el recorrido está publicado (mantenemos el link, cambiamos estatus, soporte) | $200–500 MXN/mes por propiedad | **Ahora** |
| **3. Agencias** | Una agencia local nos manda sus propiedades; somos su "área de recorridos". Volumen + iguala. **Detalle en §9** | $2,800/propiedad por volumen · iguala $14-18k/mes | Fase 2 (con 3-5 casos) |
| **4. Licencia / white-label** | Operadores en otras ciudades/países hacen el mismo modelo local; **nosotros alojamos**, su marca, sus recorridos como subpáginas de nuestro dominio. Cobramos setup + mensualidad por recorrido activo | setup + $X/mes por recorrido | Fase 3 (proceso probado) |
| **5. Propiedades propias** | Usar la plataforma como catálogo de terrenos/propiedades nuestras | — (ahorro de marketing) | Continuo |
| **6. Preventa / desarrolladores** | Subir a la liga de "La Rosa": planos, toggle amueblado, selector 3D de unidades, para proyectos de obra nueva | ticket alto ($$$) | Fase 4 (cuando el producto lo aguante) |

**Recomendación de foco:** Fase 1 = **Capa 1 + Capa 2**. Generar 10–20 casos de
éxito en Xalapa. Con eso se abre la Capa 3 (agencias) casi sola, y la Capa 4
(licencia internacional) es la que escala de verdad porque no depende de que
Daniel produzca cada recorrido.

---

## 4. Qué implica para el producto (roadmap)

**Primero: terminar bien la plataforma base** (lo que Daniel pidió).
- [x] Captura interior que cosa limpio — **asistente v15/v16/v17**: gran angular +
      3 filas (0/±40°) + paso 22.5° + siembra de posiciones en Hugin. Probado en
      cuarto y cocina: **calidad de demo**. Queda warp en objetos pegados a la
      cámara (paralaje) y espacios muy chicos deforman → ahí entra el video.
- [x] Tapar el nadir/cenit con el logo — `scripts/tapar_polos.py`.
- [x] Indicador de nivel en el asistente (v16).
- [ ] Cámara 360 dedicada + gimbal: **del 1º-2º cobro, no antes.**
- [ ] **Escena tipo "video"** en el visor (embeber YouTube/Vimeo sin listar) para
      que el recorrido en video viva en la misma página de marca que los 360.
- [ ] **Página índice / portafolio** que liste los recorridos (carta de
      presentación para brokers).
- [ ] Sección de "paquete y precios".
- [ ] Flujo completo de una propiedad-portafolio real publicada (el depa de Daniel).

**Después: acercarse a la liga de "La Rosa"** (lo que da ticket alto):
- [ ] Pestaña **PLANO 2D** por escena (subir la imagen del plano, marcar dónde
      estás).
- [ ] **Selector de unidades/lotes** (recuperar el mapa de polígonos de
      `archivo-nextjs`): para fraccionamientos y edificios.
- [ ] Toggle **amueblado / vacío** (dos panorámicas por escena).
- [ ] Transiciones más finas (fundido entre escenas, mirar hacia la puerta al
      entrar, marcador de piso "caminar hacia adelante").

**Marketing (paralelo, no bloquea producto):**
- [ ] Embudo social estilo "comenta X y te lo mando" (Instagram/TikTok de Xalapa).
- [ ] Un recorrido demo impecable como carta de presentación para brokers.

---

## 5. ¿Y si el mercado no es Xalapa? — Segmentos por quién paga

> Idea de Daniel (ago 2026): en México estos servicios "no se valoran", pero el
> mismo recorrido 360 vale distinto según **quién lo compra y si puede o no visitar
> la propiedad en persona**. El valor lo pone el comprador que decide *sin pisar
> el lugar*.

**Principio:** cobrar donde el tour es *imprescindible*, no donde es *un lujo*.

### Segmento A — Departamentos en renta de Xalapa  *(local, viable YA, recurrente)*
- **Por qué sí:** Xalapa vive de la Universidad Veracruzana. Mucho inquilino es
  **estudiante o profesionista de otro estado** que renta sin poder ir a ver.
  Ahí el tour SÍ es imprescindible, aunque el ticket sea chico.
- Las rentas **rotan** (cada 6-12 meses) → necesidad recurrente, no un pago único.
  Un casero con 5-10 unidades = cliente que vuelve.
- Es la versión Xalapa de "el comprador no puede visitar". El piloto `depto-lagos`
  ya es exactamente esto.
- **Precio:** producción más baja ($1,500-3,000 MXN) + alojamiento mensual mientras
  esté anunciado. Volumen + recurrencia compensan el ticket.

### Segmento B — Hoteles boutique / hostales / aparthoteles  *(el de mejor pitch)*
- **Por qué sí:** ROI medible y que les duele hoy — *cada reserva directa que
  genere el tour te ahorra 15-20% de comisión de Booking/Expedia*. Tienen
  presupuesto de marketing. Necesidad global, no solo mexicana.
- **Contra Matterport:** ellos cobran hardware caro + mensualidad en USD.
  Panorámika = "suficientemente bueno" a una fracción, operado por alguien que
  entiende el espacio.
- Empezar por aquí para venta fuera de Xalapa: el argumento es número, no gusto.

### Segmento C — Inmobiliarias en zonas de expats de México  *(escala en USD)*
- Mérida, Tulum, Playa del Carmen, San Miguel de Allende, Puerto Vallarta, Valle
  de Guadalupe, Lago de Chapala, Oaxaca, Ensenada.
- **Clave:** no es "vender al extranjero", es vender a **agentes mexicanos cuyo
  cliente es extranjero**. Mismo idioma, mismo país, misma factura, cero fricción
  transfronteriza — pero el agente cobra comisión en dólares y **ya valora** el
  tour porque su comprador está en Toronto o Chicago.
- Más competencia que Xalapa; algunos ya tienen proveedor. Entrar con el aéreo
  (que ya quedó excelente) como gancho.

### Lo que NO funciona
- **Venta fría a extranjeros individuales.** Cold outbound a personas casi no
  convierte. A negocios (hoteles, agencias, desarrolladores) con pitch de ROU sí.

### Realidades antes de lanzarse
1. **El producto tiene que funcionar.** El **aéreo con dron** es sólido. El
   **interior 360 ya cose a calidad de demo** (asistente v15+, ver `ESTADO.md`),
   con límites conocidos: objetos pegados a la cámara y espacios muy chicos. Para
   esos casos, **el video recorrido cubre el hueco** (ver §2b). No se vende afuera
   lo que no se produce con seguridad — pero ya hay con qué salir a Xalapa.
2. **Xalapa = laboratorio, no mercado.** 2-3 recorridos locales (baratos o gratis)
   para clavar el flujo de producción y tener portafolio presentable.
3. **Viáticos: sí, pero después.** Nadie te vuela a Oaxaca sin casos que enseñar.
   Lo normal desde el principio: cotizar un hotel de la costa con el viaje incluido
   en el precio, una vez que haya 2-3 casos sólidos.
4. Falta resolver: inglés (o socio), cobro transfronterizo (Wise/Stripe/PayPal),
   señales de confianza (reseñas, clientes previos).

### El diferenciador real de Daniel
No es "un chavo con dron": es **estudiante de arquitectura**. Entiende cómo se
representa y se recorre un espacio. En un pitch a un hotelero o un desarrollador,
eso pesa — es criterio de composición, no solo de equipo.

### Qué cambia en el modelo de capas (sección 3)
- La **Capa 4 (licencia internacional)** deja de ser "algún día": los segmentos B
  y C son el puente para llegar ahí con caja y portafolio.
- Se suma un enfoque **remoto-first, precio en USD** para B y C, con viaje
  facturado al cliente.

---

## 6. Paquetes y precios (Xalapa · base septiembre 2026)

> Investigado contra estudios que ya operan en México (2025-26); fuentes al final.
> Precios en **MXN**, pago único salvo que se indique. Rangos validados por Daniel.

**Contexto de mercado:** foto suelta $1,200-2,500 · video <2 min $2,900-3,500 · 360
depa (≤50 m²) $2,700-3,000 · 360 casa (≤150 m²) $4,900-5,000 · aérea con dron
$1,600-3,500 · **paquete combinado foto+video+dron $5,800-7,100**. Lo normal es
**sin mensualidad**. El piso a evitar es el DIY de ~$1,000 — ahí no hay negocio.

**Referencia de valor:** comisión de broker en México = 3-6%. En un inmueble de
$1.5M son ~$45-90k. Un paquete de $4,000 es **5-8% de esa comisión** → se justifica
solo.

### 🟢 Esencial — $2,200
Rentas, depas chicos, presupuesto corto.
- 15-18 fotos editadas
- Video recorrido 45-60 s (vertical redes + horizontal)
- Página de marca con link · entrega 72 h

### 🔵 Completo — $3,900  *(el que se empuja)*
Venta de casa/depa. El estándar.
- 25-30 fotos editadas
- Video recorrido 60-90 s
- Aérea con dron (fotos + clip)
- 360 de 2-3 espacios héroe con hotspots
- Página de marca · 72 h

### 🟣 Premium — $6,900
Casas grandes, hoteles boutique.
- 40+ fotos + twilight / edición extra
- Video 2-3 min
- Aérea completa
- 360 de todos los espacios, navegación tipo Street View
- Plano 2D si aplica

### Dos formas de comprar (decirlo en la llamada)
- **Archivo suelto** — te entregamos el tour 360 / el video y lo pones donde
  quieras (Kuula, tu web, Inmuebles24). Más barato, sin marca nuestra, sin
  hosting. Es el piso.
- **Con plataforma (recomendado)** — **página con TU marca y TU logo**, link
  permanente, lo alojamos y le damos mantenimiento. Es lo que se ve profesional y
  lo que dura. *El desarrollo e implementación de la página tiene valor — no es un
  extra gratis.* Los precios de arriba son esta modalidad.

### Add-ons
- Foto extra $90 · escena 360 extra $500 · **co-marca (logo del broker/agencia en
  la página)** incluida en "con plataforma"
- **Hospedaje del link:** 3 meses incluidos, luego **renovación anual $900/año**
  (incluye cambios de estatus "vendido/rentado" y cambio de fotos). NO mensualidad
  chica a dueño particular.
- Viáticos fuera de Xalapa: costo + 15%
- **Alianza por comisión** (opcional): ver §11.

### Precio de lanzamiento (primeros ~5 clientes)
**−35%** a cambio de permiso de portafolio + reseña. Ej. Completo a **$2,500**.
Comunicar como oferta con fecha de término, no como "valgo menos".

---

## 7. Terrenos en lotificación / fraccionamientos

> Hay muchos terrenos grandes en venta en Xalapa. El cliente es el dueño o
> desarrollador que vende lotes.

**Se cobra POR LOTE, no por m².** Un terreno de 10 hectáreas no es 100× más
trabajo que uno de 1,000 m² — el dron lo vuela en tiempo similar. El valor está en
el **mapa interactivo de lotes** (polígonos disponible / vendido / apartado — el
"mapa de polígonos" de la rama `archivo-nextjs`), y ese trabajo escala con el
número de lotes.

**Estructura:**
- **Tarifa base $9,000-15,000:** vuelo de dron del terreno completo + armado del
  mapa interactivo + 360 de 1-2 puntos a nivel de piso.
- **Por lote $150-300:** polígono + tarjeta de lote (medidas, precio, estatus).
- **Mantenimiento $600-1,500/mes** mientras se comercializa: aquí SÍ va
  mensualidad — la lotificación se vende en 1-3 años y necesitan marcar lotes
  vendidos y mantener el mapa vivo. Es esperado en este segmento.

Ejemplo: fraccionamiento de 40 lotes → $12,000 base + 40 × $200 = **$20,000
producción + $1,000/mes**. Ticket alto y recurrente.

---

## 8. Dominio y plataforma — lo paga Panorámika

**Panorámika compra y paga UN dominio propio** (ej. `panoramika.mx` ~$700-1,500
MXN/año, o `.com` ~$300/año). TODOS los recorridos de TODOS los clientes viven
ahí: `panoramika.mx/casa-lomas-verdes`.

- El dominio es **un gasto fijo anual**, repartido entre todos los clientes — no es
  por cliente.
- El hosting sigue **gratis** (GitHub Pages / Cloudflare Pages a esta escala).
- El cliente **nunca toca nada**: recibe un link limpio con nuestra marca. Es
  ventaja de venta (§2).
- La renovación anual de $900 NO cubre costo de servidor (es casi cero) — cubre
  **mantenimiento** (estatus, ediciones). Comunicarlo así.
- Si un cliente quiere el recorrido en SU dominio → add-on de configuración y su
  dominio lo paga él.

**Pendiente:** comprar el dominio. `.mx` / `.com.mx` dan más confianza local que
`.com`.

---

## 9. Estrategia de agencias (Capa 3, en detalle)

> *"Hay inmobiliarias con más de 5 propiedades; si les vendo para todas sería
> enorme"* — sí, y es el objetivo real. Requiere plan.

**El pitch:** *"Me vuelvo tu área de recorridos. Me mandas los listings, en 72 h
los tienes; todo tu catálogo se ve premium y consistente."*

**Modelos de cobro (de menos a más comprometido):**
1. **Precio por volumen:** Completo $3,900 → **$2,800/propiedad** si se comprometen
   a un bloque de 10 o a 5+/mes.
2. **Iguala mensual (retainer):** **$14,000-18,000/mes** por hasta 6
   propiedades/mes incluidas, extras a precio de volumen. Ingreso predecible para
   Daniel, costo predecible para ellos.
3. **Catálogo con su marca:** todas sus propiedades en un índice Panorámika con SU
   logo (co-marca). Pegajoso: una vez que su catálogo está aquí, cambiarse cuesta.

**Cómo aterrizar la primera:**
- Primero 2-3 propiedades individuales (portafolio + relación).
- Luego, al dueño de una agencia con quien YA trabajaste una propiedad → pitch de
  "tu área de recorridos" + números de volumen.
- Piloto de 1 mes: 3 propiedades a precio de lanzamiento; si les gusta → iguala.

**Límites a planear (importante):**
- Daniel es una persona. 6 propiedades/mes ≈ 6 días de trabajo (½ día captura + ½
  día edición cada una). **Aguanta 2-3 agencias solo** antes de necesitar ayuda.
  Precia la iguala reflejando esa escasez; no sobrevendas capacidad.
- Las agencias pagan lento (30+ días). Exigir anticipo o prepago mensual.
- Consistencia bajo volumen: tener checklist de captura y de edición.

**Por qué las agencias son el objetivo:** una venta = 5-20 propiedades = pipeline
recurrente (siempre tienen listings nuevos), menor costo de adquisición, ingreso
predecible. Es el puente a la Capa 4 (licencia a otras ciudades).

---

## 10. Arranque comercial — terrenos en Xalapa (sep 2026)

### Plan de arranque acordado con Daniel
1. **Dron**: 360 de lotes (1 overview a ~80 m + 1 por lote a ~15-25 m) + video de
   acercamiento + fotos fijas. El 360 aéreo cose confiable (sin paralaje). Ver
   alturas en `ESTADO.md`.
2. **Interior** (para el depa portafolio): app dedicada que cose en el teléfono
   (**Travvir** ~$5 USD/mes, o **Teleport** gratis) → exporta equirectangular →
   Drive → pipeline solo hace WebP + `proyecto.json` + publicar. Salta Hugin.
   El asistente `capturar/` propio queda para "algún día".
3. Espacios chicos / con cajas / vacíos → **video**, no 360.
4. Con el primer o segundo cobro → cámara 360 usada (~$150-300 USD).

### Lo que se ve en el mercado (screenshots de Daniel + búsqueda)
- **Varios vendedores de lotes activos en Xalapa**, anunciando fuerte en
  FB/IG/Marketplace con **gráficos hechos con IA + mapa de lotes PLANO (imagen)** +
  WhatsApp. Compiten en precio sobre lotes baratos ejido/rústico ($65k) con
  urgencia ("último día", "los precios corren").
- **Varios reclutan asesores/brokers con comisión** → receptivos a alianzas.
- **Decreto que termina la creación de nuevos fraccionamientos en Xalapa** → los
  que existen deben VENDER su inventario, sin competencia nueva entrando. Argumento
  de venta: "ayúdate a vender más rápido tu inventario finito".
- El ángulo comprador EUA/Canadá lo trabajan agencias (Meraki, DESUR) → §5-C real.

### Prospectos concretos (frío, pero calientes: ya gastan en marketing)
| Prospecto | Qué venden | Contacto | Por qué encaja |
|---|---|---|---|
| **Raíz Noble — "Valle Dorado"** (Leonardo Astur) | Lotes 120 m², Carr. Xalapa–Alto Lucero | WA **228 243 0839**, FB Marketplace | **Ya tienen mapa de lotes plano** → la maqueta interactiva es un upgrade directo y visible |
| **Bienes Raíces JTM — "Terrenos Veracruz a tu alcance"** | Lotes 105 m² (7×15), Las Cruces | WA **229 529 5028**, FB/IG @bienesraicesjtm | Anuncian a diario con gráficos IA; presupuesto de marketing evidente |
| **Valle Rubí** (Las Ánimas) | Terrenos 250–2,800 m², $7,800/m² | vía anuncios FB (buscar) | Mapa plano de Google; "comisiones para asesores & brokers" → alianza |
| **Los Almendros Residencial** | Lotes residenciales, fracc. consolidado | administracion@losalmendrosresidencial.com, 33-1199-5646 | Ticket más alto, plusvalía; "última oportunidad" por el decreto |
| **Nuevo Coapexpan Residencial** | Lotes 600–2,000 m², campestre alto nivel | nuevocoapexpan.com | Nivel alto → paquete Premium |

Inmobiliarias que mueven terrenos (posible Capa 3 / §9): GALVA, Desarrollos
Cumbres, InmobiHaus, AVA Bienes Raíces, PB&V, Terrenos Xalapa (Pixan).

### Entrada de venta
- **La primera al costo/regalada**: base ~$6,000-8,000 flat por todo el
  fraccionamiento (dron + maqueta interactiva + 360 de 2-3 lotes) a cambio de
  showcase de portafolio + testimonio + referidos. Full price (§7) a partir de la 2ª.
- **El gancho**: "tu competencia usa un mapa en JPG y WhatsApp. Con esto el cliente
  entra desde el cielo, ve su lote, ve la vista real, y aparta por el chat — sin
  ir hasta allá." Se lo enseñas en el celular, en 30 segundos.
- **Antes de facturar con dron**: registro AFAC + revisar zona de El Lencero
  (ver `ESTADO.md`). El Mini 3 (249 g) igual respeta la zona del aeropuerto.

---

## 11. Comisión por venta cerrada (el modelo "Domo360") — cómo hacerlo bien

> Nota de Daniel (sep 2026): recuerda que JEBN Hunter (el Instagram de "Domo360")
> "presenta clientes a brokers y se lleva la comisión". Quiere saber cómo funciona
> y si aplica.

**Cómo opera JEBN Hunter (deducido — es broker inmobiliario, ver `../CLAUDE.md`):**
él ya está registrado como asesor. Arma el catálogo 360, le mete marketing, y
cuando un comprador pica, **él cierra o co-broker­ea** y cobra comisión. La capa
SaaS ($25/mes/proyecto) es aparte, software, sin regular.

**El punto legal (Veracruz SÍ regula esto):** Veracruz tiene **Ley de Operaciones
Inmobiliarias** con **Registro de Asesores Inmobiliarios**. "Asesor inmobiliario"
= quien *habitualmente y con paga* asesora o **actúa como intermediario** en la
compraventa/renta de un inmueble. Cobrar comisión por conectar comprador↔vendedor
de forma habitual = ser asesor → hay que registrarse.

**La línea limpia:**
- **Producir tours, alojar páginas, correr anuncios = servicio de marketing/media.
  NO regulado.** Daniel factura esto libremente. Es el 90% del negocio y NUNCA se
  regala.
- **Mediar la transacción / llevarse un % de la venta = regulado.**

**Las 3 capas de ingreso, separadas limpio:**
1. **Producción + plataforma** (marketing): el tour + la **página con la marca y el
   logo del broker/dueño** + hosting + cambios. Dinero garantizado, no depende de
   que se venda. → §6. *Pitch: "no es un archivo 360, es TU página con TU marca que
   vive en internet; el desarrollo tiene valor y dura."*
2. **Marketing de resultados** (opcional): publicar la propiedad en el catálogo
   Panorámika + social/ads. Iguala mensual o bono por desempeño. Sigue siendo
   marketing (traes tráfico, no medías).
3. **Comisión por venta cerrada** — solo así:
   - **(a) Aliarse con 1-2 brokers registrados.** Ellos cierran; Daniel cobra un
     **referral fee del 20-30% de la comisión de ese broker** (estándar de la
     industria: 25%), o **comisión compartida 50/50** del lado listador. **Contrato
     escrito siempre.** Daniel se queda en el lado de marketing. ← lo viable YA.
   - **(b) Daniel se registra como asesor inmobiliario en Veracruz** → puede cobrar
     comisión directa. Paso real, para cuando esto sea un canal probado, no ahora.

**Recomendación:** cobra fuerte la capa 1 (producción + plataforma con marca).
Ofrece la capa 3 como **add-on de alianza**: *"además, si quieres, publico tu
propiedad en mi catálogo y le meto marketing; si el comprador sale de ahí, hay
comisión — lo dejamos por escrito."* Empieza con brokers que ya te compraron
producción.

---

## 12. Frase para tener clara

> No competimos con las plataformas de preventa. Hacemos que **cualquier
> propiedad que ya existe** se vea profesional —aérea, video recorrido, 360 y
> fotografía, la mezcla que le sirva a esa propiedad— hecho por nosotros, rápido
> y a precio justo, todo en un link con nuestra marca. Empezando por rentas de
> Xalapa y hoteles boutique, con el modelo listo para licenciarse a otras ciudades.

---

## Fuentes de la investigación de precios (§6, sep 2026)

- Cronoshare — [fotografía inmobiliaria](https://www.cronoshare.com.mx/cuanto-cuesta/fotografia-inmobiliaria) · [tour virtual 360](https://www.cronoshare.com.mx/cuanto-cuesta/tour-virtual-360)
- [recorridos360.com.mx — precios y paquetes](https://www.recorridos360.com.mx/precios-y-paquetes/) (Básico $2,999 / Negocios $4,999 / Premium $14,999)
- [Holii — fotografía y video inmobiliario](https://holii.mx/servicios/fotografia-video-inmobiliario) (10 fotos 4K $1,740 · video <2 min $2,900 · combo $5,800)
- [EC Yucatán — foto/dron/video](https://www.ecyucatan.com/nueva-p%C3%A1gina1) (video $3,500 · video+dron $5,100 · completo $7,100)
- [Racher Estate](https://racher-estate.com.mx/servicio-de-creacion-de-recorridos-virtuales/) (foto+360+video+plataforma 3 meses $1,000 — referencia de piso DIY)
- [fotopisos.pro](https://fotopisos.pro/precios/) (referencia España, estructura de paquetes)
