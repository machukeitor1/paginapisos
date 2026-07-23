import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://revestimientoschillan.cl'),
  title: {
    default: "Revestimientos y Pisos en Chillán",
    template: "%s | Revestimientos Chillán",
  },
  description: "Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.",
  icons: { icon: '/Logo.png' },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'Revestimientos Chillán',
    title: 'Revestimientos y Pisos en Chillán',
    description: 'Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.',
    images: [{ url: '/Logo.png', width: 400, height: 400, alt: 'Revestimientos Chillán' }],
  },
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
