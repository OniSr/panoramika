"use client";

import { useState } from "react";
import { MapContainer, ImageOverlay, Polygon, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { EstatusLote, Lote, ProyectoTerreno } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const COLOR_POR_ESTATUS: Record<EstatusLote, string> = {
  disponible: "#22c55e",
  apartado: "#eab308",
  vendido: "#ef4444",
};

const ETIQUETA_ESTATUS: Record<EstatusLote, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
};

export default function TerrenoMapClient({ proyecto }: { proyecto: ProyectoTerreno }) {
  const [loteActivo, setLoteActivo] = useState<Lote | null>(null);
  const bounds: LatLngBoundsExpression = proyecto.bounds;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={proyecto.centro}
        zoom={proyecto.zoom}
        maxZoom={22}
        className="h-full w-full"
        attributionControl={false}
      >
        <ImageOverlay url={proyecto.imagenAerea} bounds={bounds} />
        {proyecto.lotes.map((lote) => (
          <Polygon
            key={lote.id}
            positions={lote.coordenadas}
            pathOptions={{
              color: COLOR_POR_ESTATUS[lote.estatus],
              fillColor: COLOR_POR_ESTATUS[lote.estatus],
              fillOpacity: 0.35,
              weight: 2,
            }}
            eventHandlers={{ click: () => setLoteActivo(lote) }}
          >
            <Tooltip sticky>{lote.nombre}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      {/* Leyenda de estatus */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex gap-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white backdrop-blur">
        {(Object.keys(ETIQUETA_ESTATUS) as EstatusLote[]).map((estatus) => (
          <span key={estatus} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_POR_ESTATUS[estatus] }}
            />
            {ETIQUETA_ESTATUS[estatus]}
          </span>
        ))}
      </div>

      {/* Panel de detalle del lote seleccionado */}
      {loteActivo && (
        <div className="absolute right-4 top-4 z-[1000] w-64 rounded-xl bg-white p-4 shadow-lg">
          <button
            onClick={() => setLoteActivo(null)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h3 className="pr-4 font-semibold text-gray-900">{loteActivo.nombre}</h3>
          <p
            className="mt-1 text-sm font-medium"
            style={{ color: COLOR_POR_ESTATUS[loteActivo.estatus] }}
          >
            {ETIQUETA_ESTATUS[loteActivo.estatus]}
          </p>
          {loteActivo.superficie && (
            <p className="mt-2 text-sm text-gray-600">Superficie: {loteActivo.superficie}</p>
          )}
          {loteActivo.precio && (
            <p className="text-sm text-gray-600">Precio: {loteActivo.precio}</p>
          )}
        </div>
      )}
    </div>
  );
}
