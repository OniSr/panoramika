import { Proyecto } from "@/lib/types";

// Demo de terreno: usa una imagen aérea de ejemplo (reemplázala por tu captura del Mini 3)
// y un polígono de muestra. El bounds/centro son coordenadas reales de Xalapa como referencia.
const demoTerreno: Proyecto = {
  tipo: "terreno",
  cliente: "demo",
  proyecto: "terreno-1",
  nombre: "Lotes Las Ánimas — Xalapa",
  imagenAerea: "/demo/aerea-demo.jpg",
  bounds: [
    [19.5305, -96.9350],
    [19.5345, -96.9290],
  ],
  centro: [19.5325, -96.932],
  zoom: 17,
  lotes: [
    {
      id: "lote-1",
      nombre: "Lote 1",
      estatus: "disponible",
      precio: "$450,000 MXN",
      superficie: "300 m²",
      coordenadas: [
        [19.5320, -96.9335],
        [19.5322, -96.9330],
        [19.5318, -96.9327],
        [19.5316, -96.9332],
      ],
    },
    {
      id: "lote-2",
      nombre: "Lote 2",
      estatus: "vendido",
      superficie: "280 m²",
      coordenadas: [
        [19.5322, -96.9330],
        [19.5325, -96.9325],
        [19.5321, -96.9322],
        [19.5318, -96.9327],
      ],
    },
    {
      id: "lote-3",
      nombre: "Lote 3",
      estatus: "apartado",
      precio: "$510,000 MXN",
      superficie: "320 m²",
      coordenadas: [
        [19.5316, -96.9332],
        [19.5318, -96.9327],
        [19.5314, -96.9324],
        [19.5312, -96.9329],
      ],
    },
  ],
};

// Demo de propiedad: dos escenas de ejemplo enlazadas por un hotspot.
// Sustituye las imágenes por tus panoramas 360 reales (equirectangulares 2:1).
const demoPropiedad: Proyecto = {
  tipo: "propiedad",
  cliente: "demo",
  proyecto: "casa-1",
  nombre: "Casa Modelo — Fraccionamiento Demo",
  escenaInicialId: "sala",
  escenas: [
    {
      id: "sala",
      nombre: "Sala",
      imagen: "/demo/pano-sala.jpg",
      hotspots: [
        { pitch: 0, yaw: 120, texto: "Ir a cocina", escenaDestinoId: "cocina" },
      ],
    },
    {
      id: "cocina",
      nombre: "Cocina",
      imagen: "/demo/pano-cocina.jpg",
      hotspots: [
        { pitch: 0, yaw: -60, texto: "Volver a sala", escenaDestinoId: "sala" },
      ],
    },
  ],
};

const proyectos: Proyecto[] = [demoTerreno, demoPropiedad];

export function getProyecto(cliente: string, proyecto: string): Proyecto | undefined {
  return proyectos.find((p) => p.cliente === cliente && p.proyecto === proyecto);
}

export function listarProyectos(): Proyecto[] {
  return proyectos;
}
