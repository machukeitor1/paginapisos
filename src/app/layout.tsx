import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://revestimientoschillan.cl'),
  title: "Revestimientos y Pisos en Chillán",
  description: "Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.",
  icons: { icon: '/Logo.png' },
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
