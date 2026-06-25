'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ categorias: 0, productos: 0, sucursales: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/categorias').then(r => r.json()),
      fetch('/api/productos').then(r => r.json()),
      fetch('/api/sucursales').then(r => r.json()),
    ]).then(([cats, prods, sucs]) => {
      setStats({
        categorias: Array.isArray(cats) ? cats.length : 0,
        productos: Array.isArray(prods) ? prods.length : 0,
        sucursales: Array.isArray(sucs) ? sucs.length : 0,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Categorías', value: stats.categorias, color: 'bg-blue-500', href: '/admin/categorias' },
    { label: 'Productos', value: stats.productos, color: 'bg-green-500', href: '/admin/productos' },
    { label: 'Sucursales', value: stats.sucursales, color: 'bg-purple-500', href: '/admin/sucursales' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <a key={card.label} href={card.href} className="bg-card rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
              <span className="text-white font-bold text-lg">{card.value}</span>
            </div>
            <h3 className="text-lg font-semibold text-text">{card.label}</h3>
            <p className="text-sm text-muted">{card.value} registros</p>
          </a>
        ))}
      </div>
    </div>
  );
}
