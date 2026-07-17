import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/site/ProductCard";

export const dynamic = 'force-dynamic';

const CATEGORY_ALIASES: Record<string, string[]> = {
  "revestimiento-exterior-metalico": ["siding-tipo-granito"],
};

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = await prisma.categoria.findUnique({
    where: { slug: params.categoria },
  });

  if (!categoria) return notFound();

  const aliasSlugs = CATEGORY_ALIASES[params.categoria] ?? [];
  const aliasCategories = aliasSlugs.length > 0
    ? await prisma.categoria.findMany({ where: { slug: { in: aliasSlugs } } })
    : [];
  const categoriaIds = [categoria.id, ...aliasCategories.map(c => c.id)];

  const productos = await prisma.producto.findMany({
    where: { categoriaId: { in: categoriaIds }, activo: true },
    orderBy: { orden: "asc" },
    include: { categoria: true },
  });

  const productosNormales = productos.filter(p => !p.esAccesorio);
  const accesorios = productos.filter(p => p.esAccesorio);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">{categoria.nombre}</h1>
      {categoria.descripcion && (
        <p className="text-muted mb-8">{categoria.descripcion}</p>
      )}
      {productosNormales.length === 0 && accesorios.length === 0 ? (
        <p className="text-muted">No hay productos disponibles en esta categoría.</p>
      ) : (
        <>
          {productosNormales.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productosNormales.map((prod) => (
                <ProductCard key={prod.id} producto={prod} />
              ))}
            </div>
          )}
          {accesorios.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-primary mb-6">Accesorios</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {accesorios.map((prod) => (
                  <ProductCard key={prod.id} producto={prod} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
