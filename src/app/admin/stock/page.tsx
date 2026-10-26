'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import ModalIngresoFactura from '@/components/admin/stock/ModalIngresoFactura';
import ModalImportarStock from '@/components/admin/stock/ModalImportarStock';

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
  faltante: number | null;
  usuarioNombre: string | null;
  createdAt: string;
  vendedor: { nombre: string } | null;
  producto?: { sku: string; nombre: string };
  ingreso?: { id: number; numeroFactura: string } | null;
}

interface Ingreso {
  id: number;
  numeroFactura: string;
  fecha: string;
  proveedor: string | null;
  usuarioNombre: string | null;
  movimientos: {
    id: number;
    cantidad: number;
    producto: { sku: string; nombre: string };
  }[];
}

interface Resumen {
  periodo: string;
  stock: { productos: number; unidades: number; valor: number; bajos: number; sinStock: number; negativos: number };
  ventas: { cantidad: number; total: number; unidades: number; ticketPromedio: number };
  faltantes: { unidades: number; movimientos: number };
}

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  egreso: 'Egreso',
  ajuste: 'Ajuste',
  venta: 'Venta',
  devolucion: 'Devolución',
  carga_inicial: 'Carga inicial',
};

const TIPO_COLOR: Record<string, string> = {
  entrada: 'bg-green-100 text-green-700',
  egreso: 'bg-red-100 text-red-700',
  ajuste: 'bg-blue-100 text-blue-700',
  venta: 'bg-red-100 text-red-700',
  devolucion: 'bg-green-100 text-green-700',
  carga_inicial: 'bg-purple-100 text-purple-700',
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

  const [showUmbralCat, setShowUmbralCat] = useState(false);
  const [umbralCatId, setUmbralCatId] = useState(0);
  const [umbralCatValor, setUmbralCatValor] = useState('');
  const [umbralCatSoloSin, setUmbralCatSoloSin] = useState(false);
  const [errorUmbralCat, setErrorUmbralCat] = useState('');

  const [historialProducto, setHistorialProducto] = useState<ProductoStock | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorAjuste, setErrorAjuste] = useState('');

  const [showIngreso, setShowIngreso] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [ingresoAbierto, setIngresoAbierto] = useState<number | null>(null);
  const [movGlobal, setMovGlobal] = useState<Movimiento[]>([]);
  const [movBusqueda, setMovBusqueda] = useState('');
  const [movTipo, setMovTipo] = useState('todos');

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

  const cargarResumen = useCallback(async () => {
    try {
      const res = await fetch('/api/stock/resumen?periodo=mes_actual');
      if (res.ok) setResumen(await res.json());
    } catch {}
  }, []);

  const cargarIngresos = useCallback(async () => {
    try {
      const res = await fetch('/api/stock/ingresos?porPagina=10');
      if (res.ok) {
        const data = await res.json();
        setIngresos(data.items || []);
      }
    } catch {}
  }, []);

  const cargarMovimientosGlobal = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limite: '50' });
      if (movBusqueda) params.set('q', movBusqueda);
      if (movTipo !== 'todos') params.set('tipo', movTipo);
      const res = await fetch(`/api/stock/movimientos?${params.toString()}`);
      if (res.ok) setMovGlobal(await res.json());
    } catch {}
  }, [movBusqueda, movTipo]);

  const refrescarTodo = useCallback(() => {
    cargar();
    cargarResumen();
    cargarIngresos();
    cargarMovimientosGlobal();
  }, [cargar, cargarResumen, cargarIngresos, cargarMovimientosGlobal]);

  useEffect(() => {
    fetch('/api/categorias').then((r) => r.json()).then(setCategorias).catch(() => {});
    cargarResumen();
    cargarIngresos();
  }, [cargarResumen, cargarIngresos]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    const t = setTimeout(cargarMovimientosGlobal, 300);
    return () => clearTimeout(t);
  }, [cargarMovimientosGlobal]);

  const enviarAjuste = async (confirmarNegativo = false) => {
    const cantidad = parseFloat(cantAjuste);
    setErrorAjuste('');
    if (!ajusteProducto || isNaN(cantidad) || (tipoAjuste === 'ajuste' ? cantidad < 0 : cantidad <= 0)) {
      setErrorAjuste(tipoAjuste === 'ajuste' ? 'Ingresa el nuevo stock (0 o más)' : 'Ingresa una cantidad mayor a 0');
      return;
    }
    if (tipoAjuste === 'ajuste' && motivoAjuste.trim().length < 3) {
      setErrorAjuste('El ajuste requiere un motivo (mínimo 3 caracteres)');
      return;
    }
    setGuardandoMutable(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: ajusteProducto.id,
          tipo: tipoAjuste,
          cantidad,
          motivo: motivoAjuste,
          confirmarNegativo,
        }),
      });
      if (res.ok) {
        setAjusteProducto(null);
        setCantAjuste('');
        setMotivoAjuste('');
        refrescarTodo();
      } else {
        const err = await res.json();
        if (res.status === 409 && err.requiereConfirmacion) {
          if (confirm(err.error)) {
            setGuardandoMutable(false);
            await enviarAjuste(true);
            return;
          }
          setErrorAjuste('Operación cancelada.');
        } else {
          setErrorAjuste(err.error || 'Error al ajustar stock');
        }
      }
    } catch {
      setErrorAjuste('Error de conexión');
    }
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

  const abrirUmbralCategoria = () => {
    setUmbralCatId(filtroCat || categorias[0]?.id || 0);
    setUmbralCatValor('');
    setUmbralCatSoloSin(false);
    setErrorUmbralCat('');
    setShowUmbralCat(true);
  };

  const guardarUmbralCategoria = async () => {
    const valor = parseFloat(umbralCatValor);
    setErrorUmbralCat('');
    if (!umbralCatId) {
      setErrorUmbralCat('Selecciona una categoría');
      return;
    }
    if (isNaN(valor) || valor < 0) {
      setErrorUmbralCat('Ingresa un stock mínimo de 0 o más');
      return;
    }
    const cat = categorias.find((c) => c.id === umbralCatId);
    if (!confirm(`¿Aplicar stock mínimo ${valor} a ${umbralCatSoloSin ? 'los productos sin umbral de' : 'todos los productos de'} "${cat?.nombre}"?`)) return;
    setGuardandoMutable(true);
    try {
      const res = await fetch('/api/stock/umbral', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoriaId: umbralCatId, stockMinimo: valor, soloSinUmbral: umbralCatSoloSin }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowUmbralCat(false);
        alert(`Umbral actualizado en ${data.actualizados} producto(s).`);
        refrescarTodo();
      } else {
        setErrorUmbralCat(data.error || 'Error al guardar umbral');
      }
    } catch {
      setErrorUmbralCat('Error de conexión');
    }
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Stock</h1>
          <p className="text-sm text-muted mt-1">
            {conStockBajo.length} con stock bajo · {sinStock.length} sin stock
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowIngreso(true)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Registrar factura
          </button>
          <button
            onClick={() => setShowImportar(true)}
            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Importar Excel
          </button>
          <button
            onClick={abrirUmbralCategoria}
            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Umbral por categoría
          </button>
          <Link
            href="/admin/stock/revision"
            className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Revisión física
          </Link>
          <Link
            href="/admin/reportes"
            className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Reportes
          </Link>
          <Link
            href="/admin/auditoria"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Auditoría
          </Link>
          <select
            onChange={(e) => exportar(e.target.value)}
            defaultValue=""
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-600"
          >
            <option value="" disabled>Exportar Excel…</option>
            <option value="diario">Hoy</option>
            <option value="semana_actual">Semana actual</option>
            <option value="semana_anterior">Semana anterior</option>
            <option value="mes_actual">Mes actual</option>
            <option value="mes_anterior">Mes anterior</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Unidades en stock</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{resumen ? resumen.stock.unidades.toLocaleString('es-CL') : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Valor stock</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{resumen ? formatCLP(resumen.stock.valor) : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Bajo mínimo</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{resumen ? resumen.stock.bajos : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Sin stock</p>
          <p className="text-xl font-bold text-red-600 mt-1">{resumen ? resumen.stock.sinStock : '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Ventas del mes</p>
          <p className="text-xl font-bold text-green-700 mt-1">{resumen ? formatCLP(resumen.ventas.total) : '—'}</p>
          <p className="text-[11px] text-gray-500">{resumen ? `${resumen.ventas.cantidad} cotizaciones` : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Faltantes del mes</p>
          <p className="text-xl font-bold text-orange-700 mt-1">{resumen ? resumen.faltantes.unidades : '—'}</p>
          <p className="text-[11px] text-gray-500">unidades</p>
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
                          onClick={() => { setAjusteProducto(p); setTipoAjuste('entrada'); setCantAjuste(''); setMotivoAjuste(''); setErrorAjuste(''); }}
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

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Últimas facturas ingresadas</h2>
            <p className="text-xs text-gray-500">Haz clic en una factura para ver su detalle.</p>
          </div>
          <button
            onClick={() => setShowIngreso(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            + Nueva factura
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Factura</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Proveedor</th>
                <th className="px-4 py-2 text-right">Ítems</th>
                <th className="px-4 py-2 text-right">Unidades</th>
                <th className="px-4 py-2">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin ingresos registrados</td></tr>
              ) : (
                ingresos.map((ing) => (
                  <Fragment key={ing.id}>
                    <tr
                      onClick={() => setIngresoAbierto(ingresoAbierto === ing.id ? null : ing.id)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-2 font-mono text-xs">{ing.numeroFactura}</td>
                      <td className="px-4 py-2">{new Date(ing.fecha).toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-2 text-gray-600">{ing.proveedor || '—'}</td>
                      <td className="px-4 py-2 text-right">{ing.movimientos.length}</td>
                      <td className="px-4 py-2 text-right">{ing.movimientos.reduce((s, m) => s + m.cantidad, 0)}</td>
                      <td className="px-4 py-2 text-gray-600">{ing.usuarioNombre || '—'}</td>
                    </tr>
                    {ingresoAbierto === ing.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-1 font-medium">SKU</th>
                                <th className="py-1 font-medium">Producto</th>
                                <th className="py-1 font-medium text-right">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ing.movimientos.map((m) => (
                                <tr key={m.id} className="border-t border-gray-200">
                                  <td className="py-1 font-mono">{m.producto.sku}</td>
                                  <td className="py-1">{m.producto.nombre}</td>
                                  <td className="py-1 text-right">{m.cantidad}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700">Movimientos recientes</h2>
          <div className="flex gap-2">
            <input
              value={movBusqueda}
              onChange={(e) => setMovBusqueda(e.target.value)}
              placeholder="Buscar producto, factura, usuario…"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-64"
            />
            <select
              value={movTipo}
              onChange={(e) => setMovTipo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white"
            >
              <option value="todos">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="egreso">Egresos</option>
              <option value="ajuste">Ajustes</option>
              <option value="venta">Ventas</option>
              <option value="devolucion">Devoluciones</option>
              <option value="carga_inicial">Carga inicial</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Cantidad</th>
                <th className="px-4 py-2 text-right">Saldo</th>
                <th className="px-4 py-2 text-right">Faltante</th>
                <th className="px-4 py-2">Factura</th>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movGlobal.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-400">Sin movimientos</td></tr>
              ) : (
                movGlobal.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(m.createdAt).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-gray-500">{m.producto?.sku}</span>
                      <span className="ml-2">{m.producto?.nombre}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TIPO_COLOR[m.tipo] || 'bg-gray-100'}`}>
                        {TIPO_LABEL[m.tipo] || m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{m.tipo === 'egreso' || m.tipo === 'venta' ? -m.cantidad : m.cantidad}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{m.saldoTras}</td>
                    <td className="px-4 py-2 text-right text-orange-600 font-medium">{m.faltante || '—'}</td>
                    <td className="px-4 py-2 text-xs">{m.ingreso?.numeroFactura || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{m.usuarioNombre || m.vendedor?.nombre || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{m.motivo || '—'}</td>
                  </tr>
                ))
              )}
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
              {errorAjuste && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{errorAjuste}</div>
              )}
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
                min={tipoAjuste === 'ajuste' ? '0' : '1'}
                value={cantAjuste}
                onChange={(e) => setCantAjuste(e.target.value)}
                placeholder={tipoAjuste === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
              <input
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                placeholder={tipoAjuste === 'ajuste' ? 'Motivo (obligatorio)' : 'Motivo (opcional)'}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
              <p className="text-xs text-gray-400">Stock actual: {ajusteProducto.stock}</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setAjusteProducto(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={() => enviarAjuste()}
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

      {showUmbralCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">Stock mínimo por categoría</h2>
            <p className="text-sm text-gray-500 mb-4">Aplica el mismo umbral de alerta a los productos de una categoría.</p>
            {errorUmbralCat && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{errorUmbralCat}</div>
            )}
            <p className="text-xs text-gray-500 mb-1">Categoría</p>
            <select
              value={umbralCatId}
              onChange={(e) => setUmbralCatId(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-4 bg-white"
            >
              <option value={0} disabled>— Seleccionar categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mb-1">Alertar cuando el stock esté por debajo de:</p>
            <input
              type="number"
              step="any"
              min="0"
              value={umbralCatValor}
              onChange={(e) => setUmbralCatValor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
            <label className="flex items-center gap-2 mt-4 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={umbralCatSoloSin}
                onChange={(e) => setUmbralCatSoloSin(e.target.checked)}
              />
              Solo productos sin umbral (en 0), sin pisar los ya ajustados
            </label>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowUmbralCat(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={guardarUmbralCategoria}
                disabled={guardandoMutable}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
              >
                Aplicar
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

      {showIngreso && (
        <ModalIngresoFactura
          onClose={() => setShowIngreso(false)}
          onSaved={() => {
            setShowIngreso(false);
            refrescarTodo();
          }}
        />
      )}

      {showImportar && (
        <ModalImportarStock
          onClose={() => setShowImportar(false)}
          onSaved={() => {
            setShowImportar(false);
            refrescarTodo();
          }}
        />
      )}
    </div>
  );
}