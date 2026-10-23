'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Evento {
  id: number;
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivo: string | null;
  usuarioTipo: string;
  usuarioNombre: string;
  createdAt: string;
  cotizacion: {
    id: number;
    numero: string;
    total: number;
    vendedor: { nombre: string };
    cliente: { nombre: string };
  };
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  VENDIDO: 'Vendido',
  PERDIDO: 'Perdido',
};

const ESTADO_CLASE: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VENDIDO: 'bg-green-100 text-green-800',
  PERDIDO: 'bg-red-100 text-red-800',
};

const PERIODOS = [
  { value: 'mes_actual', label: 'Mes actual' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'semana_actual', label: 'Semana actual' },
  { value: 'semana_anterior', label: 'Semana anterior' },
  { value: 'todo', label: 'Todo' },
];

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [periodo, setPeriodo] = useState('mes_actual');
  const [usuarioTipo, setUsuarioTipo] = useState('todos');
  const [estadoNuevo, setEstadoNuevo] = useState('todos');
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = useCallback(() => {
    const p = new URLSearchParams();
    p.set('periodo', periodo);
    if (usuarioTipo !== 'todos') p.set('usuarioTipo', usuarioTipo);
    if (estadoNuevo !== 'todos') p.set('estadoNuevo', estadoNuevo);
    if (qDebounced) p.set('q', qDebounced);
    return p;
  }, [periodo, usuarioTipo, estadoNuevo, qDebounced]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const p = params();
      p.set('pagina', String(pagina));
      p.set('porPagina', '30');
      const res = await fetch(`/api/auditoria?${p.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data.items || []);
        setTotal(data.total || 0);
        setTotalPaginas(data.totalPaginas || 1);
      }
    } catch {
    } finally {
      setCargando(false);
    }
  }, [params, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPagina(1);
  }, [periodo, usuarioTipo, estadoNuevo, qDebounced]);

  const exportar = () => {
    const p = params();
    window.location.href = `/api/auditoria/export?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Auditoría</h1>
          <p className="text-sm text-muted mt-1">Cambios de estado y reaperturas de cotizaciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/stock" className="text-sm text-gray-500 hover:text-gray-700">← Volver a stock</Link>
          <button
            onClick={exportar}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Período</label>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Usuario</label>
          <select value={usuarioTipo} onChange={(e) => setUsuarioTipo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="todos">Todos</option>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado nuevo</label>
          <select value={estadoNuevo} onChange={(e) => setEstadoNuevo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="todos">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="VENDIDO">Vendido</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Buscar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° cotización, cliente, usuario o motivo…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cotización</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Cambio</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Cargando…</td></tr>
              ) : eventos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin eventos para los filtros seleccionados</td></tr>
              ) : (
                eventos.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/vendedor/cotizaciones/${e.cotizacion.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 font-mono text-xs"
                      >
                        {e.cotizacion.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{e.cotizacion.cliente.nombre}</td>
                    <td className="px-4 py-2 text-gray-600">{e.cotizacion.vendedor.nombre}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 text-xs">
                        {e.estadoAnterior && (
                          <span className={`px-2 py-0.5 rounded-full ${ESTADO_CLASE[e.estadoAnterior] || 'bg-gray-100'}`}>
                            {ESTADO_LABEL[e.estadoAnterior] || e.estadoAnterior}
                          </span>
                        )}
                        <span className="text-gray-400">→</span>
                        <span className={`px-2 py-0.5 rounded-full ${ESTADO_CLASE[e.estadoNuevo] || 'bg-gray-100'}`}>
                          {ESTADO_LABEL[e.estadoNuevo] || e.estadoNuevo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 max-w-[260px]">{e.motivo || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {e.usuarioNombre}
                      <span className="text-gray-400"> ({e.usuarioTipo})</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-500">{total} evento(s)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-xs disabled:text-gray-300"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-500">Página {pagina} de {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="px-3 py-1 border border-gray-300 rounded-lg text-xs disabled:text-gray-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
