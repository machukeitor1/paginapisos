import Link from 'next/link';
import { getProductoExtra } from '@/lib/productos-data';

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
  precioUnitario: number;
  unidadVenta: string;
  rendimiento: number | null;
  descuento: number | null;
  imagenes: string;
  estado: string;
  categoria: { slug: string; nombre: string };
}

export default function ProductCard({ producto }: { producto: Producto }) {
  const extra = getProductoExtra(producto.sku);
  let imagenes: string[] = [];
  try { imagenes = JSON.parse(producto.imagenes); } catch {}

  const formatearPrecio = (p: number) => `$${Math.round(p).toLocaleString('es-CL')}`;
  const showUnitPrice = ['pisos-deck-wpc'].includes(producto.categoria.slug);
  const displayPrice = showUnitPrice ? (producto.precioUnitario || producto.precio) : (producto.unidad === 'm2' ? producto.precio : (producto.precioUnitario || producto.precio));
  const displayUnit = showUnitPrice ? (extra?.presentacion?.toLowerCase() || 'un') : producto.unidad;
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
          {producto.estado === "a-pedido" && (
            <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md">
              A Pedido
            </span>
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
        {extra?.medidas?.length ? <div className="text-xs text-muted mb-1">{extra.medidas[0]}</div> : producto.dimensiones && <div className="text-xs text-muted mb-1">{producto.dimensiones}</div>}
        <div className="text-xs text-muted mb-2">Presentación: {extra?.presentacion || (producto.unidadVenta === 'caja' ? 'Caja' : 'Unidad')}</div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-bold text-primary">{formatearPrecio(displayPrice)}</span>
          <span className="text-xs text-muted">/ {displayUnit}</span>
          {producto.precioAntes && (
            <span className="text-sm text-muted line-through">{formatearPrecio(producto.precioAntes)}</span>
          )}
        </div>

        <Link
          {...linkProps}
          className="block w-full text-center bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Ver detalle
        </Link>
      </div>
    </div>
  );
}
