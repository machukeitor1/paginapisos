'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface ProductoStock {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  unidadVenta: string;
  categoria: { id: number; nombre: string };
}

export default function RevisionFisicaPage() {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/stock')
      .then((r) => (r.ok ? r.json() : []))
      .then(setProductos)
      .catch(() => {})
      .finally(() => setCargando(false));
    fetch('/api/categorias').then((r) => r.json()).then(setCategorias).catch(() => {});
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtroCat && p.categoria.id !== filtroCat) return false;
      if (!q) return true;
      return p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q);
    });
  }, [productos, busqueda, filtroCat]);

  const fecha = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="revision-print">
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .revision-print { padding: 0 !important; }
          body { background: white !important; }
          @page { size: A4; margin: 12mm; }
          .revision-tabla th, .revision-tabla td { padding: 4px 6px !important; font-size: 10px !important; }
          .revision-tabla tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-4 flex-wrap gap-2">
        <Link href="/admin/stock" className="text-sm text-gray-500 hover:text-gray-700">← Volver a stock</Link>
        <button
          onClick={() => window.print()}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Imprimir listado
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold text-gray-800">REVESTIMIENTOS CHILLÁN</h1>
          <p className="text-sm font-semibold text-gray-700 mt-1">Revisión física de inventario</p>
          <p className="text-xs text-gray-500 mt-0.5">Fecha: {fecha}</p>
        </div>

        <div className="no-print flex gap-3 mb-4">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar SKU o producto…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-72"
          />
          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            <option value={0}>Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 self-center">{filtrados.length} productos</span>
        </div>

        <table className="revision-tabla w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2">SKU</th>
              <th className="py-2 px-2">Producto</th>
              <th className="py-2 px-2 text-center w-24">Cantidad sistema</th>
              <th className="py-2 px-2 text-center w-32">Conteo físico</th>
              <th className="py-2 px-2 text-center w-24">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">Cargando…</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">Sin productos</td></tr>
            ) : (
              filtrados.map((p, idx) => (
                <tr key={p.id} className="border-b border-gray-300 align-middle">
                  <td className="py-1.5 px-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-mono text-xs whitespace-nowrap">{p.sku}</td>
                  <td className="py-1.5 px-2">
                    <span className="block leading-tight">{p.nombre}</span>
                    <span className="block text-[10px] text-gray-400 leading-tight">{p.categoria.nombre}</span>
                  </td>
                  <td className="py-1.5 px-2 text-center font-medium">{p.stock}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="inline-block w-full border-b border-gray-500">&nbsp;</span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="inline-block w-full border-b border-gray-500">&nbsp;</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-10 grid grid-cols-2 gap-10 text-xs text-gray-600">
          <div className="border-t border-gray-500 pt-1 text-center">Firma responsable conteo</div>
          <div className="border-t border-gray-500 pt-1 text-center">Firma administración</div>
        </div>
      </div>
    </div>
  );
}
