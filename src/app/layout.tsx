import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revestimientos y Pisos - Materiales de Construcción",
  description: "Venta de revestimientos metálicos, WPC, pisos vinílicos SPC, deck y siding granito. Despacho a todo Chile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
