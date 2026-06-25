'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CotizadorItem {
  id: number;
  nombre: string;
  slug: string;
  precio: number;
  imagen: string;
  cantidad: number;
  unidad: string;
  categoriaSlug: string;
}

export default function CotizadorPage() {
  const [items, setItems] = useState<CotizadorItem[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const cargarItems = () => {
    try {
      const data = JSON.parse(localStorage.getItem('cotizador') || '[]');
      setItems(data);
    } catch { setItems([]); }
  };

  useEffect(() => {
    cargarItems();
    const handler = () => cargarItems();
    window.addEventListener('cotizador-update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cotizador-update', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json()).then(data => {
      if (data?.whatsappGlobal) setWhatsapp(data.whatsappGlobal);
    }).catch(() => {});
  }, []);

  const guardar = (nuevos: CotizadorItem[]) => {
    localStorage.setItem('cotizador', JSON.stringify(nuevos));
    setItems(nuevos);
    window.dispatchEvent(new Event('cotizador-update'));
  };

  const actualizarCantidad = (id: number, delta: number) => {
    const nuevos = items.map(i => {
      if (i.id === id) {
        const nueva = Math.max(0.1, i.cantidad + delta);
        return { ...i, cantidad: nueva };
      }
      return i;
    }).filter(i => i.cantidad > 0);
    guardar(nuevos);
  };

  const eliminarItem = (id: number) => {
    guardar(items.filter(i => i.id !== id));
  };

  const limpiarTodo = () => {
    guardar([]);
  };

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const formatearPrecio = (p: number) => `$${Math.round(p).toLocaleString('es-CL')}`;

  const generarMensajeCotizacion = (items: { nombre: string; cantidad: number; unidad: string; subtotal: number }[], total: number, nombre: string, telefono: string) => {
    let msg = `*Cotización - ${nombre || 'Cliente'}*\n\n`;
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.nombre}\n   Cantidad: ${item.cantidad} ${item.unidad}\n   Subtotal: $${Math.round(item.subtotal).toLocaleString('es-CL')}\n\n`;
    });
    msg += `*Total estimado: $${Math.round(total).toLocaleString('es-CL')}*\n`;
    if (telefono) msg += `\nTeléfono: ${telefono}`;
    return encodeURIComponent(msg);
  };

  const generarLinkWhatsApp = (whatsapp: string, mensaje: string) => {
    const numero = whatsapp.replace(/\D/g, '');
    return `https://api.whatsapp.com/send?phone=${numero}&text=${mensaje}`;
  };

  const itemsCotizacion = items.map(i => ({
    nombre: i.nombre,
    cantidad: i.cantidad,
    unidad: i.unidad,
    subtotal: i.precio * i.cantidad,
  }));

  const mensaje = generarMensajeCotizacion(itemsCotizacion, total, nombre, telefono);
  const linkWhatsApp = whatsapp ? generarLinkWhatsApp(whatsapp, mensaje) : '#';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-8">Mi Cotización</h1>

      {items.length === 0 ? (
        <div className="bg-card rounded-xl shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <p className="text-muted mb-6">No has agregado productos a tu cotización</p>
          <Link href="/" className="inline-block bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Explorar productos
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl shadow-md overflow-hidden mb-6">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-semibold text-muted">
              <div className="col-span-5">Producto</div>
              <div className="col-span-2 text-center">Cantidad</div>
              <div className="col-span-2 text-right">Precio</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-t border-gray-100 items-center">
                <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                  {item.imagen && (
                    <img src={item.imagen} alt={item.nombre} className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <Link href={`/${item.categoriaSlug}/${item.slug}`} className="font-medium text-text hover:text-accent text-sm">
                      {item.nombre}
                    </Link>
                    <div className="text-xs text-muted">{formatearPrecio(item.precio)} / {item.unidad}</div>
                  </div>
                </div>
                <div className="col-span-6 md:col-span-2 flex items-center justify-center gap-1">
                  <button onClick={() => actualizarCantidad(item.id, -1)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">-</button>
                  <span className="w-10 text-center font-medium">{item.cantidad}</span>
                  <button onClick={() => actualizarCantidad(item.id, 1)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">+</button>
                  <span className="text-xs text-muted ml-1">{item.unidad}</span>
                </div>
                <div className="col-span-3 md:col-span-2 text-right text-sm text-muted">
                  {formatearPrecio(item.precio * item.cantidad)}
                </div>
                <div className="col-span-2 md:col-span-2 text-right font-semibold text-primary">
                  {formatearPrecio(item.precio * item.cantidad)}
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => eliminarItem(item.id)} className="text-red-500 hover:text-red-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-text">Total estimado</span>
              <span className="text-2xl font-bold text-accent">{formatearPrecio(total)}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <input
                type="tel"
                placeholder="Tu teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center ${!whatsapp ? 'opacity-50 pointer-events-none' : ''}`}
              >
                Enviar cotización por WhatsApp
              </a>
              <button onClick={limpiarTodo} className="bg-gray-200 hover:bg-gray-300 text-text font-medium py-3 px-6 rounded-lg transition-colors">
                Limpiar todo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
