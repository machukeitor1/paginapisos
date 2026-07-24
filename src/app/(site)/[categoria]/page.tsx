import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/site/ProductCard";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

const CATEGORY_ALIASES: Record<string, string[]> = {};

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const categoria = await prisma.categoria.findUnique({
    where: { slug: params.categoria },
    select: { nombre: true, descripcion: true, slug: true },
  });
  if (!categoria) return {};

  const title = `${categoria.nombre} en Chillán`;
  const description = categoria.descripcion || `Explora nuestra línea de ${categoria.nombre.toLowerCase()} en Chillán. Revestimientos Chillán.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://revestimientoschillan.cl/${categoria.slug}`,
      type: 'website',
      images: [{ url: '/Logo.png', width: 400, height: 400, alt: categoria.nombre }],
    },
    alternates: {
      canonical: `https://revestimientoschillan.cl/${categoria.slug}`,
    },
  };
}

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
    orderBy: { sku: "asc" },
    include: { categoria: true },
  });

  const productosNormales = productos.filter(p => !p.esAccesorio);
  const accesorios = productos.filter(p => p.esAccesorio);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoria.nombre} en Chillán`,
    description: categoria.descripcion || `Explora nuestra línea de ${categoria.nombre.toLowerCase()} en Chillán.`,
    url: `https://revestimientoschillan.cl/${categoria.slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://revestimientoschillan.cl' },
      { '@type': 'ListItem', position: 2, name: categoria.nombre },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <nav className="text-sm text-muted mb-6">
          <Link href="/" className="hover:text-accent">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-text">{categoria.nombre}</span>
        </nav>
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
    </>
  );
}
