'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_MS = 15 * 60 * 1000;

export default function SessionTimeout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fetch('/api/auth', { method: 'DELETE' }).finally(() => {
          router.push('/admin/login');
        });
      }, TIMEOUT_MS);
    };

    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [router]);

  return null;
}
