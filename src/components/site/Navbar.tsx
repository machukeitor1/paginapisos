'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Categoria {
  id: number;
  nombre: string;
  slug: string;
}

interface Config {
  nombreEmpresa: string;
  logo: string | null;
  whatsappGlobal: string | null;
}

export default function Navbar() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/categorias?activas=true').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategorias(data);
    }).catch(() => {});
    fetch('/api/configuracion').then(r => r.json()).then(data => {
      if (data) setConfig(data);
    }).catch(() => {});
  }, []);

  return (
    <header className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            {config?.logo ? (
              <img src={config.logo} alt={config.nombreEmpresa} className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-white font-bold text-xl tracking-tight">{config?.nombreEmpresa || 'Mi Empresa'}</span>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {categorias.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === `/${cat.slug}`
                    ? 'text-accent bg-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.nombre}
              </Link>
            ))}
            <Link
              href="/vendedor/login"
              className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-white/10"
            >
              Acceso Vendedores
            </Link>
            <Link
              href="/contacto"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === '/contacto'
                  ? 'text-accent bg-white/10'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Contacto
            </Link>
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden pb-4 border-t border-white/10 pt-2">
            {categorias.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 text-sm rounded-lg ${
                  pathname === `/${cat.slug}` ? 'text-accent bg-white/10' : 'text-gray-300 hover:text-white'
                }`}
              >
                {cat.nombre}
              </Link>
            ))}
            <Link href="/vendedor/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">Acceso Vendedores</Link>
            <Link href="/contacto" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">Contacto</Link>
          </div>
        )}
      </div>
    </header>
  );
}
