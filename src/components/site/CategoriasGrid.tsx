'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen: string | null;
}

export default function CategoriasGrid() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetch('/api/categorias?activas=true').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategorias(data);
    }).catch(() => {});
  }, []);

  if (categorias.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">Nuestros Productos</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {categorias.map((cat) => (
            <Link
              key={cat.id}
              href={`/${cat.slug}`}
              className="group bg-card rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 w-[calc(50%-0.5rem)] md:w-[calc(33.33%-0.67rem)] lg:w-[calc(20%-0.8rem)] max-w-xs"
            >
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                {cat.imagen ? (
                  <img src={cat.imagen} alt={cat.nombre} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-4xl text-muted font-bold opacity-30">{cat.nombre.charAt(0)}</div>
                )}
              </div>
              <div className="p-4 text-center">
                <h3 className="font-semibold text-text group-hover:text-accent transition-colors">{cat.nombre}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
