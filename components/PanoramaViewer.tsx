"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Escena } from "@/lib/types";

// Pannellum se carga como script global (no es un paquete de React), por eso
// hablamos con él vía window.pannellum una vez que el script terminó de cargar.
declare global {
  interface Window {
    pannellum: any;
  }
}

interface Props {
  escenas: Escena[];
  escenaInicialId: string;
}

export default function PanoramaViewer({ escenas, escenaInicialId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [scriptListo, setScriptListo] = useState(false);
  const [escenaActualId, setEscenaActualId] = useState(escenaInicialId);

  useEffect(() => {
    if (!scriptListo || !containerRef.current || viewerRef.current) return;

    const sceneConfig: Record<string, any> = {};
    for (const escena of escenas) {
      sceneConfig[escena.id] = {
        type: "equirectangular",
        panorama: escena.imagen,
        autoLoad: true,
        hotSpots: escena.hotspots.map((h) => ({
          pitch: h.pitch,
          yaw: h.yaw,
          type: "scene",
          text: h.texto,
          sceneId: h.escenaDestinoId,
        })),
      };
    }

    viewerRef.current = window.pannellum.viewer(containerRef.current, {
      default: { firstScene: escenaInicialId, sceneFadeDuration: 600 },
      scenes: sceneConfig,
    });

    viewerRef.current.on("scenechange", (id: string) => setEscenaActualId(id));

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [scriptListo, escenas, escenaInicialId]);

  return (
    <div className="relative h-full w-full">
      <link rel="stylesheet" href="/vendor/pannellum/pannellum.css" />
      <Script
        src="/vendor/pannellum/pannellum.js"
        strategy="afterInteractive"
        onLoad={() => setScriptListo(true)}
      />
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur">
        {escenas.find((e) => e.id === escenaActualId)?.nombre ?? ""}
      </div>
    </div>
  );
}
