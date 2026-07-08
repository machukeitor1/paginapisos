'use client';

import { useState, useEffect } from 'react';

export default function MapButton() {
  const [urlMapa, setUrlMapa] = useState('');

  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json()).then(data => {
      if (data?.urlMapa) setUrlMapa(data.urlMapa);
    }).catch(() => {});
  }, []);

  if (!urlMapa) return null;

  return (
    <a
      href={urlMapa}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-110"
      aria-label="Mapa"
    >
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
      </svg>
    </a>
  );
}
