import type { Metadata } from "next";
import Analytics from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://revestimientoschillan.cl'),
  title: {
    default: "Revestimientos y Pisos en Chillán",
    template: "%s | Revestimientos Chillán",
  },
  description: "Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/redondo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/redondo.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'Revestimientos Chillán',
    title: 'Revestimientos y Pisos en Chillán',
    description: 'Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.',
    images: [{ url: '/Logo.png', width: 250, height: 250, alt: 'Revestimientos Chillán' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
