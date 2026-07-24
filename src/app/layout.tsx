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
  keywords: ["revestimientos chillan", "pisos chillan", "pisos vinilicos spc", "deck wpc", "siding granito", "piso flotante", "revestimientos metalicos"],
  authors: [{ name: "Revestimientos Chillán" }],
  creator: "Revestimientos Chillán",
  publisher: "Revestimientos Chillán",
  alternates: {
    canonical: 'https://revestimientoschillan.cl',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/redondo.png', sizes: '864x864', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://revestimientoschillan.cl',
    siteName: 'Revestimientos Chillán',
    title: 'Revestimientos y Pisos en Chillán',
    description: 'Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.',
    images: [
      {
        url: '/redondo.png',
        width: 864,
        height: 864,
        alt: 'Revestimientos Chillán',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revestimientos y Pisos en Chillán',
    description: 'Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.',
    images: ['/redondo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Revestimientos Chillán',
  url: 'https://revestimientoschillan.cl',
  logo: 'https://revestimientoschillan.cl/redondo.png',
  image: 'https://revestimientoschillan.cl/redondo.png',
  description: 'Venta de revestimientos metálicos, pisos flotantes, WPC, pisos vinílicos SPC, deck y siding granito en Chillán.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Chillán',
    addressRegion: 'Ñuble',
    addressCountry: 'CL',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}

