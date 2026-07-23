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

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VENDIDO: 'bg-green-100 text-green-800',
  PERDIDO: 'bg-red-100 text-red-800',
};

export default function MisCotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (estadoFiltro) params.set('estado', estadoFiltro);
    try {
      const res = await fetch(`/api/cotizaciones?${params.toString()}`);
      const data = await res.json();
      setCotizaciones(Array.isArray(data) ? data : []);
    } catch {
      setCotizaciones([]);
    } finally {
      setLoading(false);
    }
  }, [search, desde, hasta, estadoFiltro]);

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

  const limpiar = () => { setSearch(''); setDesde(''); setHasta(''); setEstadoFiltro(''); };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-800">Mis Cotizaciones</h1>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Plantilla Word
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
              <a href="/api/cotizaciones/template?tipo=fijo" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg border-b border-gray-100">
                Con datos fijos (Revestimientos Chillán)
              </a>
              <a href="/api/cotizaciones/template?tipo=dinamico" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg">
                Con datos desde configuración
              </a>
            </div>
          </div>
          <Link href="/vendedor/cotizaciones/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Nueva
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">Buscar por RUT o Nombre</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="RUT o nombre del cliente..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="VENDIDO">Vendido</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        {(search || desde || hasta || estadoFiltro) && (
          <button onClick={limpiar} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg">Limpiar</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>
      ) : cotizaciones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm mb-4">No se encontraron cotizaciones</p>
          <Link href="/vendedor/cotizaciones/nueva" className="text-blue-600 hover:text-blue-700 text-sm font-medium">Crear primera cotización</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">N°</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">RUT</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-center py-3 px-4">Fecha</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{c.numero}</td>
                  <td className="py-3 px-4 text-gray-700">{c.cliente.nombre}</td>
                  <td className="py-3 px-4 text-gray-500">{c.cliente.rut}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTILOS_ESTADO[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500">{new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
