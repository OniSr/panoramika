import { notFound } from "next/navigation";
import { getProyecto } from "@/data/proyectos-mock";
import TerrenoMap from "@/components/TerrenoMap";
import PanoramaViewer from "@/components/PanoramaViewer";

interface Params {
  params: Promise<{ cliente: string; proyecto: string }>;
}

export default async function TourPage({ params }: Params) {
  const { cliente, proyecto: proyectoSlug } = await params;
  const proyecto = getProyecto(cliente, proyectoSlug);

  if (!proyecto) notFound();

  return (
    <main className="flex h-dvh w-dvw flex-col bg-black">
      <header className="flex items-center justify-between bg-neutral-900 px-4 py-2 text-white">
        <h1 className="text-sm font-medium">{proyecto.nombre}</h1>
        <span className="text-xs text-neutral-400">
          {proyecto.tipo === "terreno" ? "Vista de terreno" : "Recorrido 360"}
        </span>
      </header>
      <div className="relative flex-1">
        {proyecto.tipo === "terreno" ? (
          <TerrenoMap proyecto={proyecto} />
        ) : (
          <PanoramaViewer
            escenas={proyecto.escenas}
            escenaInicialId={proyecto.escenaInicialId}
          />
        )}
      </div>
    </main>
  );
}
