// Modelos de datos del proyecto. Por ahora los llena data/proyectos-mock.ts;
// más adelante estos mismos tipos los llenará Supabase sin cambiar los componentes.

export type EstatusLote = "disponible" | "vendido" | "apartado";

export interface Lote {
  id: string;
  nombre: string;
  estatus: EstatusLote;
  precio?: string;
  superficie?: string;
  /** Anillo del polígono en [lat, lng] */
  coordenadas: [number, number][];
}

export interface ProyectoTerreno {
  tipo: "terreno";
  cliente: string;
  proyecto: string;
  nombre: string;
  imagenAerea: string;
  /** Esquinas de la imagen aérea sobre el mapa: [[latSur, lngOeste], [latNorte, lngEste]] */
  bounds: [[number, number], [number, number]];
  centro: [number, number];
  zoom: number;
  lotes: Lote[];
}

export interface HotspotEscena {
  pitch: number;
  yaw: number;
  texto: string;
  escenaDestinoId: string;
}

export interface Escena {
  id: string;
  nombre: string;
  imagen: string;
  hotspots: HotspotEscena[];
}

export interface ProyectoPropiedad {
  tipo: "propiedad";
  cliente: string;
  proyecto: string;
  nombre: string;
  escenaInicialId: string;
  escenas: Escena[];
}

export type Proyecto = ProyectoTerreno | ProyectoPropiedad;
