'use client';

import { trackEvent } from '@/lib/ga';

interface WhatsAppFooterLinkProps {
  phone: string;
}

export default function WhatsAppFooterLink({ phone }: WhatsAppFooterLinkProps) {
  const mensaje = encodeURIComponent('Hola, me gustaría recibir información sobre sus productos.');
  const link = `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${mensaje}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('whatsapp_click', { location: 'footer' })}
      aria-label="Contactar por WhatsApp"
      className="hover:text-accent transition-colors"
    >
      WhatsApp
    </a>
  );
}
