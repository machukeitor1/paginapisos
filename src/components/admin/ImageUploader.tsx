'use client';

import { useState, useRef } from 'react';

interface ImageUploaderProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  folder?: 'uploads' | 'banner';
  label?: string;
}

export default function ImageUploader({ currentUrl, onUpload, folder = 'uploads', label = 'Imagen' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setPreview(data.url);
        onUpload(data.url);
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">{label}</label>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent/90 cursor-pointer"
          />
        </div>
        {uploading && <span className="text-sm text-muted">Subiendo...</span>}
      </div>
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-24 w-auto rounded-lg border border-gray-200 object-cover" />
          <button
            type="button"
            onClick={() => { setPreview(null); onUpload(''); }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}