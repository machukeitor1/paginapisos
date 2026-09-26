'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProductoStock {
  id: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidadVenta: string;
  activo: boolean;
  categoria: { id: number; nombre: string };
}

interface Movimiento {
  id: number;
  tipo: string;
  cantidad: number;
  saldoTras: number;
  motivo: string | null;
  importe: number | null;
  createdAt: string;
  vendedor: { nombre: string } | null;
}

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  egreso: 'Egreso',
  ajuste: 'Ajuste',
  venta: 'Venta',
  devolucion: 'Devolución',
};

const TIPO_COLOR: Record<string, string> = {
  entrada: 'bg-green-100 text-green-700',
  egreso: 'bg-red-100 text-red-700',
  ajuste: 'bg-blue-100 text-blue-700',
  venta: 'bg-red-100 text-red-700',
  devolucion: 'bg-green-100 text-green-700',
};

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export default function StockPage() {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [ajusteProducto, setAjusteProducto] = useState<ProductoStock | null>(null);
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'egreso' | 'ajuste'>('entrada');
  const [cantAjuste, setCantAjuste] = useState<string>('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [guardandoMutable, setGuardandoMutable] = useState(false);

  const [umbralProducto, setUmbralProducto] = useState<ProductoStock | null>(null);
  const [umbralValor, setUmbralValor] = useState<string>('');

  const [historialProducto, setHistorialProducto] = useState<ProductoStock | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set('q', busqueda);
      if (filtroCat) params.set('categoriaId', String(filtroCat));
      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) setProductos(await res.json());
    } catch {}
    setCargando(false);
  }, [busqueda, filtroCat]);

  useEffect(() => {
    fetch('/api/categorias').then((r) => r.json()).then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  const enviarAjuste = async () => {
    const cantidad = parseFloat(cantAjuste);
    if (!ajusteProducto || isNaN(cantidad) || cantidad <= 0) return;
    setGuardandoMutable(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: ajusteProducto.id, tipo: tipoAjuste, cantidad, motivo: motivoAjuste }),
      });
      if (res.ok) {
        setAjusteProducto(null);
        setCantAjuste('');
        setMotivoAjuste('');
        cargar();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al ajustar stock');
      }
    } catch {}
    setGuardandoMutable(false);
  };

  const guardarUmbral = async () => {
    if (!umbralProducto) return;
    const valor = parseFloat(umbralValor);
    if (isNaN(valor) || valor < 0) return;
    setGuardandoMutable(true);
    try {
      const res = await fetch(`/api/productos/${umbralProducto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockMinimo: valor }),
      });
      if (res.ok) {
        setUmbralProducto(null);
        cargar();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar umbral');
      }
    } catch {}
    setGuardandoMutable(false);
  };

  const verHistorial = async (prod: ProductoStock) => {
    setHistorialProducto(prod);
    setCargandoHistorial(true);
    try {
      const res = await fetch(`/api/stock/movimientos?productoId=${prod.id}`);
      if (res.ok) setMovimientos(await res.json());
    } catch {}
    setCargandoHistorial(false);
  };

  const exportar = async (periodo: string) => {
    try {
      const res = await fetch(`/api/stock/export?periodo=${periodo}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al exportar');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock_${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const conStockBajo = productos.filter((p) => p.activo && p.stock <= p.stockMinimo && p.stock > 0);
  const sinStock = productos.filter((p) => p.activo && p.stock <= 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Stock</h1>
          <p className="text-sm text-muted mt-1">
            {conStockBajo.length} con stock bajo · {sinStock.length} sin stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => exportar(e.target.value)}
            defaultValue=""
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-600"
          >
            <option value="" disabled>Exportar Excel…</option>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por SKU o nombre…"
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-80"
        />
        <select
          value={filtroCat}
          onChange={(e) => setFiltroCat(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Cargando…</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>
              ) : productos.map((p) => {
                const estado =
                  p.stock <= 0
                    ? { label: 'Sin stock', cls: 'bg-red-100 text-red-700' }
                    : p.stock <= p.stockMinimo
                    ? { label: 'Stock bajo', cls: 'bg-orange-100 text-orange-700' }
                    : { label: 'OK', cls: 'bg-green-100 text-green-700' };
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">{p.nombre}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.categoria.nombre}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.stock}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{p.stockMinimo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${estado.cls}`}>{estado.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setAjusteProducto(p); setTipoAjuste('entrada'); setCantAjuste(''); }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                        >
                          Ajustar
                        </button>
                        <button
                          onClick={() => { setUmbralProducto(p); setUmbralValor(String(p.stockMinimo)); }}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                        >
                          Umbral
                        </button>
                        <button
                          onClick={() => verHistorial(p)}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded"
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {ajusteProducto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">Ajustar stock</h2>
            <p className="text-sm text-gray-500 mb-4">{ajusteProducto.sku} · {ajusteProducto.nombre}</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['entrada', 'egreso', 'ajuste'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoAjuste(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tipoAjuste === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t === 'entrada' ? 'Entrada' : t === 'egreso' ? 'Egreso' : 'Ajuste'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="any"
                min="0"
                value={cantAjuste}
                onChange={(e) => setCantAjuste(e.target.value)}
                placeholder={tipoAjuste === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
              <input
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                placeholder="Motivo (opcional)"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
              <p className="text-xs text-gray-400">Stock actual: {ajusteProducto.stock}</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setAjusteProducto(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={enviarAjuste}
                disabled={guardandoMutable}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {umbralProducto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">Stock mínimo</h2>
            <p className="text-sm text-gray-500 mb-4">{umbralProducto.sku} · {umbralProducto.nombre}</p>
            <p className="text-xs text-gray-500 mb-1">Alertar cuando el stock esté por debajo de:</p>
            <input
              type="number"
              step="any"
              min="0"
              value={umbralValor}
              onChange={(e) => setUmbralValor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setUmbralProducto(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={guardarUmbral}
                disabled={guardandoMutable}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {historialProducto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-primary">{historialProducto.sku}</h2>
                <p className="text-sm text-gray-500">{historialProducto.nombre}</p>
              </div>
              <button onClick={() => setHistorialProducto(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 overflow-auto">
              {cargandoHistorial ? (
                <p className="text-gray-400 text-sm">Cargando…</p>
              ) : movimientos.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin movimientos registrados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2 text-right">Cantidad</th>
                      <th className="pb-2 text-right">Saldo</th>
                      <th className="pb-2">Responsable</th>
                      <th className="pb-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-xs">
                          {new Date(m.createdAt).toLocaleString('es-CL')}
                        </td>
                        <td className="py-1.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[m.tipo] || 'bg-gray-100'}`}>
                            {TIPO_LABEL[m.tipo] || m.tipo}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">{m.cantidad}</td>
                        <td className="py-1.5 text-right text-gray-500">{m.saldoTras}</td>
                        <td className="py-1.5 text-xs text-gray-500">{m.vendedor?.nombre || 'Admin'}</td>
                        <td className="py-1.5 text-right">{m.importe != null ? formatCLP(m.importe) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}