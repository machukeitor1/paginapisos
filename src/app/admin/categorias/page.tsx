'use client';

import { useState, useEffect } from 'react';
import ImageUploader from '@/components/admin/ImageUploader';

export default function CategoriasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);
  const [form, setForm] = useState({ nombre: '', slug: '', descripcion: '', imagen: '', orden: 0, activo: true });

  const cargar = () => {
    fetch('/api/categorias').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data);
    }).catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `/api/categorias/${editando.id}` : '/api/categorias';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditando(null);
      setForm({ nombre: '', slug: '', descripcion: '', imagen: '', orden: 0, activo: true });
      cargar();
    }
  };

  const editar = (item: any) => {
    setEditando(item);
    setForm({ nombre: item.nombre, slug: item.slug, descripcion: item.descripcion || '', imagen: item.imagen || '', orden: item.orden, activo: item.activo });
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar categoría?')) return;
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' });
    cargar();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Categorías</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-lg">{editando ? 'Editar' : 'Nueva Categoría'}</h2>
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
            <label className="block text-sm font-medium text-text mb-1">Imagen</label>
            <ImageUploader currentImage={form.imagen} onUpload={(url) => setForm({ ...form, imagen: url })} />
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
          <label className="block text-sm font-medium text-text mb-1">Descripción</label>
          <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">{editando ? 'Actualizar' : 'Crear'}</button>
          {editando && <button type="button" onClick={() => { setEditando(null); setForm({ nombre: '', slug: '', descripcion: '', imagen: '', orden: 0, activo: true }); }} className="bg-gray-200 hover:bg-gray-300 text-text font-medium py-2 px-4 rounded-lg transition-colors text-sm">Cancelar</button>}
        </div>
      </form>

      <div className="bg-card rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-semibold">Nombre</th>
              <th className="text-left p-3 font-semibold">Slug</th>
              <th className="text-left p-3 font-semibold">Activo</th>
              <th className="text-right p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3">{item.nombre}</td>
                <td className="p-3 text-muted">{item.slug}</td>
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
