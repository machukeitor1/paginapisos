'use client';

import { useState, useEffect, useMemo } from 'react';

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [filtroCategoria, setFiltroCategoria] = useState<number>(0);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: '', slug: '', sku: '', descripcion: '', dimensiones: '', unidad: 'm2', precio: 0, precioAntes: 0, descuento: 0, marca: 'Marca Propia', imagenes: '[]', destacado: false, activo: true, orden: 0, categoriaId: 0,
  });

  const cargar = () => {
    fetch('/api/productos').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProductos(data);
    }).catch(() => {});
    fetch('/api/categorias').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategorias(data);
    }).catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (filtroCategoria && p.categoriaId !== filtroCategoria) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [productos, filtroCategoria, busqueda]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === productosFiltrados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productosFiltrados.map(p => p.id)));
    }
  };

  const actualizarBatch = async (campo: string, valor: any) => {
    if (seleccionados.size === 0) return;
    setGuardando(true);
    const ids = Array.from(seleccionados);
    await Promise.all(ids.map(id =>
      fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valor }),
      })
    ));
    setGuardando(false);
    cargar();
  };

  const actualizarPrecioBatch = async (nuevoPrecio: number) => {
    if (seleccionados.size === 0) return;
    setGuardando(true);
    const ids = Array.from(seleccionados);
    await Promise.all(ids.map(id =>
      fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio: nuevoPrecio }),
      })
    ));
    setGuardando(false);
    cargar();
  };

  const aplicarDescuentoBatch = async (porcentaje: number) => {
    if (seleccionados.size === 0) return;
    setGuardando(true);
    const ids = Array.from(seleccionados);
    await Promise.all(ids.map(async (id) => {
      const prod = productos.find(p => p.id === id);
      if (!prod) return;
      const precioOriginal = prod.precioAntes || prod.precio;
      const precioConDescuento = Math.round(precioOriginal * (1 - porcentaje / 100));
      await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio: precioConDescuento, precioAntes: precioOriginal, descuento: porcentaje }),
      });
    }));
    setGuardando(false);
    cargar();
  };

  const quitarDescuentoBatch = async () => {
    if (seleccionados.size === 0) return;
    setGuardando(true);
    const ids = Array.from(seleccionados);
    await Promise.all(ids.map(async (id) => {
      const prod = productos.find(p => p.id === id);
      if (!prod) return;
      const precioOriginal = prod.precioAntes || prod.precio;
      await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio: precioOriginal, precioAntes: null, descuento: null }),
      });
    }));
    setGuardando(false);
    cargar();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `/api/productos/${editando.id}` : '/api/productos';
    const body = { ...form };
    if (!editando) delete (body as any).id;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setEditando(null);
      setForm({ nombre: '', slug: '', sku: '', descripcion: '', dimensiones: '', unidad: 'm2', precio: 0, precioAntes: 0, descuento: 0, marca: 'Marca Propia', imagenes: '[]', destacado: false, activo: true, orden: 0, categoriaId: 0 });
      cargar();
    }
  };

  const editar = (prod: any) => {
    setEditando(prod);
    setForm({
      nombre: prod.nombre, slug: prod.slug, sku: prod.sku, descripcion: prod.descripcion || '', dimensiones: prod.dimensiones || '', unidad: prod.unidad, precio: prod.precio, precioAntes: prod.precioAntes || 0, descuento: prod.descuento || 0, marca: prod.marca, imagenes: prod.imagenes, destacado: prod.destacado, activo: prod.activo, orden: prod.orden, categoriaId: prod.categoriaId,
    });
  };

  const eliminar = async (id: number) => {
    if (!confirm('Eliminar producto?')) return;
    const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    if (res.ok) cargar();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Productos ({productos.length})</h1>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-lg">{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Nombre</label>
            <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value, slug: editando ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Slug</label>
            <input type="text" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">SKU</label>
            <input type="text" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Categoria</label>
            <select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: parseInt(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
              <option value={0}>Seleccionar...</option>
              {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Precio</label>
            <input type="number" step="0.01" required value={form.precio} onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Marca</label>
            <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} className="rounded" />
              <span className="text-sm">Destacado</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
              <span className="text-sm">Activo</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Dimensiones</label>
          <input type="text" value={form.dimensiones} onChange={(e) => setForm({ ...form, dimensiones: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Descripcion</label>
          <textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
            {editando ? 'Actualizar' : 'Crear producto'}
          </button>
          {editando && (
            <button type="button" onClick={() => { setEditando(null); setForm({ nombre: '', slug: '', sku: '', descripcion: '', dimensiones: '', unidad: 'm2', precio: 0, precioAntes: 0, descuento: 0, marca: 'Marca Propia', imagenes: '[]', destacado: false, activo: true, orden: 0, categoriaId: 0 }); }} className="bg-gray-200 hover:bg-gray-300 text-text font-medium py-2 px-4 rounded-lg transition-colors text-sm">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Barra de filtros */}
      <div className="bg-card rounded-xl shadow-md p-4 mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
        </div>
        <div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value={0}>Todas las categorias</option>
            {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
          </select>
        </div>
        <span className="text-sm text-muted">
          {productosFiltrados.length} productos
          {seleccionados.size > 0 && ` | ${seleccionados.size} seleccionados`}
        </span>
      </div>

      {/* Barra de acciones en lote */}
      {seleccionados.size > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-accent">
              {seleccionados.size} seleccionados
            </span>
            <button
              onClick={() => actualizarBatch('activo', true)}
              disabled={guardando}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
            >
              Activar
            </button>
            <button
              onClick={() => actualizarBatch('activo', false)}
              disabled={guardando}
              className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
            >
              Desactivar
            </button>
            <button
              onClick={() => actualizarBatch('destacado', true)}
              disabled={guardando}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
            >
              Destacar
            </button>
            <button
              onClick={() => actualizarBatch('destacado', false)}
              disabled={guardando}
              className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
              Quitar destacado
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Precio:</span>
              <input
                type="number"
                id="batchPrecio"
                placeholder="Nuevo precio"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-32"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('batchPrecio') as HTMLInputElement;
                  const val = parseFloat(input?.value);
                  if (!isNaN(val) && val >= 0) {
                    actualizarPrecioBatch(val);
                    input.value = '';
                  }
                }}
                disabled={guardando}
                className="bg-accent hover:bg-accent/90 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
                Aplicar precio
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Descuento:</span>
              <input
                type="number"
                id="batchDescuento"
                placeholder="%"
                min="1"
                max="99"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-20"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('batchDescuento') as HTMLInputElement;
                  const val = parseInt(input?.value);
                  if (!isNaN(val) && val > 0 && val < 100) {
                    aplicarDescuentoBatch(val);
                    input.value = '';
                  }
                }}
                disabled={guardando}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
                Aplicar descuento
              </button>
              <button
                onClick={() => quitarDescuentoBatch()}
                disabled={guardando}
                className="bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg"
              >
                Quitar descuento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={seleccionados.size === productosFiltrados.length && productosFiltrados.length > 0}
                  onChange={toggleTodos}
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 font-semibold text-text">Nombre</th>
              <th className="text-left p-3 font-semibold text-text">SKU</th>
              <th className="text-left p-3 font-semibold text-text">Categoria</th>
              <th className="text-right p-3 font-semibold text-text">Precio</th>
              <th className="text-center p-3 font-semibold text-text">Desc.</th>
              <th className="text-center p-3 font-semibold text-text">Dest.</th>
              <th className="text-center p-3 font-semibold text-text">Act.</th>
              <th className="text-right p-3 font-semibold text-text">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((prod) => (
              <tr key={prod.id} className={`border-t border-gray-100 hover:bg-gray-50 ${seleccionados.has(prod.id) ? 'bg-accent/5' : ''}`}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(prod.id)}
                    onChange={() => toggleSeleccion(prod.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-3 max-w-[250px] truncate">{prod.nombre}</td>
                <td className="p-3 text-muted">{prod.sku}</td>
                <td className="p-3 text-muted text-xs">{prod.categoria?.nombre || '-'}</td>
                <td className="p-3 text-right">
                  {prod.descuento ? (
                    <span className="text-xs">
                      <span className="line-through text-muted">${Math.round(prod.precioAntes || prod.precio).toLocaleString('es-CL')}</span>
                      <br />
                      <span className="text-green-600 font-semibold">${Math.round(prod.precio).toLocaleString('es-CL')}</span>
                      <span className="text-orange-500 ml-1">-{prod.descuento}%</span>
                    </span>
                  ) : (
                    <span>${Math.round(prod.precio).toLocaleString('es-CL')}</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {prod.descuento ? (
                    <span className="text-orange-500 font-semibold text-xs">-{prod.descuento}%</span>
                  ) : '-'}
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => actualizarBatch('destacado', !prod.destacado).then(() => {
                      setSeleccionados(new Set([prod.id]));
                    }).then(() => actualizarBatch('destacado', !prod.destacado))}
                    className="text-lg"
                  >
                    {prod.destacado ? '★' : '☆'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${prod.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => editar(prod)} className="text-accent hover:underline text-sm mr-3">Editar</button>
                  <button onClick={() => eliminar(prod.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}