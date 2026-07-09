'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
}

interface Props {
  categorias?: Categoria[];
}

export default function CategoriaSelector({ categorias: propCategorias }: Props) {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>(propCategorias || []);

  useEffect(() => {
    if (propCategorias) return;
    fetch('/api/categorias?activas=true').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategorias(data);
    }).catch(() => {});
  }, [propCategorias]);

  if (categorias.length === 0) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    if (slug) router.push(`/${slug}`);
  };

  return (
    <div className="w-full max-w-xs">
      <select
        onChange={handleChange}
        defaultValue=""
        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent appearance-none cursor-pointer"
      >
        <option value="" disabled>Seleccionar categoría...</option>
        {categorias.map(cat => (
          <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
        ))}
      </select>
    </div>
  );
}
