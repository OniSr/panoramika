import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tours 360",
  description: "Recorridos virtuales y visualización de terrenos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
