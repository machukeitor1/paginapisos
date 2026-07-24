import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function NotFound() {
  const categorias = await prisma.categoria.findMany({
    select: { slug: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-7xl font-bold text-primary mb-4">404</p>
      <h1 className="text-2xl font-bold text-text mb-3">Página no encontrada</h1>
      <p className="text-muted mb-8">
        La página que busca no existe o fue movida.
      </p>
      <Link
        href="/"
        className="inline-block bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Volver al inicio
      </Link>

      {categorias.length > 0 && (
        <div className="mt-16">
          <p className="text-muted mb-6">Explora nuestras categorías</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categorias.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-text hover:text-accent hover:border-accent/30 transition-colors"
              >
                {cat.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
