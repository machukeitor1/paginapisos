'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Resumen {
  periodo: string;
  label: string;
  desde: string;
  hasta: string;
  stock: { productos: number; unidades: number; valor: number; bajos: number; sinStock: number; negativos: number };
  ventas: { cantidad: number; total: number; unidades: number; ticketPromedio: number };
  faltantes: { unidades: number; movimientos: number };
  topProductos: { descripcion: string; sku: string; cantidad: number; importe: number }[];
  porVendedor: { nombre: string; cantidad: number; total: number }[];
}

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const PERIODOS: { value: string; label: string }[] = [
  { value: 'diario', label: 'Hoy' },
  { value: 'semana_actual', label: 'Semana actual' },
  { value: 'semana_anterior', label: 'Semana anterior' },
  { value: 'mes_actual', label: 'Mes actual' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'rango', label: 'Rango personalizado' },
];

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState('mes_actual');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (periodo === 'rango' && (!desde || !hasta)) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams({ periodo });
      if (periodo === 'rango') {
        params.set('desde', desde);
        params.set('hasta', hasta);
      }
      const res = await fetch(`/api/stock/resumen?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cargar el resumen');
        return;
      }
      setResumen(data);
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }, [periodo, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const exportar = () => {
    const params = new URLSearchParams({ periodo });
    if (periodo === 'rango') {
      params.set('desde', desde);
      params.set('hasta', hasta);
    }
    window.location.href = `/api/stock/export?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Reportes</h1>
          <p className="text-sm text-muted mt-1">Resumen de stock y ventas por período.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/stock" className="text-sm text-gray-500 hover:text-gray-700">← Volver a stock</Link>
          <button
            onClick={exportar}
            disabled={!resumen}
            className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {periodo === 'rango' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </>
        )}
        {resumen && (
          <p className="text-xs text-gray-500 ml-auto">
            {resumen.label}: {new Date(resumen.desde).toLocaleDateString('es-CL')} —{' '}
            {new Date(new Date(resumen.hasta).getTime() - 86400000).toLocaleDateString('es-CL')}
          </p>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : resumen ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ventas $</p>
              <p className="text-xl font-bold text-green-700 mt-1">{formatCLP(resumen.ventas.total)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Cotizaciones vendidas</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{resumen.ventas.cantidad}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Unidades vendidas</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{resumen.ventas.unidades.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ticket promedio</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{formatCLP(resumen.ventas.ticketPromedio)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Unidades con faltante</p>
              <p className="text-xl font-bold text-orange-600 mt-1">{resumen.faltantes.unidades}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500">Valor stock actual</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{formatCLP(resumen.stock.valor)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">Stock actual</h2>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Productos</span><span className="font-medium">{resumen.stock.productos}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Unidades</span><span className="font-medium">{resumen.stock.unidades.toLocaleString('es-CL')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bajo mínimo</span><span className="font-medium text-orange-600">{resumen.stock.bajos}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sin stock</span><span className="font-medium text-red-600">{resumen.stock.sinStock}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Negativos</span><span className="font-medium text-red-700">{resumen.stock.negativos}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor</span><span className="font-medium">{formatCLP(resumen.stock.valor)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">Ventas por vendedor</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
                    <th className="px-4 py-2">Vendedor</th>
                    <th className="px-4 py-2 text-right">Cotizaciones</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porVendedor.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Sin ventas en el período</td></tr>
                  ) : (
                    resumen.porVendedor.map((v) => (
                      <tr key={v.nombre} className="border-t border-gray-100">
                        <td className="px-4 py-2">{v.nombre}</td>
                        <td className="px-4 py-2 text-right">{v.cantidad}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCLP(v.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Top productos vendidos</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {resumen.topProductos.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Sin ventas en el período</td></tr>
                ) : (
                  resumen.topProductos.map((p, idx) => (
                    <tr key={`${p.sku}-${idx}`} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-mono text-xs">{p.sku || '—'}</td>
                      <td className="px-4 py-2">{p.descripcion}</td>
                      <td className="px-4 py-2 text-right">{p.cantidad}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCLP(p.importe)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
