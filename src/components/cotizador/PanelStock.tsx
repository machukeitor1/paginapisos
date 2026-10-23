'use client';

import { useEffect, useState } from 'react';
import { formatUnidad } from '@/lib/format-unidad';

interface Item {
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  unidadVenta: string;
}

interface Disponibilidad {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidadVenta: string;
}

export default function PanelStock({ items }: { items: Item[] }) {
  const [disponibilidad, setDisponibilidad] = useState<Record<number, Disponibilidad>>({});
  const [error, setError] = useState('');

  const ids = Array.from(
    new Set(items.map((i) => i.productoId).filter((id): id is number => typeof id === 'number'))
  ).sort((a, b) => a - b);
  const key = ids.join(',');

  useEffect(() => {
    if (!key) {
      setDisponibilidad({});
      return;
    }
    let cancelado = false;
    setError('');
    fetch(`/api/stock/disponibilidad?ids=${key}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Disponibilidad[]) => {
        if (!cancelado) {
          setDisponibilidad(Object.fromEntries(data.map((d) => [d.id, d])));
        }
      })
      .catch(() => {
        if (!cancelado) setError('No se pudo verificar el stock.');
      });
    return () => {
      cancelado = true;
    };
  }, [key]);

  const agrupado = new Map<number, { descripcion: string; cantidad: number; unidadVenta: string }>();
  for (const item of items) {
    if (!item.productoId) continue;
    const prev = agrupado.get(item.productoId);
    if (prev) {
      prev.cantidad += item.cantidad;
    } else {
      agrupado.set(item.productoId, {
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidadVenta: item.unidadVenta,
      });
    }
  }

  if (agrupado.size === 0) return null;

  const filas = Array.from(agrupado.entries()).map(([id, datos]) => {
    const disp = disponibilidad[id];
    const stock = disp?.stock ?? 0;
    const faltante = Math.max(0, datos.cantidad - Math.max(stock, 0));
    return { id, ...datos, stock, faltante, cargado: Boolean(disp) };
  });

  const conFaltante = filas.filter((f) => f.faltante > 0);
  const totalFaltante = conFaltante.reduce((sum, f) => sum + f.faltante, 0);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Disponibilidad de stock</h3>
        {conFaltante.length > 0 ? (
          <span className="text-xs font-semibold text-orange-700">
            Faltan {totalFaltante} unidades
          </span>
        ) : (
          <span className="text-xs font-semibold text-green-700">Stock suficiente</span>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-1.5 pr-2 font-medium">Producto</th>
            <th className="py-1.5 px-2 font-medium text-center">Requerido</th>
            <th className="py-1.5 px-2 font-medium text-center">Disponible</th>
            <th className="py-1.5 pl-2 font-medium text-right">Faltante</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 pr-2 text-gray-700">{f.descripcion}</td>
              <td className="py-1.5 px-2 text-center text-gray-700">
                {formatUnidad(f.cantidad, f.unidadVenta)}
              </td>
              <td className={`py-1.5 px-2 text-center font-medium ${f.stock < 0 ? 'text-red-600' : f.stock <= 0 ? 'text-red-600' : f.stock < f.cantidad ? 'text-orange-600' : 'text-green-700'}`}>
                {f.cargado ? f.stock : '…'}
              </td>
              <td className={`py-1.5 pl-2 text-right font-semibold ${f.faltante > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                {f.faltante > 0 ? f.faltante : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[11px] text-gray-500 mt-2">
        El stock se descuenta al marcar la cotización como VENDIDA. Si falta, se registrará el faltante.
      </p>
    </div>
  );
}
