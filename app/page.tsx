import Link from "next/link";
import { listarProyectos } from "@/data/proyectos-mock";

export default function Home() {
  const proyectos = listarProyectos();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">Tours 360 — Demos</h1>
      <p className="mt-2 text-neutral-500">
        Proyectos de ejemplo. Cada uno vive en su propia URL compartible.
      </p>
      <ul className="mt-8 space-y-3">
        {proyectos.map((p) => (
          <li key={`${p.cliente}-${p.proyecto}`}>
            <Link
              href={`/tour/${p.cliente}/${p.proyecto}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-neutral-400"
            >
              <span className="font-medium text-neutral-800">{p.nombre}</span>
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                {p.tipo}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
