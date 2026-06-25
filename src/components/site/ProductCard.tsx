'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Producto {
  id: number;
  nombre: string;
  slug: string;
  sku: string;
  descripcion: string | null;
  dimensiones: string | null;
  unidad: string;
  precio: number;
  precioAntes: number | null;
  descuento: number | null;
  marca: string;
  imagenes: string;
  categoria: { slug: string; nombre: string };
}

export default function ProductCard({ producto }: { producto: Producto }) {
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  let imagenes: string[] = [];
  try { imagenes = JSON.parse(producto.imagenes); } catch {}

  const formatearPrecio = (p: number) => `$${Math.round(p).toLocaleString('es-CL')}`;

  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('cotizador') || '[]');
      const existe = items.some((i: any) => i.id === producto.id);
      setAgregado(existe);
    } catch {}
  }, [producto.id]);

  const agregarAlCotizador = () => {
    try {
      const items = JSON.parse(localStorage.getItem('cotizador') || '[]');
      const existente = items.findIndex((i: any) => i.id === producto.id);
      if (existente >= 0) {
        items[existente].cantidad += cantidad;
      } else {
        items.push({
          id: producto.id,
          nombre: producto.nombre,
          slug: producto.slug,
          precio: producto.precio,
          imagen: imagenes[0] || '',
          cantidad,
          unidad: producto.unidad,
          categoriaSlug: producto.categoria.slug,
        });
      }
      localStorage.setItem('cotizador', JSON.stringify(items));
      setAgregado(true);
      window.dispatchEvent(new Event('cotizador-update'));
    } catch {}
  };

  const linkProps = { href: `/${producto.categoria.slug}/${producto.slug}` };

  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group relative">
      <Link {...linkProps}>
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {imagenes.length > 0 ? (
            <img src={imagenes[0]} alt={producto.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {producto.descuento && (
            <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-1 rounded-md">
              -{producto.descuento}%
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="text-xs text-muted mb-1">{producto.categoria.nombre}</div>
        <Link {...linkProps}>
          <h3 className="font-semibold text-text mb-1 hover:text-accent transition-colors line-clamp-2">{producto.nombre}</h3>
        </Link>
        <div className="text-xs text-muted mb-1">SKU: {producto.sku}</div>
        {producto.dimensiones && <div className="text-xs text-muted mb-2">{producto.dimensiones}</div>}

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-bold text-primary">{formatearPrecio(producto.precio)}</span>
          <span className="text-xs text-muted">/ {producto.unidad}</span>
          {producto.precioAntes && (
            <span className="text-sm text-muted line-through">{formatearPrecio(producto.precioAntes)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(0.1, parseFloat(e.target.value) || 1))}
            className="w-16 text-center border border-gray-300 rounded-lg text-sm py-2"
          />
          <span className="text-xs text-muted">{producto.unidad}</span>
          {agregado ? (
            <Link href="/cotizador" className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              Ver cotización
            </Link>
          ) : (
            <button onClick={agregarAlCotizador} className="flex-1 bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              Cotizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
