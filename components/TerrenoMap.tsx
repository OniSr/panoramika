"use client";

import dynamic from "next/dynamic";
import { ProyectoTerreno } from "@/lib/types";

// Leaflet toca `window` al cargarse, así que se excluye del server-side render.
const TerrenoMapClient = dynamic(() => import("./TerrenoMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
      Cargando mapa…
    </div>
  ),
});

export default function TerrenoMap({ proyecto }: { proyecto: ProyectoTerreno }) {
  return <TerrenoMapClient proyecto={proyecto} />;
}
