'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [vendedor, setVendedor] = useState<{ id: number; nombre: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/vendedor/login') {
      setLoading(false);
      return;
    }
    fetch('/api/auth/vendedor')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) {
          setVendedor(data);
        } else {
          router.push('/vendedor/login');
        }
      })
      .catch(() => router.push('/vendedor/login'))
      .finally(() => setLoading(false));
  }, [pathname, router]);

  if (pathname === '/vendedor/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!vendedor) return null;

  const handleLogout = async () => {
    await fetch('/api/auth/vendedor', { method: 'DELETE' });
    router.push('/vendedor/login');
  };

  const isActive = (href: string) =>
    pathname.startsWith(href) ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100';

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">Revestimientos Chillán</h2>
          <p className="text-xs text-gray-500 mt-0.5">{vendedor.nombre}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Link href="/vendedor/cotizaciones/nueva" className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/vendedor/cotizaciones/nueva')}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Cotización
          </Link>
          <Link href="/vendedor/cotizaciones" className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/vendedor/cotizaciones')}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Mis Cotizaciones
          </Link>
        </nav>
        <div className="p-2 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
