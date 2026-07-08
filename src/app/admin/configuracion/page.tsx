'use client';

import { useState, useEffect } from 'react';

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    nombreEmpresa: '',
    logo: '',
    whatsappGlobal: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    emailContacto: '',
    metaTitle: '',
    metaDescription: '',
    urlMapa: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json()).then(data => {
      if (data) setForm(data);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMensaje('Configuración guardada correctamente');
      } else {
        setMensaje('Error al guardar');
      }
    } catch {
      setMensaje('Error de conexión');
    }
    setGuardando(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Configuración Global</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-md p-6 max-w-2xl space-y-4">
        {mensaje && (
          <div className={`text-sm rounded-lg px-4 py-3 ${mensaje.includes('correctamente') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensaje}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Nombre Empresa</label>
            <input type="text" value={form.nombreEmpresa} onChange={(e) => setForm({ ...form, nombreEmpresa: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Logo (URL path)</label>
            <input type="text" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">WhatsApp Global</label>
            <input type="text" value={form.whatsappGlobal} onChange={(e) => setForm({ ...form, whatsappGlobal: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Email Contacto</label>
            <input type="email" value={form.emailContacto} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Facebook URL</label>
            <input type="text" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Instagram URL</label>
            <input type="text" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">TikTok URL</label>
            <input type="text" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">YouTube URL</label>
            <input type="text" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">URL Mapa (Google Maps)</label>
          <input type="text" value={form.urlMapa} onChange={(e) => setForm({ ...form, urlMapa: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Meta Title (SEO)</label>
          <input type="text" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Meta Description (SEO)</label>
          <textarea rows={3} value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>
        <button type="submit" disabled={guardando} className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
