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
  const [cotizadorCount, setCotizadorCount] = useState(0);
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

  useEffect(() => {
    const actualizar = () => {
      try {
        const items = JSON.parse(localStorage.getItem('cotizador') || '[]');
        setCotizadorCount(items.reduce((sum: number, item: any) => sum + (item.cantidad || 0), 0));
      } catch { setCotizadorCount(0); }
    };
    actualizar();
    window.addEventListener('storage', actualizar);
    window.addEventListener('cotizador-update', actualizar);
    return () => {
      window.removeEventListener('storage', actualizar);
      window.removeEventListener('cotizador-update', actualizar);
    };
  }, []);

  return (
    <header className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            {config?.logo ? (
              <img src={config.logo} alt={config.nombreEmpresa} className="h-10 w-auto" />
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
              href="/cotizador"
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                pathname === '/cotizador'
                  ? 'text-accent bg-white/10'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {cotizadorCount > 0 && (
                <span className="bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cotizadorCount}
                </span>
              )}
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
            <Link href="/cotizador" className="relative text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {cotizadorCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cotizadorCount}
                </span>
              )}
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-2">
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
            <Link href="/cotizador" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">Cotizador</Link>
            <Link href="/contacto" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-300 hover:text-white">Contacto</Link>
          </div>
        )}
      </div>
    </header>
  );
}
