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
| **3. Agencias** | Una agencia local nos manda sus propiedades; somos su "área de recorridos". Paquete por volumen + mensualidad | $1,500–3,000 MXN/propiedad + iguala mensual | Fase 2 (con 10+ casos) |
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

## 6. Frase para tener clara

> No competimos con las plataformas de preventa. Hacemos que **cualquier
> propiedad que ya existe** se vea profesional —aérea, video recorrido, 360 y
> fotografía, la mezcla que le sirva a esa propiedad— hecho por nosotros, rápido
> y a precio justo, todo en un link con nuestra marca. Empezando por rentas de
> Xalapa y hoteles boutique, con el modelo listo para licenciarse a otras ciudades.
