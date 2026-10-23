'use client';

import { useMemo, useState } from 'react';

interface ProductoOpcion {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  unidadVenta: string;
  precioUnitario: number;
}

interface Linea {
  key: number;
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  stock: number;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const hoy = () => new Date().toISOString().slice(0, 10);

export default function ModalIngresoFactura({ onClose, onSaved }: Props) {
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoOpcion[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [nextKey, setNextKey] = useState(1);

  const buscar = async (q: string) => {
    setBusqueda(q);
    if (q.trim().length < 1) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/productos/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResultados(await res.json());
    } catch {
    } finally {
      setBuscando(false);
    }
  };

  const agregar = (p: ProductoOpcion) => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.productoId === p.id);
      if (existente) {
        return prev.map((l) =>
          l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key: nextKey,
          productoId: p.id,
          sku: p.sku,
          nombre: p.nombre,
          cantidad: 1,
          stock: p.stock,
        },
      ];
    });
    setNextKey((k) => k + 1);
    setBusqueda('');
    setResultados([]);
  };

  const actualizarCantidad = (key: number, value: number) => {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: value } : l)));
  };

  const quitar = (key: number) => setLineas((prev) => prev.filter((l) => l.key !== key));

  const totalUnidades = useMemo(
    () => lineas.reduce((sum, l) => sum + (Number.isFinite(l.cantidad) ? l.cantidad : 0), 0),
    [lineas]
  );

  const guardar = async () => {
    setError('');
    if (!numeroFactura.trim()) {
      setError('Ingresa el número de factura');
      return;
    }
    if (lineas.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }
    if (lineas.some((l) => !Number.isFinite(l.cantidad) || l.cantidad <= 0)) {
      setError('Todas las cantidades deben ser mayores a 0');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/stock/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroFactura: numeroFactura.trim(),
          fecha,
          proveedor: proveedor.trim() || null,
          notas: notas.trim() || null,
          items: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar la factura');
        return;
      }
      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Ingreso por factura</h2>
            <p className="text-sm text-gray-500 mt-0.5">Registra la factura y los productos recibidos.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">N° factura *</label>
              <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="Ej: 12345" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
              <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Opcional" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notas</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">Agregar producto</label>
            <input
              value={busqueda}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Buscar por SKU o nombre…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {busqueda.trim().length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                {buscando && <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>}
                {!buscando && resultados.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
                )}
                {resultados.map((p) => (
                  <button key={p.id} onClick={() => agregar(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                    <span className="font-mono text-xs text-gray-700">{p.sku}</span>
                    <span className="text-gray-700 ml-2">{p.nombre}</span>
                    <span className="text-gray-400 ml-2">stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-center w-28">Cantidad</th>
                  <th className="px-3 py-2 text-center w-20">Stock</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin productos agregados</td></tr>
                ) : (
                  lineas.map((l) => (
                    <tr key={l.key} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{l.sku}</td>
                      <td className="px-3 py-2">{l.nombre}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={l.cantidad}
                          onChange={(e) => actualizarCantidad(l.key, parseFloat(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{l.stock}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => quitar(l.key)} className="text-red-400 hover:text-red-600">×</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            {lineas.length} producto(s) · {totalUnidades} unidad(es) en total
          </p>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
          >
            {guardando ? 'Guardando…' : 'Registrar ingreso'}
          </button>
        </div>
      </div>
    </div>
  );
}
