'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  destacado: boolean;
  categoria: { slug: string; nombre: string };
}

export default function ProductoPage() {
  const params = useParams();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [imagenActual, setImagenActual] = useState(0);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    fetch(`/api/productos?slug=${params.slug}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setProducto(data);
          setAgregado(false);
        }
      })
      .catch(() => {});
  }, [params.slug]);

  useEffect(() => {
    if (!producto) return;
    try {
      const items = JSON.parse(localStorage.getItem('cotizador') || '[]');
      setAgregado(items.some((i: any) => i.id === producto.id));
    } catch {}
  }, [producto]);

  if (!producto) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-muted">Cargando producto...</p>
      </div>
    );
  }

  let imagenes: string[] = [];
  try { imagenes = JSON.parse(producto.imagenes); } catch {}

  const formatearPrecio = (p: number) => `$${Math.round(p).toLocaleString('es-CL')}`;

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <nav className="text-sm text-muted mb-8">
        <Link href="/" className="hover:text-accent">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href={`/${producto.categoria.slug}`} className="hover:text-accent">{producto.categoria.nombre}</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{producto.nombre}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <div className="relative bg-gray-100 rounded-xl overflow-hidden h-80 md:h-96 mb-4">
            {imagenes.length > 0 ? (
              <img src={imagenes[imagenActual]} alt={producto.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {producto.descuento && (
              <span className="absolute top-4 left-4 bg-accent text-white text-sm font-bold px-3 py-1 rounded-lg">
                -{producto.descuento}%
              </span>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2">
              {imagenes.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImagenActual(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === imagenActual ? 'border-accent' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">{producto.nombre}</h1>
          <div className="text-sm text-muted mb-4">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{producto.categoria.nombre}</span>
          </div>
          <div className="text-sm text-muted mb-2">SKU: {producto.sku}</div>
          {producto.marca && <div className="text-sm text-muted mb-2">Marca: {producto.marca}</div>}
          {producto.dimensiones && <div className="text-sm text-muted mb-4">Dimensiones: {producto.dimensiones}</div>}

          {producto.descripcion && (
            <p className="text-text mb-6 leading-relaxed">{producto.descripcion}</p>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-accent">{formatearPrecio(producto.precio)}</span>
              <span className="text-sm text-muted">/ {producto.unidad}</span>
              {producto.precioAntes && (
                <span className="text-lg text-muted line-through">{formatearPrecio(producto.precioAntes)}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-text">Cantidad ({producto.unidad}):</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center text-sm"
              />
            </div>

            {agregado ? (
              <Link href="/cotizador" className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-center py-3 rounded-lg transition-colors">
                Ver cotización
              </Link>
            ) : (
              <button onClick={agregarAlCotizador} className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg transition-colors">
                Agregar a cotización
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Información de despacho</p>
            <p>Despacho 24 hrs en Región Metropolitana. 72 hrs a otras regiones. Retiro gratis en tienda.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
