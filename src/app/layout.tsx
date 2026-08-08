import type { Metadata } from "next";
import Analytics from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.revestimientoschillan.cl'),
  title: {
    default: "Revestimientos de primera en Chillán | Revestimientos Chillán",
    template: "%s | Revestimientos Chillán",
  },
  description: "Revestimientos de primera en Chillán. Pisos SPC, pisos flotantes, WPC, deck, siding granito y revestimientos metálicos. Asesoría personalizada.",
  keywords: ["revestimientos chillan", "pisos chillan", "pisos vinilicos spc", "deck wpc", "siding granito", "piso flotante", "revestimientos metalicos"],
  authors: [{ name: "Revestimientos Chillán" }],
  creator: "Revestimientos Chillán",
  publisher: "Revestimientos Chillán",
  alternates: {
    canonical: 'https://www.revestimientoschillan.cl',
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
    url: 'https://www.revestimientoschillan.cl',
    siteName: 'Revestimientos Chillán',
    title: 'Revestimientos de primera en Chillán | Revestimientos Chillán',
    description: 'Revestimientos de primera en Chillán. Pisos SPC, pisos flotantes, WPC, deck, siding granito y revestimientos metálicos. Asesoría personalizada.',
    images: [
      {
        url: 'https://www.revestimientoschillan.cl/redondo.png',
        width: 864,
        height: 864,
        alt: 'Revestimientos Chillán',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revestimientos de primera en Chillán | Revestimientos Chillán',
    description: 'Revestimientos de primera en Chillán. Pisos SPC, pisos flotantes, WPC, deck, siding granito y revestimientos metálicos. Asesoría personalizada.',
    images: ['https://www.revestimientoschillan.cl/redondo.png'],
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
  '@graph': [
    {
      '@type': 'LocalBusiness',
      '@id': 'https://www.revestimientoschillan.cl/#localbusiness',
      name: 'Revestimientos Chillán',
      url: 'https://www.revestimientoschillan.cl',
      logo: 'https://www.revestimientoschillan.cl/redondo.png',
      image: 'https://www.revestimientoschillan.cl/redondo.png',
      description: 'Revestimientos de primera en Chillán. Pisos SPC, pisos flotantes, WPC, deck, siding granito y revestimientos metálicos. Asesoría personalizada.',
      telephone: '+56958603702',
      email: 'ventas@revestimientoschillan.cl',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Alcántara 1080-A',
        addressLocality: 'Villa Barcelona, Chillán',
        addressRegion: 'Ñuble',
        postalCode: '3780000',
        addressCountry: 'CL',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: -36.594282,
        longitude: -72.069158,
      },
      areaServed: [
        { '@type': 'City', name: 'Chillán' },
        { '@type': 'City', name: 'Chillán Viejo' },
      ],
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '08:30',
          closes: '18:30',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'Saturday',
          opens: '09:00',
          closes: '14:00',
        },
      ],
      sameAs: [
        'https://www.facebook.com/profile.php?id=61591438604989',
        'https://www.instagram.com/revestimientoschillan',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.revestimientoschillan.cl/#website',
      name: 'Revestimientos Chillán',
      url: 'https://www.revestimientoschillan.cl',
      inLanguage: 'es-CL',
      publisher: {
        '@id': 'https://www.revestimientoschillan.cl/#localbusiness',
      },
    },
  ],
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

