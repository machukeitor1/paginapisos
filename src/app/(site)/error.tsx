'use client';

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-6xl font-bold text-primary mb-4">!</p>
      <h1 className="text-2xl font-bold text-text mb-3">Algo salió mal</h1>
      <p className="text-muted mb-8">
        Ocurrió un error inesperado. Por favor, intenta nuevamente.
      </p>
      <button
        onClick={() => reset()}
        className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
