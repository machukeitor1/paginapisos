'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBannerVariantUrl } from '@/lib/image-utils';

function generateSrcSet(url: string): string {
  if (!url) return '';
  return [400, 800, 1200]
    .map(w => `${getBannerVariantUrl(url, `w${w}`)} ${w}w`)
    .join(', ');
}

export interface Banner {
  id: number;
  titulo: string;
  subtitulo: string | null;
  badge: string | null;
  imagen: string;
  imagenMovil: string | null;
  url: string | null;
}

export default function Hero({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (banners.length === 0) {
    return (
      <div className="w-full h-[350px] md:h-[500px] bg-primary flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Revestimientos y Pisos</h1>
          <p className="text-lg md:text-xl text-gray-300">Materiales de construcción de primera calidad</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[350px] md:h-[500px] overflow-hidden bg-gray-900">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {(b.imagen || b.imagenMovil) ? (
            <picture>
              <source media="(min-width: 768px)"
                srcSet={generateSrcSet(b.imagen || b.imagenMovil!)} sizes="100vw" />
              <source media="(max-width: 767px)"
                srcSet={generateSrcSet(b.imagenMovil || b.imagen!)} sizes="100vw" />
              <img
                src={getBannerVariantUrl(b.imagen || b.imagenMovil!, 'w800')}
                alt={b.titulo?.trim() || 'Banner promocional'}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </picture>
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-3xl md:text-5xl font-bold mb-4">Revestimientos y Pisos</h1>
                <p className="text-lg md:text-xl text-gray-300">Materiales de construcción de primera calidad</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button onClick={prev} aria-label="Banner anterior" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next} aria-label="Banner siguiente" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Banner ${i + 1} de ${banners.length}`}
                className={`p-2.5 rounded-full transition-colors ${i === current ? 'bg-white/40' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <span className={`block w-2.5 h-2.5 rounded-full ${i === current ? 'bg-white' : 'bg-white/50'}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
