'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VendedorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vendedor/cotizaciones/nueva');
  }, [router]);

  return null;
}
