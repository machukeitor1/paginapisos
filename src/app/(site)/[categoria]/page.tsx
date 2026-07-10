import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/site/ProductCard";

export const dynamic = 'force-dynamic';

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = await prisma.categoria.findUnique({
    where: { slug: params.categoria },
    include: {
      productos: {
        where: { activo: true },
        orderBy: { orden: "asc" },
        include: { categoria: true },
      },
    },
  });

  if (!categoria) return notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">{categoria.nombre}</h1>
      {categoria.descripcion && (
        <p className="text-muted mb-8">{categoria.descripcion}</p>
      )}
      {categoria.productos.length === 0 ? (
        <p className="text-muted">No hay productos disponibles en esta categoría.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categoria.productos.map((prod) => (
            <ProductCard key={prod.id} producto={prod} />
          ))}
        </div>
      )}
    </div>
  );
}
