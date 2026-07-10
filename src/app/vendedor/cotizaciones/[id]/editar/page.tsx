'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ProductoSearch {
  id: number;
  nombre: string;
  sku: string;
  precio: number;
  precioUnitario: number;
  descuento: number | null;
  unidad: string;
  slug: string;
  rendimiento: number;
  unidadVenta: string;
  dimensiones: string | null;
  categoria: { nombre: string };
}

interface EditItem {
  key: number;
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  rendimiento: number;
  unidadVenta: string;
  precioUnitario: number;
  descuentoPorc: number;
  importe: number;
  proyectoM2: number;
  precioM2: number;
}

export default function EditarCotizacionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const searchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [vendedorNombre, setVendedorNombre] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductoSearch[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [items, setItems] = useState<EditItem[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [clienteRut, setClienteRut] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteComuna, setClienteComuna] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/auth/vendedor')
      .then((r) => r.json())
      .then((d) => { if (d.nombre) setVendedorNombre(d.nombre); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/cotizaciones/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setClienteRut(data.cliente.rut || '');
        setClienteNombre(data.cliente.nombre || '');
        setClienteDireccion(data.cliente.direccion || '');
        setClienteComuna(data.cliente.comuna || '');
        setClienteTelefono(data.cliente.telefono || '');
        setNotas(data.notas || '');
        const loaded = data.items.map((item: any, idx: number) => ({
          key: idx + 1,
          productoId: item.productoId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          rendimiento: item.rendimiento || 1,
          unidadVenta: item.unidadVenta || 'un',
          precioUnitario: item.precioUnitario,
          descuentoPorc: item.descuentoPorc,
          importe: item.importe,
          proyectoM2: item.proyectoM2 ?? item.cantidad * (item.rendimiento || 1),
          precioM2: Math.ceil(item.precioUnitario / (item.rendimiento || 1)),
        }));
        setItems(loaded);
        setNextKey(loaded.length + 1);
        setLoading(false);
      })
      .catch(() => { setError('Error al cargar cotización'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/productos/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          setSearchResults(data || []);
          setShowResults(true);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addItem = useCallback((prod: ProductoSearch) => {
    const uv = prod.unidadVenta || 'un';
    const rend = prod.rendimiento || 1;
    const pu = prod.precioUnitario || Math.ceil((prod.precio || 0) * rend) || 0;
    const m2 = rend;
    const cant = Math.round(m2 / rend) || 1;
    setItems((prev) => [
      ...prev,
      {
        key: nextKey,
        productoId: prod.id,
        descripcion: `${prod.sku} - ${prod.nombre}`,
        cantidad: cant,
        rendimiento: rend,
        unidadVenta: uv,
        precioUnitario: pu,
        descuentoPorc: prod.descuento || 0,
        importe: Math.ceil(cant * pu * (1 - (prod.descuento || 0) / 100)),
        proyectoM2: m2,
        precioM2: Math.ceil(pu / rend),
      },
    ]);
    setNextKey((k) => k + 1);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    searchRef.current?.focus();
  }, [nextKey]);

  const removeItem = (key: number) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: number, field: string, value: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i;
        const updated = { ...i, [field]: value };
        const calcImporte = (item: typeof i) => {
          return Math.ceil(item.cantidad * item.precioUnitario * (1 - item.descuentoPorc / 100));
        };
        if (field === 'proyectoM2') {
          updated.cantidad = Math.round(value / i.rendimiento) || 1;
        } else if (field === 'precioUnitario') {
          updated.precioM2 = Math.ceil(value / i.rendimiento);
        }
        updated.importe = calcImporte(updated);
        return updated;
      })
    );
  };

  const subtotal = items.reduce((s, i) => s + i.importe, 0);
  const neto = Math.ceil(subtotal / 1.19);
  const iva = subtotal - neto;
  const total = subtotal;

  const buscarCliente = async () => {
    if (clienteRut.length < 2) return;
    try {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(clienteRut)}`);
      const data = await res.json();
      if (data?.length === 1) {
        const c = data[0];
        setClienteNombre(c.nombre);
        setClienteDireccion(c.direccion || '');
        setClienteComuna(c.comuna || '');
        setClienteTelefono(c.telefono || '');
      }
    } catch {}
  };

  const actualizarCotizacion = async () => {
    if (!clienteNombre) {
      setError('Debe ingresar el nombre del cliente');
      return;
    }
    if (items.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/cotizaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            rut: clienteRut,
            nombre: clienteNombre,
            direccion: clienteDireccion || null,
            comuna: clienteComuna || null,
            telefono: clienteTelefono || null,
          },
          items: items.map((i) => ({
            productoId: i.productoId,
            descripcion: i.descripcion,
            cantidad: Math.round(i.proyectoM2 / i.rendimiento) || 1,
            rendimiento: i.rendimiento,
            unidadVenta: i.unidadVenta,
            precioUnitario: i.precioUnitario,
            descuentoPorc: i.descuentoPorc,
            importe: i.importe,
            proyectoM2: i.proyectoM2,
          })),
          notas: notas || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Error al actualizar');
        return;
      }

      const cot = await res.json();
      setSuccess(`Cotización ${cot.numero} actualizada exitosamente`);
      setTimeout(() => {
        router.push(`/vendedor/cotizaciones/${cot.id}`);
      }, 1500);
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800">Editar Cotización</h1>
        <Link href="/vendedor/cotizaciones" className="text-sm text-gray-500 hover:text-gray-700">Volver</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold text-gray-800">REVESTIMIENTOS CHILLÁN</h1>
          <p className="text-xs text-gray-500">Alcántara 1080, Villa Barcelona, Chillán</p>
          <p className="text-xs text-gray-500">+56 9 9431 6620 | +56 9 8128 9079</p>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-3">
          <span><strong>Vendedor:</strong> {vendedorNombre}</span>
          <span><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CL')}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Datos del Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">RUT</label>
            <input value={clienteRut} onChange={(e) => setClienteRut(e.target.value)} onBlur={buscarCliente} placeholder="12.345.678-9" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre</label>
            <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
            <input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comuna</label>
            <input value={clienteComuna} onChange={(e) => setClienteComuna(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-xs text-gray-500 mb-1">Dirección</label>
            <input value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Productos</h2>

        <div className="relative mb-4">
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto por SKU o nombre..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 max-h-64 overflow-y-auto">
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">
                  <span className="font-medium text-gray-800">{p.sku}</span>
                  <span className="text-gray-500 ml-2">{p.nombre}</span>
                  <span className="text-gray-400 ml-2">${(p.precioUnitario || p.precio).toLocaleString('es-CL')}/{p.unidadVenta}</span>
                  <span className="text-gray-400 ml-1">| ${p.precio.toLocaleString('es-CL')}/{p.unidad}</span>
                  {p.descuento ? <span className="text-red-500 text-xs ml-1">{p.descuento}% OFF</span> : null}
                  <span className="text-xs text-gray-400 ml-2">{p.categoria.nombre}</span>
                </button>
              ))}
            </div>
          )}
          {showResults && searchQuery.length > 0 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 p-3 text-sm text-gray-400">Sin resultados</div>
          )}
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 px-2">Descripción</th>
                  <th className="text-center py-2 px-2 w-20">M²</th>
                  <th className="text-right py-2 px-2 w-28">P. Unitario</th>
                  <th className="text-center py-2 px-2 w-24">Cant.</th>
                  <th className="text-center py-2 px-2 w-20">Desc %</th>
                  <th className="text-right py-2 px-2 w-28">Importe</th>
                  <th className="py-2 pl-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2 px-2 text-gray-800">{item.descripcion}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.proyectoM2}
                        onChange={(e) => updateItem(item.key, 'proyectoM2', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.precioUnitario}
                        onChange={(e) => updateItem(item.key, 'precioUnitario', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </td>
                    <td className="py-2 px-2 text-center font-medium text-gray-700">{item.cantidad} {item.unidadVenta}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={item.descuentoPorc}
                        onChange={(e) => updateItem(item.key, 'descuentoPorc', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-gray-800">
                      ${item.importe.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pl-2">
                      <button onClick={() => removeItem(item.key)} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Busque productos por SKU para agregarlos a la cotización</p>
        )}

        {items.length > 0 && (
          <div className="border-t border-gray-200 mt-4 pt-4 flex flex-col items-end text-sm">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>${neto.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA 19%:</span>
                <span>${iva.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-800 border-t pt-1">
                <span>TOTAL:</span>
                <span>${total.toLocaleString('es-CL', { minimumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <label className="block text-xs text-gray-500 mb-1">Notas</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={actualizarCotizacion}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {saving ? 'Guardando...' : 'Actualizar Cotización'}
        </button>
        <Link
          href={`/vendedor/cotizaciones/${id}`}
          className="px-6 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
        >
          Cancelar
        </Link>
      </div>
    </div>
  );
}
