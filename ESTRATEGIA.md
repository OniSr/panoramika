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
- [ ] Captura interior que funcione (asistente v8: giroscopio, no brújula — la
      brújula falla en interiores).
- [ ] Evaluar cámara 360 dedicada (ej. Insta360 / SkyRover X1): elimina el
      stitching y la deriva de una. ~$3,000–7,000 MXN. Sube calidad y velocidad
      de golpe. **Probablemente vale la pena antes de escalar.**
- [ ] Flujo completo de un recorrido real publicado (depto-lagos como piloto).
- [ ] Página índice que liste los recorridos (para enseñar portafolio).
- [ ] Nadir con logo (tapar el hueco de abajo).

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

## 5. Frase para tener clara

> No competimos con las plataformas de preventa. Hacemos que **cualquier
> propiedad que ya existe en Xalapa** tenga un recorrido 360 profesional, hecho
> por nosotros, en dos días, por un precio local — y esa base escala licenciando
> el modelo a otros que hagan lo mismo en su ciudad.
