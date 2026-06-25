'use client';

import { useState, useEffect } from 'react';

export default function SucursalesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);
  const [form, setForm] = useState({
    nombre: '', zona: '', direccion: '', region: '', esCasaMatriz: false,
    horarioAtencion: '', horarioEntrega: '', whatsapp: '', telefono: '',
    emailPostventa: '', urlMaps: '', activo: true, orden: 0,
  });

  const cargar = () => {
    fetch('/api/sucursales').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    }).catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `/api/sucursales/${editando.id}` : '/api/sucursales';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditando(null);
      setForm({ nombre: '', zona: '', direccion: '', region: '', esCasaMatriz: false, horarioAtencion: '', horarioEntrega: '', whatsapp: '', telefono: '', emailPostventa: '', urlMaps: '', activo: true, orden: 0 });
      cargar();
    }
  };

  const editar = (item: any) => {
    setEditando(item);
    setForm({
      nombre: item.nombre, zona: item.zona, direccion: item.direccion, region: item.region,
      esCasaMatriz: item.esCasaMatriz, horarioAtencion: item.horarioAtencion, horarioEntrega: item.horarioEntrega || '',
      whatsapp: item.whatsapp, telefono: item.telefono || '', emailPostventa: item.emailPostventa || '',
      urlMaps: item.urlMaps || '', activo: item.activo, orden: item.orden,
    });
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar sucursal?')) return;
    await fetch(`/api/sucursales/${id}`, { method: 'DELETE' });
    cargar();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Sucursales</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-lg">{editando ? 'Editar' : 'Nueva Sucursal'}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Nombre</label>
            <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Zona</label>
            <input type="text" required value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Dirección</label>
            <input type="text" required value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Región</label>
            <input type="text" required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">WhatsApp</label>
            <input type="text" required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Teléfono</label>
            <input type="text" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Horario Atención</label>
            <input type="text" required value={form.horarioAtencion} onChange={(e) => setForm({ ...form, horarioAtencion: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Horario Entrega</label>
            <input type="text" value={form.horarioEntrega} onChange={(e) => setForm({ ...form, horarioEntrega: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Email Postventa</label>
            <input type="email" value={form.emailPostventa} onChange={(e) => setForm({ ...form, emailPostventa: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">URL Google Maps</label>
            <input type="text" value={form.urlMaps} onChange={(e) => setForm({ ...form, urlMaps: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Orden</label>
            <input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.esCasaMatriz} onChange={(e) => setForm({ ...form, esCasaMatriz: e.target.checked })} className="rounded" />
              <span className="text-sm">Casa Matriz</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
              <span className="text-sm">Activo</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">{editando ? 'Actualizar' : 'Crear'}</button>
          {editando && <button type="button" onClick={() => { setEditando(null); setForm({ nombre: '', zona: '', direccion: '', region: '', esCasaMatriz: false, horarioAtencion: '', horarioEntrega: '', whatsapp: '', telefono: '', emailPostventa: '', urlMaps: '', activo: true, orden: 0 }); }} className="bg-gray-200 hover:bg-gray-300 text-text font-medium py-2 px-4 rounded-lg transition-colors text-sm">Cancelar</button>}
        </div>
      </form>

      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-semibold">Nombre</th>
              <th className="text-left p-3 font-semibold">Zona</th>
              <th className="text-left p-3 font-semibold">WhatsApp</th>
              <th className="text-left p-3 font-semibold">Casa Matriz</th>
              <th className="text-left p-3 font-semibold">Activo</th>
              <th className="text-right p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">{item.nombre}</td>
                <td className="p-3 text-muted">{item.zona}</td>
                <td className="p-3">{item.whatsapp}</td>
                <td className="p-3">{item.esCasaMatriz ? <span className="text-accent font-semibold">Sí</span> : 'No'}</td>
                <td className="p-3">{item.activo ? <span className="text-green-600">Sí</span> : <span className="text-red-600">No</span>}</td>
                <td className="p-3 text-right">
                  <button onClick={() => editar(item)} className="text-accent hover:underline text-sm mr-3">Editar</button>
                  <button onClick={() => eliminar(item.id)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
