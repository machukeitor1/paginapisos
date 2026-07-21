'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProductoExtra } from '@/lib/productos-data';
import { getProdData } from '@/lib/producto-data-helper';

interface Producto {
  id: number;
  nombre: string;
  slug: string;
  sku: string;
  descripcion: string | null;
  dimensiones: string | null;
  unidad: string;
  precio: number;
  descuento: number | null;
  imagenes: string;
  destacado: boolean;
  rendimiento: number | null;
  unidadVenta: string;
  precioUnitario: number;
  marca: string;
  categoria: { slug: string; nombre: string };
}

function MedidasDisplay({ medidas }: { medidas: string[] }) {
  return (
    <div className="space-y-0.5">
      {medidas.map((m, i) => <div key={i}>{m}</div>)}
    </div>
  );
}

export default function ProductoPage() {
  const params = useParams();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [imagenActual, setImagenActual] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/productos?slug=${params.slug}`)
      .then(r => r.json())
      .then(data => { if (data) setProducto(data); })
      .catch(() => {});
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(data => { if (data?.whatsappGlobal) setWhatsapp(data.whatsappGlobal); })
      .catch(() => {});
  }, [params.slug]);

  useEffect(() => {
    if (!producto) return;
    let imagenes: string[] = [];
    try { imagenes = JSON.parse(producto.imagenes); } catch {}
    if (imagenes.length <= 1) return;

    intervaloRef.current = setInterval(() => {
      setImagenActual((prev) => (prev + 1) % imagenes.length);
    }, 4000);

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [producto]);

  const irAImagen = (i: number) => {
    setImagenActual(i);
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = setInterval(() => {
        setImagenActual((prev) => {
          let imgs: string[] = [];
          if (producto) { try { imgs = JSON.parse(producto.imagenes); } catch {} }
          return (prev + 1) % (imgs.length || 1);
        });
      }, 4000);
    }
  };

  if (!producto) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-muted">Cargando producto...</p>
      </div>
    );
  }

  let imagenes: string[] = [];
  try { imagenes = JSON.parse(producto.imagenes); } catch {}

  const extra = getProdData(producto, getProductoExtra(producto.sku));
  const UNIT_PRICE_CATEGORIES = ['pisos-deck-wpc', 'revestimiento-exterior-wpc', 'revestimientos-de-interior', 'cortavista', 'revestimiento-exterior-de-pvc', 'cercos-wpc', 'siding-piedras-pu'];
  const UNIT_PRICE_SKUS = ['RPU101-FACHALETA', 'APU102-CAFE', 'APU102-NOGAL'];
  const showUnitPrice = UNIT_PRICE_CATEGORIES.includes(producto.categoria.slug) || UNIT_PRICE_SKUS.includes(producto.sku);
  const formatearPrecio = (p: number) => `$${Math.round(p).toLocaleString('es-CL')}`;

  const whatsappMsg = encodeURIComponent(
    `Hola, me interesa el producto ${producto.nombre} (SKU: ${producto.sku}). ¿Podrían darme más información?`
  );
  const whatsappLink = `https://api.whatsapp.com/send?phone=${whatsapp.replace(/\D/g, '')}&text=${whatsappMsg}`;

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
              <img src={imagenes[imagenActual]} alt={producto.nombre} className="w-full h-full object-cover transition-opacity duration-500" />
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
            {imagenes.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {imagenes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => irAImagen(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === imagenActual ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2">
              {imagenes.map((img, i) => (
                <button
                  key={i}
                  onClick={() => irAImagen(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${i === imagenActual ? 'border-accent' : 'border-transparent'}`}
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
          <div className="text-sm text-muted mb-2">Marca: {producto.marca || 'Grupo Cubico'}</div>
          {extra?.medidas?.length ? (
            <div className="text-sm text-muted mb-2">
              <span className="font-medium text-text">Medidas:</span>
              <MedidasDisplay medidas={extra.medidas} />
            </div>
          ) : producto.dimensiones && (
            <div className="text-sm text-muted mb-2">
              <span className="font-medium text-text">Medidas:</span>{' '}
              <span>{producto.dimensiones}</span>
            </div>
          )}

          <div className="text-sm text-muted mb-2">Presentación: {extra?.presentacion || (producto.unidadVenta === 'caja' ? 'Caja' : 'Unidad')}</div>
          <div className="text-sm text-muted mb-2">Rendimiento: {extra?.rendimiento || '—'}</div>

          {producto.descripcion && (
            <p className="text-text mb-6 leading-relaxed">{producto.descripcion}</p>
          )}

          {extra?.accesorios && extra.accesorios.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-text mb-2">Accesorios sugeridos</h3>
              <ul className="space-y-1">
                {extra.accesorios.map((a: string, i: number) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-accent shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-4">
            <div className="flex items-baseline gap-3 mb-4">
              {(() => {
                const displayPrice = showUnitPrice && producto.unidad === 'm2' ? Math.round(producto.precio * (producto.rendimiento || 1)) : producto.precio;
                const precioConDesc = producto.descuento ? Math.round(displayPrice * (1 - producto.descuento / 100)) : displayPrice;
                return producto.descuento ? (
                  <>
                    <span className="text-lg text-muted line-through">{formatearPrecio(displayPrice)}</span>
                    <span className="text-3xl font-bold text-accent">{formatearPrecio(precioConDesc)}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-accent">{formatearPrecio(displayPrice)}</span>
                );
              })()}
              <span className="text-sm text-muted">/ {showUnitPrice ? (extra?.presentacion?.toLowerCase() || 'un') : producto.unidad}</span>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
