'use client';

import { useState, useEffect } from 'react';

interface StatStock {
  total: number;
  bajo: number;
  sinStock: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ categorias: 0, productos: 0, sucursales: 0 });
  const [stock, setStock] = useState<StatStock>({ total: 0, bajo: 0, sinStock: 0 });

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

    fetch('/api/stock').then(r => r.json()).then((prods) => {
      if (Array.isArray(prods)) {
        const activos = prods.filter((p: any) => p.activo);
        setStock({
          total: activos.length,
          bajo: activos.filter((p: any) => p.stock <= p.stockMinimo && p.stock > 0).length,
          sinStock: activos.filter((p: any) => p.stock <= 0).length,
        });
      }
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Categorías', value: stats.categorias, color: 'bg-blue-500', href: '/admin/categorias' },
    { label: 'Productos', value: stats.productos, color: 'bg-green-500', href: '/admin/productos' },
    { label: 'Sucursales', value: stats.sucursales, color: 'bg-purple-500', href: '/admin/sucursales' },
  ];

  const stockCards = [
    { label: 'Productos con stock', value: stock.total, color: 'bg-green-500', href: '/admin/stock' },
    { label: 'Stock bajo', value: stock.bajo, color: 'bg-orange-500', href: '/admin/stock' },
    { label: 'Sin stock', value: stock.sinStock, color: 'bg-red-500', href: '/admin/stock' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
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
      <h2 className="text-lg font-bold text-primary mb-4">Stock</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {stockCards.map((card) => (
          <a key={card.label} href={card.href} className="bg-card rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
              <span className="text-white font-bold text-lg">{card.value}</span>
            </div>
            <h3 className="text-lg font-semibold text-text">{card.label}</h3>
            <p className="text-sm text-muted">Ver panel de stock</p>
          </a>
        ))}
      </div>
    </div>
  );
}