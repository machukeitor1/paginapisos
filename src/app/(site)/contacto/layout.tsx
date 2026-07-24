import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacta con Revestimientos Chillán. Alcántara 1080-A, Villa Barcelona, Chillán.',
  alternates: {
    canonical: 'https://revestimientoschillan.cl/contacto',
  },
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
