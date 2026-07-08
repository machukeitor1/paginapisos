'use client';

import { useState, useRef } from 'react';

interface Props {
  currentImage: string;
  onUpload: (url: string) => void;
}

export default function ImageUploader({ currentImage, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    setPreview(URL.createObjectURL(file));

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onUpload(data.url);
        setPreview(data.url);
      }
    } catch {
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {(preview) && (
        <div className="relative w-24 h-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
