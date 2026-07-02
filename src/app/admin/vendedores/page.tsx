'use client';

import { useState, useEffect } from 'react';

interface Vendedor {
  id: number;
  nombre: string;
  rut: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

interface VendedorForm {
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
  password: string;
  activo: boolean;
}

const emptyForm: VendedorForm = { nombre: '', rut: '', telefono: '', email: '', password: '', activo: true };

export default function VendedoresPage() {
  const [items, setItems] = useState<Vendedor[]>([]);
  const [form, setForm] = useState<VendedorForm>(emptyForm);
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    const res = await fetch('/api/vendedores');
    setItems(await res.json());
  };

  useEffect(() => { cargar(); }, []);

  const editar = (v: Vendedor) => {
    setForm({
      nombre: v.nombre,
      rut: v.rut,
      telefono: v.telefono || '',
      email: v.email || '',
      password: '',
      activo: v.activo,
    });
    setEditando(v.id);
  };

  const cancelar = () => {
    setForm(emptyForm);
    setEditando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editando ? `/api/vendedores/${editando}` : '/api/vendedores';
      const method = editando ? 'PUT' : 'POST';
      const body: any = { nombre: form.nombre, rut: form.rut, telefono: form.telefono, email: form.email, activo: form.activo };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return; }
      setForm(emptyForm);
      setEditando(null);
      cargar();
    } catch { setError('Error de conexión'); }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar vendedor?')) return;
    try {
      const res = await fetch(`/api/vendedores/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return; }
      cargar();
    } catch {}
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Vendedores</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      <div className="bg-card rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{editando ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre</label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">RUT</label>
            <input required value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{editando ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}</label>
            <input required={!editando} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
              Activo
            </label>
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button type="submit" className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
            {editando && (
              <button type="button" onClick={cancelar} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th>
              <th className="text-left py-3 px-4">RUT</th>
              <th className="text-left py-3 px-4">Teléfono</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-800">{v.nombre}</td>
                <td className="py-3 px-4 text-gray-600">{v.rut}</td>
                <td className="py-3 px-4 text-gray-500">{v.telefono || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{v.email || '-'}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${v.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button onClick={() => editar(v)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Editar</button>
                  <button onClick={() => eliminar(v.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
