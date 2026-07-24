'use client';

import { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/ga';

export default function ContactoPage() {
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', mensaje: '' });
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config?.whatsappGlobal) return;
    const texto = `Hola, soy ${form.nombre}.${form.email ? ` Mi email es ${form.email}.` : ''}${form.telefono ? ` Mi teléfono es ${form.telefono}.` : ''}\n\n${form.mensaje}`;
    const link = `https://api.whatsapp.com/send?phone=${config.whatsappGlobal.replace(/\D/g, '')}&text=${encodeURIComponent(texto)}`;
    trackEvent('whatsapp_click', { location: 'contact_form' });
    window.open(link, '_blank');
    setEnviado(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-4">Contacto</h1>
      <p className="text-muted mb-8">¿Tienes alguna consulta? Completa el formulario y te responderemos a la brevedad.</p>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          {enviado ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-green-800">
              <p className="font-semibold">¡Mensaje enviado!</p>
              <p className="text-sm mt-1">Se abrió WhatsApp para que envíes tu consulta.</p>
              <button onClick={() => setEnviado(false)} className="mt-4 text-sm text-accent hover:underline">Enviar otro mensaje</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nombre *</label>
                <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Teléfono</label>
                <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Mensaje *</label>
                <textarea required rows={5} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <button type="submit" className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                Enviar por WhatsApp
              </button>
            </form>
          )}
        </div>

        <div>
          <div className="bg-card rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-primary mb-4">Información de contacto</h3>
            {config?.emailContacto && (
              <div className="mb-4">
                <p className="text-sm font-medium text-text">Email</p>
                <p className="text-sm text-muted">{config.emailContacto}</p>
              </div>
            )}
            {config?.whatsappGlobal && (
              <div className="mb-4">
                <p className="text-sm font-medium text-text">WhatsApp</p>
                <p className="text-sm text-muted">+{config.whatsappGlobal}</p>
              </div>
            )}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">Horarios de atención</p>
              <p>Lunes a Viernes: 08:30 - 18:30</p>
              <p>Sábados: 09:00 - 14:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
