'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CotizacionAdmin {
  id: number;
  numero: string;
  createdAt: string;
  vencimiento: string;
  total: number;
  estado: string;
  cliente: { nombre: string; rut: string };
  vendedor: { nombre: string };
}

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VENDIDO: 'bg-green-100 text-green-800',
  PERDIDO: 'bg-red-100 text-red-800',
};

export default function AdminCotizacionesPage() {
  const [items, setItems] = useState<CotizacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cotizaciones')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Cotizaciones</h1>

      {items.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No hay cotizaciones registradas</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">N°</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">RUT</th>
                <th className="text-left py-3 px-4">Vendedor</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-center py-3 px-4">Fecha</th>
                <th className="text-center py-3 px-4">Vence</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{c.numero}</td>
                  <td className="py-3 px-4 text-gray-700">{c.cliente.nombre}</td>
                  <td className="py-3 px-4 text-gray-500">{c.cliente.rut}</td>
                  <td className="py-3 px-4 text-gray-500">{c.vendedor.nombre}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTILOS_ESTADO[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className="py-3 px-4 text-center text-gray-500">{c.vencimiento ? new Date(c.vencimiento).toLocaleDateString('es-CL') : '-'}</td>
                  <td className="py-3 px-4 text-right font-medium">${c.total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/vendedor/cotizaciones/${c.id}`} target="_blank" className="text-accent hover:text-accent/80 text-xs font-medium">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
