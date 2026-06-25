'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

export default function ProductosDestacados() {
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/productos?destacados=true').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProductos(data);
    }).catch(() => {});
  }, []);

  if (productos.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">Productos Destacados</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map((prod) => (
            <ProductCard key={prod.id} producto={prod} />
          ))}
        </div>
      </div>
    </section>
  );
}
