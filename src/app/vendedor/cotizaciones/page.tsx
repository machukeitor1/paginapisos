'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface CotizacionResumen {
  id: number;
  numero: string;
  createdAt: string;
  vencimiento: string;
  total: number;
  estado: string;
  cliente: { nombre: string; rut: string };
  items: any[];
}

export default function MisCotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (filtroEstado) params.set('estado', filtroEstado);
    try {
      const res = await fetch(`/api/cotizaciones?${params.toString()}`);
      const data = await res.json();
      setCotizaciones(Array.isArray(data) ? data : []);
    } catch {
      setCotizaciones([]);
    } finally {
      setLoading(false);
    }
  }, [search, desde, hasta, filtroEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch {}
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-800">Mis Cotizaciones</h1>
        <Link href="/vendedor/cotizaciones/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Nueva
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Buscar por RUT o Nombre</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="RUT o nombre del cliente..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Todas</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Vendida">Vendidas</option>
          </select>
        </div>
        {(search || desde || hasta || filtroEstado) && (
          <button
            onClick={() => { setSearch(''); setDesde(''); setHasta(''); setFiltroEstado(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : cotizaciones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">No se encontraron cotizaciones</p>
          <Link href="/vendedor/cotizaciones/nueva" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Crear primera cotización
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">N°</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">RUT</th>
                <th className="text-center py-3 px-4">Fecha</th>
                <th className="text-center py-3 px-4">Vence</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((c) => {
                const venc = new Date(c.vencimiento);
                const vencida = venc < new Date();
                const badgeClass = c.estado === 'Vendida'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-yellow-100 text-yellow-700 border-yellow-200';
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{c.numero}</td>
                    <td className="py-3 px-4 text-gray-700">{c.cliente.nombre}</td>
                    <td className="py-3 px-4 text-gray-500">{c.cliente.rut}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
                    <td className={`py-3 px-4 text-center ${vencida ? 'text-red-500' : 'text-gray-500'}`}>
                      {c.vencimiento ? new Date(c.vencimiento).toLocaleDateString('es-CL') : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                        {c.estado || 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">${c.total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/vendedor/cotizaciones/${c.id}`} title="Ver" className="text-blue-600 hover:text-blue-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        <Link href={`/vendedor/cotizaciones/${c.id}/editar`} title="Editar" className="text-amber-600 hover:text-amber-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                        <button onClick={() => eliminar(c.id)} disabled={deleting === c.id} title="Eliminar" className="text-red-500 hover:text-red-700 disabled:opacity-50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
