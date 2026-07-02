'use client';

import { useState, useEffect } from 'react';
import ImageUploader from '@/components/admin/ImageUploader';

export default function BannersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);
  const [form, setForm] = useState({
    titulo: '', subtitulo: '', badge: '', imagen: '', imagenMovil: '', url: '', orden: 0, activo: true,
  });

  const cargar = () => {
    fetch('/api/banners').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    }).catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `/api/banners/${editando.id}` : '/api/banners';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditando(null);
      setForm({ titulo: '', subtitulo: '', badge: '', imagen: '', imagenMovil: '', url: '', orden: 0, activo: true });
      cargar();
    }
  };

  const editar = (item: any) => {
    setEditando(item);
    setForm({
      titulo: item.titulo, subtitulo: item.subtitulo || '', badge: item.badge || '',
      imagen: item.imagen, imagenMovil: item.imagenMovil || '', url: item.url || '',
      orden: item.orden, activo: item.activo,
    });
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar banner?')) return;
    await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    cargar();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Banners</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-lg">{editando ? 'Editar' : 'Nuevo Banner'}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Título</label>
            <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Badge (ej: -40%)</label>
            <input type="text" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">URL Destino</label>
            <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <ImageUploader
              folder="banner"
              label="Imagen Desktop"
              currentUrl={form.imagen || null}
              onUpload={(url) => setForm({ ...form, imagen: url })}
            />
          </div>
          <div>
            <ImageUploader
              folder="banner"
              label="Imagen Móvil"
              currentUrl={form.imagenMovil || null}
              onUpload={(url) => setForm({ ...form, imagenMovil: url })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Orden</label>
            <input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
              <span className="text-sm">Activo</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Subtítulo</label>
          <input type="text" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">{editando ? 'Actualizar' : 'Crear'}</button>
          {editando && <button type="button" onClick={() => { setEditando(null); setForm({ titulo: '', subtitulo: '', badge: '', imagen: '', imagenMovil: '', url: '', orden: 0, activo: true }); }} className="bg-gray-200 hover:bg-gray-300 text-text font-medium py-2 px-4 rounded-lg transition-colors text-sm">Cancelar</button>}
        </div>
      </form>

      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-semibold">Preview</th>
              <th className="text-left p-3 font-semibold">Título</th>
              <th className="text-left p-3 font-semibold">Badge</th>
              <th className="text-left p-3 font-semibold">Imagen</th>
              <th className="text-left p-3 font-semibold">Activo</th>
              <th className="text-right p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">
                  {item.imagen && (
                    <img src={item.imagen} alt="" className="h-10 w-16 object-cover rounded" />
                  )}
                </td>
                <td className="p-3">{item.titulo}</td>
                <td className="p-3">{item.badge || '-'}</td>
                <td className="p-3 text-muted truncate max-w-[200px]">{item.imagen}</td>
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
