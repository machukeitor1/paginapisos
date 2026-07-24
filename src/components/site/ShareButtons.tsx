'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/ga';

interface ShareButtonsProps {
  nombre: string;
  slug: string;
  categoriaSlug: string;
}

export default function ShareButtons({ nombre, slug, categoriaSlug }: ShareButtonsProps) {
  const [copiado, setCopiado] = useState(false);

  const url = `https://revestimientoschillan.cl/${categoriaSlug}/${slug}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      trackEvent('share_copy_link', { product_name: nombre, product_sku: slug });
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm text-muted">Compartir:</span>
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('share_facebook', { product_name: nombre, product_sku: slug })}
        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
        aria-label="Compartir en Facebook"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <button
        onClick={copiarLink}
        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
        aria-label="Copiar link"
      >
        {copiado ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </button>
      {copiado && (
        <span className="text-sm text-green-600">¡Copiado!</span>
      )}
    </div>
  );
}
