'use client';

import { useState, useEffect } from 'react';

interface Sucursal {
  id: number;
  nombre: string;
  zona: string;
  direccion: string;
  region: string;
  esCasaMatriz: boolean;
  horarioAtencion: string;
  horarioEntrega: string | null;
  whatsapp: string;
  telefono: string | null;
  emailPostventa: string | null;
  urlMaps: string | null;
}

export default function Sucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  useEffect(() => {
    fetch('/api/sucursales?activas=true').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSucursales(data);
    }).catch(() => {});
  }, []);

  if (sucursales.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">Nuestras Sucursales</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sucursales.map((suc) => (
            <div key={suc.id} className={`bg-card rounded-xl shadow-md overflow-hidden ${suc.esCasaMatriz ? 'ring-2 ring-accent' : ''}`}>
              {suc.esCasaMatriz && (
                <div className="bg-accent text-white text-center text-xs font-bold py-1">CASA MATRIZ</div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-primary mb-1">{suc.nombre}</h3>
                <p className="text-sm text-muted mb-3">{suc.zona}</p>
                <p className="text-sm text-text mb-1">{suc.direccion}</p>
                <p className="text-sm text-muted mb-4">{suc.region}</p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-text mb-1">Horario Atención:</p>
                  <p className="text-xs text-muted">{suc.horarioAtencion}</p>
                  {suc.horarioEntrega && (
                    <>
                      <p className="text-xs font-semibold text-text mt-2 mb-1">Horario Entrega:</p>
                      <p className="text-xs text-muted">{suc.horarioEntrega}</p>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${suc.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors text-center"
                  >
                    WhatsApp
                  </a>
                  {suc.telefono && (
                    <a href={`tel:${suc.telefono}`} className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors text-center">
                      Llamar
                    </a>
                  )}
                  {suc.urlMaps && (
                    <a href={suc.urlMaps} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-200 hover:bg-gray-300 text-text text-xs font-semibold py-2 px-3 rounded-lg transition-colors text-center">
                      Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
